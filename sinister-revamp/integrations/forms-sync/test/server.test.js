'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildServer, parseAllowedOrigins } = require('../src/server');

test('uses only the production storefront origins by default', () => {
	assert.deepEqual(parseAllowedOrigins(''), [
		'https://sinisterdiesel.com',
		'https://www.sinisterdiesel.com'
	]);
});

test('accepts an explicit comma-separated origin allowlist for local testing', () => {
	assert.deepEqual(parseAllowedOrigins('http://localhost:3000, http://127.0.0.1:3000'), [
		'http://localhost:3000',
		'http://127.0.0.1:3000'
	]);
});

test('refuses to build the live server without a Monday token', () => {
	assert.throws(
		() => buildServer({ MONDAY_API_TOKEN: '' }),
		/MONDAY_API_TOKEN is required/
	);
});

test('builds in explicit dry-run mode without a token or provider request', () => {
	const server = buildServer(
		{ DRY_RUN: 'true' },
		{ fetchImpl: async () => assert.fail('dry-run must not call Monday') }
	);
	assert.equal(typeof server.listen, 'function');
	server.close();
});

test('builds an HTTP server with an injected token and fetch transport', async () => {
	const server = buildServer(
		{ MONDAY_API_TOKEN: 'test-token' },
		{ fetchImpl: async () => assert.fail('provider should not run during startup') }
	);
	assert.equal(typeof server.listen, 'function');
	server.close();
});
