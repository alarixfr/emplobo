import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    // @clerk/backend's authenticateRequest parses the Clerk instance id from
    // the publishable key — it throws "Publishable key is missing" without it.
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    WEB_APP_ORIGIN: z.string().url(),
    // Key for the OpenAI-compatible Chat Completions gateway. The default
    // gateway is the Hack Club AI proxy (https://ai.hackclub.com/proxy/v1),
    // served through the official OpenAI SDK regardless of upstream model.
    // OPENROUTER_API_KEY is accepted as a legacy fallback for existing setups.
    AI_API_KEY: z.string().optional(),
    AI_BASE_URL: z.string().url().optional(),
    // Model slug served by the gateway — powers the AI trainer/tutor
    // (training, completeness scoring, guide generation, and employee chat
    // tutor). Default: OpenAI gpt-oss-safeguard-20b on the Hack Club AI proxy.
    AI_MODEL: z.string().min(1).default("openai/gpt-oss-safeguard-20b"),
    // Reasoning effort for reasoning-capable models. The default model spends
    // most of its output budget on chain-of-thought; "minimal" keeps replies
    // fast, complete, and free of leaked thinking. Set "medium"/"high" for
    // deeper reasoning, or leave empty when a non-reasoning model is used.
    AI_REASONING_EFFORT: z
      .enum(["minimal", "low", "medium", "high"])
      .default("minimal"),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Fail loudly in production — the AI layer IS the product; silently
    // serving canned replies to real users is worse than refusing to start.
    // Dev without a key still works (canned fallback keeps local dev moving).
    if (
      env.NODE_ENV === "production" &&
      !env.AI_API_KEY?.trim() &&
      !env.OPENROUTER_API_KEY?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_API_KEY"],
        message: "required when NODE_ENV=production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  // Pick only known keys — process.env also contains OS/shell vars.
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    WEB_APP_ORIGIN: process.env.WEB_APP_ORIGIN,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_MODEL: process.env.AI_MODEL,
    AI_REASONING_EFFORT: process.env.AI_REASONING_EFFORT,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid apps/api environment:\n${details}`);
  }
  return parsed.data;
}
