// Minimal in-memory sliding-window rate limiter for public/unauthenticated
// routes. Not distributed-safe (per-process only) — fine as a first line of
// defense against casual token-guessing/enumeration on a single instance.
// If this app is ever scaled horizontally, replace with a shared store
// (e.g. Redis) keyed the same way.

const buckets = new Map();

function pruneOld(now) {
  // Opportunistic cleanup so the map doesn't grow unbounded in long-lived
  // processes. Runs occasionally, not on every call.
  if (buckets.size < 5000) return;
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < 60 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

/**
 * @param {string} key - identifies the caller/resource being limited (e.g. `ip:token`)
 * @param {{ windowMs: number, max: number }} opts
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, { windowMs, max }) {
  const now = Date.now();
  pruneOld(now);
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    const retryAfterMs = windowMs - (now - hits[0]);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, remaining: max - hits.length, retryAfterMs: 0 };
}

export function clientIpFromRequest(request) {
  const forwarded = request?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request?.ip || request?.socket?.remoteAddress || "unknown";
}
