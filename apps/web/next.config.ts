import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// The browser calls apps/api directly with the Clerk session token — its
// origin MUST be in connect-src or every API call is blocked by the CSP.
const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : null;

// Custom Clerk frontend domain, e.g. clerk.emplobo.com. When a production
// instance uses a custom frontend API domain, the Clerk SDK script and all
// session/identity calls are served from THAT origin (not *.clerk.com), so
// the CSP must allow it or auth silently breaks (missing header buttons is
// the tell-tale symptom). Clerk encodes the domain into the publishable key:
// pk_<env>_<base64(domain$)>; see @clerk/backend parsePublishableKey.
let clerkFrontendOrigin: string | null = null;
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (clerkPublishableKey) {
  const enc = clerkPublishableKey.split("_").pop() ?? "";
  try {
    const base64 = enc.length % 4 ? enc + "=".repeat(4 - (enc.length % 4)) : enc;
    let domain = Buffer.from(base64, "base64").toString("utf8");
    if (domain.endsWith("$")) domain = domain.slice(0, -1);
    if (domain && domain.includes(".")) {
      clerkFrontendOrigin = `https://${domain}`;
    }
  } catch {
    // Non-fatal: fall back to the built-in *.clerk.com allowlist below.
  }
}

const connectSrc = [
  "'self'",
  ...(isDev ? ["http://localhost:4000"] : []),
  ...(apiOrigin ? [apiOrigin] : []),
  ...(clerkFrontendOrigin ? [clerkFrontendOrigin] : []),
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://api.clerk.com",
  "https://clerk-telemetry.com",
  ...(isDev
    ? [
        // Next.js dev HMR / overlay channels
        "http://localhost:*",
        "http://127.0.0.1:*",
        "ws://localhost:*",
        "ws://127.0.0.1:*",
      ]
    : []),
];

const scriptSrc = [
  "'self'",
  // 'unsafe-inline' is effectively required by Clerk's injected scripts.
  "'unsafe-inline'",
  // 'unsafe-eval' is only needed for Next.js dev (react-refresh); shipping it
  // in production would weaken XSS mitigation.
  ...(isDev ? ["'unsafe-eval'"] : []),
  ...(clerkFrontendOrigin ? [clerkFrontendOrigin] : []),
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://challenges.cloudflare.com",
];

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src " + scriptSrc.join(" "),
      // Google Fonts CSS + woff2 files (Inter / JetBrains Mono) — without these
      // the @import in globals.css is blocked and the typography system
      // silently falls back to system fonts.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com" + (clerkFrontendOrigin ? ` ${clerkFrontendOrigin}` : ""),
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com" + (clerkFrontendOrigin ? ` ${clerkFrontendOrigin}` : ""),
      "worker-src 'self' blob:",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Do NOT set output: 'export' — breaks middleware + dynamic rendering
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
