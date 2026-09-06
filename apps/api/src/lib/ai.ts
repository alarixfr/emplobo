import OpenAI, {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  RateLimitError,
} from "openai";
import type { Env } from "../env.js";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiCallResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
  // Raw OpenAI finish_reason. "length" means the model hit the output
  // budget mid-reply; callers treat it as a transient failure and retry
  // rather than persisting a truncated message.
  finishReason?: string;
};

/**
 * Thrown when the model replies with empty text — typically a reasoning model
 * that spent its whole output budget on chain-of-thought. Transient: the
 * caller should retry with a larger budget rather than surface a hard failure.
 */
export class AiEmptyReplyError extends Error {
  constructor() {
    super(
      "AI returned empty text content (the model likely spent its whole output budget on chain-of-thought; treat as transient and retry with a larger budget)",
    );
    this.name = "AiEmptyReplyError";
  }
}

const MAX_TRANSIENT_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pull `Retry-After` (seconds or HTTP-date) out of an error's response headers. */
export function parseRetryAfterSeconds(headers?: Headers | Record<string, string>): number | undefined {
  if (!headers) return undefined;

  const lookup = (name: string): string | undefined => {
    try {
      return headers instanceof Headers
        ? (headers.get(name) ?? undefined)
        : headers[name.toLowerCase()] ??
          headers[name] ??
          headers[`x-${name.toLowerCase()}`];
    } catch {
      return undefined;
    }
  };

  const raw = lookup("retry-after") ?? lookup("ratelimit-reset");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = new Date(raw).getTime();
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return undefined;
}

export type ProviderErrorInfo =
  | { kind: "transient"; retryable: true }
  | { kind: "rate-limit"; retryable: boolean; retryAfter?: number }
  | { kind: "permanent" }
  | { kind: "unknown" };

/**
 * Classify an error thrown by the OpenAI SDK / upstream provider so routes
 * and the error middleware can decide: retry-with-backoff, surface a clean
 * Indonesian 429 (provider rate limit), or fail loud. Anything not from the
 * provider (DB, auth, our own code) is `unknown`.
 */
export function classifyProviderError(err: unknown): ProviderErrorInfo {
  if (err instanceof RateLimitError) {
    const retryAfter = parseRetryAfterSeconds(err.headers);
    return {
      kind: "rate-limit",
      // Only wait-and-retry while the provider says we can retry soon.
      retryable: retryAfter === undefined || retryAfter <= 60,
      retryAfter,
    };
  }
  if (err instanceof AiEmptyReplyError) {
    return { kind: "transient", retryable: true };
  }
  if (err instanceof APIError && err.status !== undefined) {
    if (err.status >= 500) return { kind: "transient", retryable: true };
    return { kind: "permanent" };
  }
  if (err instanceof APIConnectionError || err instanceof APIConnectionTimeoutError) {
    return { kind: "transient", retryable: true };
  }
  if (err instanceof APIUserAbortError) {
    return { kind: "permanent" };
  }
  return { kind: "unknown" };
}

/**
 * Single OpenAI-compatible Chat Completions call used by every AI flow
 * (training, scoring, guide generation, employee tutor), via the official
 * OpenAI SDK pointed at an OpenAI-compatible gateway. When no API key is
 * configured (local development), a canned Indonesian reply is returned
 * instead, keeping the flow functional without a network call — production
 * requires the key.
 *
 * Transient upstream failures (provider 429 with a short Retry-After, 5xx,
 * dropped/timeout connections) are retried a bounded number of times with
 * exponential backoff + jitter. Permanent provider errors (4xx other than
 * 429, aborts) and unknown errors propagate unchanged so the caller's own
 * error handling / Indonesian surface stays in control.
 */
export async function callAiText(
  env: Env,
  system: string,
  messages: AiMessage[],
  maxTokens: number,
  options: { timeoutMs?: number; fallbackReply: string } = {
    timeoutMs: 60_000,
    fallbackReply: "",
  },
): Promise<AiCallResult> {
  const apiKey = env.AI_API_KEY?.trim() || env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      text: options.fallbackReply,
      tokensIn: 0,
      tokensOut: 0,
      finishReason: "stop",
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: resolveAiBaseUrl(env),
    // One shot — assistant replies are persisted per turn, so a transparent
    // retry could double-write a message. The routes own error handling.
    // Transient failures are retried explicitly below.
    maxRetries: 0,
    timeout: options.timeoutMs ?? 60_000,
  });

  for (let attempt = 0; ; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: env.AI_MODEL,
        max_tokens: maxTokens,
        // Reasoning models (gpt-oss, qwen3) burn their whole output budget on
        // chain-of-thought unless steered. "minimal" is the default so replies
        // are complete, fast, and free of leaked thinking; it's configurable per
        // deployment and dropped entirely when unset (non-reasoning models).
        ...(env.AI_REASONING_EFFORT
          ? { reasoning_effort: env.AI_REASONING_EFFORT }
          : {}),
        messages: [{ role: "system", content: system }, ...messages],
      });

      const text = completion.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new AiEmptyReplyError();
      }

      const promptJoined = [system, ...messages.map((m) => m.content)].join("\n");
      const tokensIn = completion.usage?.prompt_tokens ?? estimateTokens(promptJoined);
      const tokensOut = completion.usage?.completion_tokens ?? estimateTokens(text);

      return {
        text,
        tokensIn,
        tokensOut,
        finishReason: completion.choices?.[0]?.finish_reason ?? undefined,
      };
    } catch (err) {
      const info = classifyProviderError(err);
      const retryable = info.kind === "transient" || info.kind === "rate-limit"
        ? info.retryable
        : false;
      if (!retryable || attempt + 1 >= MAX_TRANSIENT_RETRIES) {
        throw err;
      }

      // Backoff: settle on Retry-After when the provider gave one, else
      // exponential with jitter (1s, then ~2s). Cap so a dead provider can't
      // hold a request hostage past its own timeout.
      const retryAfter = info.kind === "rate-limit" ? info.retryAfter : undefined;
      const baseMs =
        retryAfter !== undefined
          ? retryAfter * 1000
          : 1000 * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 400);
      await sleep(Math.min(baseMs, 60_000) + jitter);
    }
  }
}

/**
 * Resolve the OpenAI-compatible base URL. The provider is treated as a
 * drop-in Chat Completions gateway (default: Hack Club AI proxy), so the
 * official OpenAI SDK is the industry-standard client no matter which
 * upstream model actually serves the request.
 */
export function resolveAiBaseUrl(env: Env): string {
  return env.AI_BASE_URL || "https://ai.hackclub.com/proxy/v1";
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil((text?.length ?? 0) / 4));
}

/**
 * Sanitize user-authored text before it is embedded in a prompt envelope.
 * User text must never be able to close an XML enclosure early and inject
 * fake instructions (Section 7), so every prompt-structural tag, code fence,
 * and control character is stripped here on the outbound path.
 */
export function sanitizeUserText(raw: string): string {
  return raw
    .replace(/<\/?business_data>/gi, "")
    .replace(/<\/?knowledge_base>/gi, "")
    .replace(/```xml[\s\S]*?<\/business_data>[\s\S]*?```/gi, "")
    .replace(/```xml[\s\S]*?<\/knowledge_base>[\s\S]*?```/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

export function wrapBusinessData(content: string): string {
  return `<business_data>\n${sanitizeUserText(content)}\n</business_data>`;
}

// The model is told the wrapper tags are DATA, not output, but it occasionally
// echoes them back (bare or inside a markdown.xml fence). Strip the structural
// delimiters from the reply so they never render literally in the UI. Only the
// tags are removed — the reply's actual content is untouched.
export function stripStructuralTags(text: string): string {
  return text
    .replace(/```xml\s*[\s\S]*?<\/business_data>\s*```/gi, "")
    .replace(/```xml\s*[\s\S]*?<\/knowledge_base>\s*```/gi, "")
    .replace(/<\/?business_data>|<\/?knowledge_base>/gi, "")
    .replace(/```xml/gi, "")
    .trim();
}

// Guides and quizzes are persisted AI-written content that is later rendered
// verbatim to employees, so any structural delimiter the model echoed into a
// chapter or quiz must not survive storage. Unlike stripStructuralTags (which
// aggressively removes reply fence markers), this deliberately preserves
// standalone ```xml code fences that contain no structural tag so a legitimate
// code sample in a guide is left untouched.
export function stripStructuralMarkers(text: string): string {
  if (!text || !text.trim()) return text;
  return text
    .replace(/```xml\s*[\s\S]*?<\/?(?:business_data|knowledge_base)>[\s\S]*?```/gi, "")
    .replace(/<\/?(?:business_data|knowledge_base)>/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ChatHistoryMessage = {
  sender: string;
  content: string;
};

/**
 * Map stored sender/content rows to an OpenAI-compatible message list for a
 * conversation prompt. Admin/user messages are wrapped in <business_data>
 * (untrusted data); the model's own previous replies are sent raw so it can
 * maintain a coherent thread.
 */
export function buildHistoryMessages(
  messages: ChatHistoryMessage[],
): AiMessage[] {
  return messages.map((message) => {
    const isModel = message.sender === "ai";
    return {
      role: isModel ? ("assistant" as const) : ("user" as const),
      content: isModel
        ? stripStructuralTags(sanitizeUserText(message.content))
        : wrapBusinessData(message.content),
    };
  });
}