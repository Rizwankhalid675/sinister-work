'use strict';

const config = require('./config');

// ── CORS ───────────────────────────────────────────────────────────
// Strict allow-list. Requests with no Origin (server-to-server, curl)
// are allowed through so health checks work; browser requests must
// match an entry in ALLOWED_ORIGINS exactly.
function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    if (config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    } else {
      // Unknown origin: refuse without CORS headers so the browser blocks it.
      if (req.method === 'OPTIONS') return res.status(403).end();
      return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
    }
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

// ── Rate limiting ──────────────────────────────────────────────────
// In-memory sliding-window per IP. Adequate for a single-process form
// endpoint; swap for Redis if you ever run multiple instances.
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const windowStart = now - config.rateLimit.windowMs;

  const arr = (hits.get(ip) || []).filter((t) => t > windowStart);
  arr.push(now);
  hits.set(ip, arr);

  if (arr.length > config.rateLimit.max) {
    res.setHeader('Retry-After', Math.ceil(config.rateLimit.windowMs / 1000));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }
  next();
}

// Periodic cleanup so the Map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - config.rateLimit.windowMs;
  for (const [ip, arr] of hits) {
    const kept = arr.filter((t) => t > cutoff);
    if (kept.length) hits.set(ip, kept);
    else hits.delete(ip);
  }
}, config.rateLimit.windowMs).unref();

module.exports = { cors, rateLimit };
