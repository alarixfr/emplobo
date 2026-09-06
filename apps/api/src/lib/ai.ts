import OpenAI from "openai";
import type { Env } from "../env.js";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiCallResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
};

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

/**
 * Single OpenAI-compatible Chat Completions call used by every AI flow
 * (training, scoring, guide generation, employee tutor), via the official
 * OpenAI SDK pointed at an OpenAI-compatible gateway. When no API key is
 * configured (local development), a canned Indonesian reply is returned
 * instead, keeping the flow functional without a network call — production
 * requires the key.
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
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: resolveAiBaseUrl(env),
    // One shot — assistant replies are persisted per turn, so a transparent
    // retry could double-write a message. The routes own error handling.
    maxRetries: 0,
    timeout: options.timeoutMs ?? 60_000,
  });

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
    throw new Error(
      "AI returned empty text content (the model likely spent its whole output budget on chain-of-thought; treat as transient and retry with a larger budget)",
    );
  }

  const promptJoined = [system, ...messages.map((m) => m.content)].join("\n");
  const tokensIn = completion.usage?.prompt_tokens ?? estimateTokens(promptJoined);
  const tokensOut = completion.usage?.completion_tokens ?? estimateTokens(text);

  return { text, tokensIn, tokensOut };
}