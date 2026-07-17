const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { validateSalesInquiry, toMondayItem } = require('./sales');

const MAX_BODY_BYTES = 32 * 1024;
const SALES_PATH = '/api/help-forms/sales-inquiry';

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && (url.hostname === 'sinisterdiesel.com' || url.hostname === 'www.sinisterdiesel.com')
      || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch {
    return false;
  }
}

function sendJson(res, status, body, origin) {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(json));
  res.setHeader('cache-control', 'no-store');
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
  }
  res.end(json);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Body too large'), { status: 413 }));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function createHelpFormsServer(options = {}) {
  const createItem = options.createItem;
  if (typeof createItem !== 'function') throw new TypeError('createItem is required');
  const requestId = options.requestId || randomUUID;
  const now = options.now || (() => new Date());
  const logger = options.logger || console;

  return http.createServer(async (req, res) => {
    const id = requestId();
    const origin = req.headers.origin || '';
    const path = new URL(req.url, 'http://localhost').pathname;

    if (!isAllowedOrigin(origin)) {
      return sendJson(res, 403, { ok: false, requestId: id, message: 'Request origin is not allowed.' });
    }

    if (req.method === 'OPTIONS' && path === SALES_PATH) {
      res.statusCode = 204;
      res.setHeader('access-control-allow-origin', origin || 'https://www.sinisterdiesel.com');
      res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
      res.setHeader('access-control-allow-headers', 'Content-Type');
      res.setHeader('access-control-max-age', '600');
      res.setHeader('vary', 'Origin');
      return res.end();
    }

    if (path !== SALES_PATH || req.method !== 'POST') {
      return sendJson(res, 404, { ok: false, requestId: id, message: 'Not found.' }, origin);
    }

    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      return sendJson(res, 415, { ok: false, requestId: id, message: 'Send this form as JSON.' }, origin);
    }

    let input;
    try {
      input = await readJsonBody(req);
    } catch (error) {
      const status = error.status || 400;
      return sendJson(res, status, {
        ok: false,
        requestId: id,
        message: status === 413 ? 'The request is too large.' : 'The request is not valid JSON.',
      }, origin);
    }

    const validation = validateSalesInquiry(input);
    if (validation.bot) {
      return sendJson(res, 201, { ok: true, requestId: id }, origin);
    }
    if (!validation.ok) {
      return sendJson(res, 422, { ok: false, requestId: id, errors: validation.errors }, origin);
    }

    const item = toMondayItem(validation.value, now());
    try {
      await createItem(item.boardId, item.groupId, item.itemName, item.columnValues);
      return sendJson(res, 201, { ok: true, requestId: id }, origin);
    } catch (error) {
      logger.error(`[help-forms] request=${id} form=sales-inquiry provider=monday result=error ${error.message}`);
      return sendJson(res, 502, {
        ok: false,
        requestId: id,
        message: 'We could not send your request right now. Please use the backup form.',
      }, origin);
    }
  });
}

function startHelpFormsServer(options = {}) {
  const port = Number(options.port || process.env.HELP_FORMS_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const { createItem } = require('../monday');
  const server = createHelpFormsServer({ createItem, logger: options.logger });
  server.listen(port, options.host || process.env.HELP_FORMS_HOST || '127.0.0.1', () => {
    console.log(`[help-forms] listening on ${options.host || process.env.HELP_FORMS_HOST || '127.0.0.1'}:${port}`);
  });
  return server;
}

module.exports = { createHelpFormsServer, startHelpFormsServer, isAllowedOrigin };
