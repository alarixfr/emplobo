/**
 * Shared formatting for rate-limit feedback (guide generation and other
 * throttled endpoints). Keeps the copy consistent across components and
 * converts the server's `retryAfter` seconds + `retryAt` ISO stamp into a
 * human "try again in X (around HH:MM)" hint.
 */

export function formatRetryWait(seconds: number): string {
  const raw = Math.max(1, Math.ceil(seconds));
  if (raw >= 60) {
    return `±${Math.ceil(raw / 60)} menit`;
  }
  return `±${raw} detik`;
}

export function formatRetryClock(retryAt?: unknown): string {
  if (typeof retryAt !== "string") return "";
  const d = new Date(retryAt);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return ` (sekitar pukul ${time})`;
}

/**
 * Friendly, specific message for the guide-generation 429. `limit`/`windowSeconds`
 * fall back to the documented 3/hour defaults when the API response omits them.
 */
export function guideRateLimitMessage(
  retryAfter?: unknown,
  retryAt?: unknown,
  limit = 3,
): string {
  const wait = typeof retryAfter === "number" ? retryAfter : 60;
  return `Jatah pembuatan panduan role ini habis — maksimal ${limit} kali per jam per role. Coba lagi ${formatRetryWait(wait)}${formatRetryClock(retryAt)}.`;
}