import type { Env } from "../env.js";

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiCallResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
};

/**
 * Normalize a configured model slug into an OpenRouter model id. Earlier
 * builds named models by their base names ("claude-sonnet-4-5"); those aliases
 * are mapped here for backward compatibility so existing .env values keep
 * working. Any other slug (e.g. "minimax/minimax-m3:free") passes through
 * unchanged.
 */
export function toOpenRouterModel(model: string): string {
  if (model === "claude-sonnet-4-5") {
    return "anthropic/claude-sonnet-4.5";
  }
  if (model === "claude-haiku-4-5") {
    return "anthropic/claude-haiku-4.5";
  }
  if (model.startsWith("claude-")) {
    return `anthropic/${model.replace(/-4-5/g, "-4.5").replace(/-3-5/g, "-3.5")}`;
  }
  return model;
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
): AnthropicMessage[] {
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
 * Single OpenRouter Chat Completions call used by every AI flow (training,
 * scoring, guide generation, tutor). When no API key is configured (local
 * development), a canned Indonesian reply is returned instead, keeping the
 * flow functional without a network call — production requires the key.
 */
export async function callOpenRouterText(
  env: Env,
  system: string,
  messages: AnthropicMessage[],
  maxTokens: number,
  options: { timeoutMs?: number; fallbackReply: string } = {
    timeoutMs: 60_000,
    fallbackReply: "",
  },
): Promise<AiCallResult> {
  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) {
    return {
      text: options.fallbackReply,
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  const openRouterMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: system }, ...messages];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    // Hard timeout — a hung upstream must not hold the request for undici's
    // 300s default while the just-saved message is already persisted.
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "X-API-Key": openRouterKey,
      "content-type": "application/json",
      "HTTP-Referer": env.WEB_APP_ORIGIN,
      "X-Title": "Emplobo",
    },
    body: JSON.stringify({
      model: toOpenRouterModel(env.OPENROUTER_MODEL),
      max_tokens: maxTokens,
      messages: openRouterMessages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter call failed (${res.status}): ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty text content");
  }

  const tokensIn =
    data.usage?.prompt_tokens ??
    estimateTokens(system + openRouterMessages.map((m) => m.content).join("\n"));
  const tokensOut = data.usage?.completion_tokens ?? estimateTokens(text);

  return { text, tokensIn, tokensOut };
}