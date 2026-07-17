'use strict';

const { randomUUID: nodeRandomUUID } = require('node:crypto');
const { FORM_DEFINITIONS, ValidationError, parseHelpSubmission } = require('./help-forms');

const BODY_LIMIT = 32 * 1024;

function sendJson(response, status, body, origin) {
	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store',
		'x-content-type-options': 'nosniff'
	};
	if (origin) headers['access-control-allow-origin'] = origin;
	response.writeHead(status, headers);
	response.end(JSON.stringify(body));
}

async function readJson(request) {
	let size = 0;
	let tooLarge = false;
	const chunks = [];
	for await (const chunk of request) {
		size += chunk.length;
		if (size > BODY_LIMIT) tooLarge = true;
		else chunks.push(chunk);
	}
	if (tooLarge) return { tooLarge: true };
	try {
		return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
	} catch {
		return { invalid: true };
	}
}

function createApp({
	createMondayItem,
	allowedOrigins = [],
	randomUUID = nodeRandomUUID,
	now = () => new Date(),
	logger = { error() {} }
}) {
	if (typeof createMondayItem !== 'function') throw new TypeError('createMondayItem must be a function.');
	const allowed = new Set(allowedOrigins);

	return async function app(request, response) {
		const origin = request.headers.origin || '';
		const path = new URL(request.url, 'http://forms-sync.local').pathname;

		if (request.method === 'GET' && path === '/health') {
			return sendJson(response, 200, { ok: true, service: 'forms-sync' });
		}

		const routeMatch = path.match(/^\/api\/help-forms\/([a-z0-9-]+)$/);
		const formSlug = routeMatch && routeMatch[1];
		if (!formSlug || !FORM_DEFINITIONS[formSlug]) {
			return sendJson(response, 404, { ok: false, code: 'NOT_FOUND' });
		}

		if (!allowed.has(origin)) {
			return sendJson(response, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
		}

		if (request.method === 'OPTIONS') {
			response.writeHead(204, {
				'access-control-allow-origin': origin,
				'access-control-allow-methods': 'POST, OPTIONS',
				'access-control-allow-headers': 'Content-Type',
				'access-control-max-age': '600',
				'vary': 'Origin'
			});
			return response.end();
		}

		if (request.method !== 'POST') {
			return sendJson(response, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' }, origin);
		}

		if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
			return sendJson(response, 415, { ok: false, code: 'JSON_REQUIRED' }, origin);
		}

		const reference = randomUUID();
		const parsedBody = await readJson(request);
		if (parsedBody.tooLarge) {
			return sendJson(response, 413, { ok: false, code: 'PAYLOAD_TOO_LARGE', reference }, origin);
		}
		if (parsedBody.invalid) {
			return sendJson(response, 400, { ok: false, code: 'INVALID_JSON', reference }, origin);
		}

		let mondayItem;
		try {
			mondayItem = parseHelpSubmission(formSlug, parsedBody.value, now());
		} catch (error) {
			if (error instanceof ValidationError) {
				return sendJson(response, 422, {
					ok: false,
					code: 'VALIDATION_ERROR',
					fields: error.fields,
					reference
				}, origin);
			}
			throw error;
		}

		if (mondayItem.discarded) {
			return sendJson(response, 202, { ok: true, reference }, origin);
		}

		try {
			await createMondayItem(mondayItem);
			return sendJson(response, 201, { ok: true, reference }, origin);
		} catch (error) {
			logger.error('Monday submission failed.', { reference, error });
			return sendJson(response, 502, {
				ok: false,
				code: 'SUBMISSION_UNAVAILABLE',
				reference
			}, origin);
		}
	};
}

module.exports = { BODY_LIMIT, createApp };
