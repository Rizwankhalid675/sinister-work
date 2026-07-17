'use strict';

const express = require('express');
const config = require('./lib/config');
const { cors, rateLimit } = require('./lib/middleware');
const { validate } = require('./lib/validate');
const monday = require('./lib/monday');

const app = express();

// Trust the loopback proxy (Nginx) so req.ip reflects X-Forwarded-For.
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');

app.use(express.json({ limit: '32kb' }));
app.use(cors);

// Health check — used by Nginx / monitoring. No CORS restriction issues
// because it carries no Origin when called server-side.
app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'sinister-forms-api', env: config.appEnv });
});

// Body-parse error handler (malformed JSON).
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'malformed_json' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'payload_too_large' });
  }
  next(err);
});

app.post('/api/forms/submit', rateLimit, async (req, res) => {
  const result = validate(req.body);
  if (!result.ok) {
    return res.status(422).json({ ok: false, error: 'validation_failed', details: result.errors });
  }

  const submission = result.value;

  // Silently accept honeypot hits without touching monday — bots get a 200
  // and never learn they were filtered.
  if (submission.honeypotTripped) {
    return res.status(200).json({ ok: true });
  }

  try {
    const itemId = await monday.createItem(submission);
    return res.status(200).json({ ok: true, id: itemId });
  } catch (err) {
    console.error(`[forms] monday create failed: ${err.message}`);
    return res.status(502).json({ ok: false, error: 'downstream_unavailable' });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'not_found' }));

// Final error net.
app.use((err, req, res, next) => {
  console.error(`[forms] unhandled: ${err && err.stack ? err.stack : err}`);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: 'internal_error' });
});

const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`sinister-forms-api listening on 127.0.0.1:${config.port} (${config.appEnv})`);
});

// Graceful shutdown for PM2 / systemd restarts.
function shutdown(sig) {
  console.log(`[forms] ${sig} received, closing...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
