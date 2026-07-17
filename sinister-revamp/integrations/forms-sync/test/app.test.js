'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

const validPayload = {
	name: 'Rizwan Khalid',
	email: 'rizwan@example.com',
	phone: '916-555-0123',
	itemSku: 'SD-INTAKE-01',
	question: 'Will this fit my truck?',
	website: ''
};

async function withServer(options, run) {
	const server = http.createServer(createApp({
		allowedOrigins: ['https://sinisterdiesel.com'],
		randomUUID: () => 'request-123',
		now: () => new Date('2026-07-15T18:30:00Z'),
		...options
	}));
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address();
	try {
		await run(`http://127.0.0.1:${port}`);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

function post(baseUrl, body, headers = {}, slug = 'sales-inquiry') {
	return fetch(`${baseUrl}/api/help-forms/${slug}`, {
		method: 'POST',
		headers: {
			origin: 'https://sinisterdiesel.com',
			'content-type': 'application/json',
			...headers
		},
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

test('health endpoint works without a Monday credential', async () => {
	await withServer({ createMondayItem: async () => assert.fail('provider should not run') }, async (baseUrl) => {
		const response = await fetch(`${baseUrl}/health`);
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { ok: true, service: 'forms-sync' });
	});
});

test('valid Sales submission invokes the provider and returns a public reference', async () => {
	let received;
	await withServer({ createMondayItem: async (item) => { received = item; return { id: '987654321' }; } }, async (baseUrl) => {
		const response = await post(baseUrl, validPayload);
		assert.equal(response.status, 201);
		assert.equal(response.headers.get('access-control-allow-origin'), 'https://sinisterdiesel.com');
		assert.deepEqual(await response.json(), { ok: true, reference: 'request-123' });
		assert.equal(received.boardId, 2428283337);
		assert.equal(received.columnValues.label1.index, 102);
	});
});

test('all native Help Center routes invoke the matching Monday workflow', async () => {
	const routes = {
		'missing-damaged-parts': 110,
		'returns-exchanges': 3,
		'order-tracking': 11,
		'tech-support': 101,
		'warranty-inquiry': 12,
		'shipping-claim': 106
	};
	for (const [slug, index] of Object.entries(routes)) {
		let received;
		await withServer({ createMondayItem: async (item) => { received = item; } }, async (baseUrl) => {
			const payload = {
				name: validPayload.name, email: validPayload.email, phone: validPayload.phone,
				details: validPayload.question, orderNumber: 'SO-123', website: ''
			};
			const response = await post(baseUrl, payload, {}, slug);
			assert.equal(response.status, 201, slug);
			assert.equal(received.columnValues.label1.index, index, slug);
		});
	}
});

test('validation errors are returned without invoking the provider', async () => {
	await withServer({ createMondayItem: async () => assert.fail('provider should not run') }, async (baseUrl) => {
		const response = await post(baseUrl, { ...validPayload, email: 'invalid' });
		assert.equal(response.status, 422);
		assert.deepEqual(await response.json(), {
			ok: false,
			code: 'VALIDATION_ERROR',
			fields: { email: 'Enter a valid email address.' },
			reference: 'request-123'
		});
	});
});

test('honeypot submissions return success without invoking the provider', async () => {
	await withServer({ createMondayItem: async () => assert.fail('provider should not run') }, async (baseUrl) => {
		const response = await post(baseUrl, { ...validPayload, website: 'spam' });
		assert.equal(response.status, 202);
		assert.deepEqual(await response.json(), { ok: true, reference: 'request-123' });
	});
});

test('rejects disallowed origins, media types, oversized bodies, and unknown routes', async () => {
	await withServer({ createMondayItem: async () => assert.fail('provider should not run') }, async (baseUrl) => {
		assert.equal((await post(baseUrl, validPayload, { origin: 'https://evil.example' })).status, 403);
		assert.equal((await post(baseUrl, validPayload, { 'content-type': 'text/plain' })).status, 415);
		assert.equal((await post(baseUrl, JSON.stringify({ question: 'x'.repeat(33 * 1024) }))).status, 413);
		assert.equal((await fetch(`${baseUrl}/api/help-forms/unknown`)).status, 404);
	});
});

test('handles CORS preflight for the storefront origin', async () => {
	await withServer({ createMondayItem: async () => assert.fail('provider should not run') }, async (baseUrl) => {
		const response = await fetch(`${baseUrl}/api/help-forms/sales-inquiry`, {
			method: 'OPTIONS',
			headers: { origin: 'https://sinisterdiesel.com' }
		});
		assert.equal(response.status, 204);
		assert.equal(response.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
	});
});

test('masks Monday provider errors from the customer response', async () => {
	await withServer({ createMondayItem: async () => { throw new Error('private provider detail'); } }, async (baseUrl) => {
		const response = await post(baseUrl, validPayload);
		assert.equal(response.status, 502);
		const body = await response.json();
		assert.deepEqual(body, { ok: false, code: 'SUBMISSION_UNAVAILABLE', reference: 'request-123' });
		assert.equal(JSON.stringify(body).includes('private provider detail'), false);
	});
});
