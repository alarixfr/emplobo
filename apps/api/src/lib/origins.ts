import type { Env } from "../env.js";

// Browser origins allowed to call this API (CORS) and accepted as Clerk `azp`
// authorized parties (JWT verification). A bare apex deployment
// (https://emplobo.com) is also reachable through its www companion — sessions
// minted on either host carry an `azp` claim pointing at whichever origin the
// browser used, so both must be allowed or API calls from www fail with 401.
export function webAppOrigins(env: Env): string[] {
  const origins = [env.WEB_APP_ORIGIN];
  try {
    const url = new URL(env.WEB_APP_ORIGIN);
    const parts = url.hostname.split(".");
    if (
      url.protocol === "https:" &&
      parts.length === 2 &&
      url.hostname !== "localhost"
    ) {
      origins.push(`https://www.${url.hostname}`);
    }
  } catch {
    // keep the base origin only
  }
  return [...new Set(origins)];
}