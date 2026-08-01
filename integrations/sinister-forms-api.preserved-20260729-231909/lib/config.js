'use strict';

// Centralised config loader. Reads from process.env (populated from .env by
// the caller, e.g. `node --env-file=.env server.js` on Node 20+, or PM2 env).
// Fails fast on missing required values so a misconfigured deploy never boots.

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(v).trim();
}

function optional(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  return String(v).trim();
}

function csv(name, fallback) {
  const raw = optional(name, fallback);
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, '')) // strip trailing slashes
    .filter(Boolean);
}

const config = {
  port: parseInt(optional('PORT', '3100'), 10),
  appEnv: optional('APP_ENV', 'production'),

  allowedOrigins: csv('ALLOWED_ORIGINS', ''),

  monday: {
    accessToken: required('MONDAY_API_TOKEN'),
    apiVersion: optional('MONDAY_API_VERSION', '2024-10'),
    boardId: required('MONDAY_BOARD_ID'),
    groupId: optional('MONDAY_GROUP_ID', ''),
    endpoint: 'https://api.monday.com/v2',
  },

  notify: {
    internalEmail: optional('INTERNAL_NOTIFICATION_EMAIL', ''),
    customerFrom: optional('CUSTOMER_FROM_EMAIL', ''),
  },

  captchaSecret: optional('CAPTCHA_SECRET', ''),

  rateLimit: {
    max: parseInt(optional('RATE_LIMIT_MAX', '20'), 10),
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },
};

module.exports = config;
