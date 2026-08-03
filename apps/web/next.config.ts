import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const connectSrc = [
  "'self'",
  "http://localhost:4000",
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com",
      "font-src 'self' data:",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
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
