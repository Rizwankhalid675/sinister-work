'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createMondayClient, MondayProviderError } = require('../src/monday-client');

const item = {
	boardId: 2428283337,
	groupId: 'emailed_items',
	itemName: 'Rizwan Khalid',
	columnValues: { label1: { index: 102 }, long_text8: 'Question' }
};

test('sends a create_item mutation using only the server-side token', async () => {
	let request;
	const client = createMondayClient({
		token: 'server-only-token',
		fetchImpl: async (url, options) => {
			request = { url, options };
			return new Response(JSON.stringify({ data: { create_item: { id: '123' } } }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}
	});

	assert.deepEqual(await client.createItem(item), { id: '123' });
	assert.equal(request.url, 'https://api.monday.com/v2');
	assert.equal(request.options.headers.authorization, 'server-only-token');
	const body = JSON.parse(request.options.body);
	assert.match(body.query, /create_item/);
	assert.deepEqual(body.variables, {
		boardId: 2428283337,
		groupId: 'emailed_items',
		itemName: 'Rizwan Khalid',
		columnValues: JSON.stringify(item.columnValues)
	});
});

test('requires a token before a provider request can be made', () => {
	assert.throws(() => createMondayClient({ token: '' }), /MONDAY_API_TOKEN/);
});

test('converts HTTP and GraphQL failures to a provider-safe error', async () => {
	const httpClient = createMondayClient({
		token: 'token',
		fetchImpl: async () => new Response('gateway failed', { status: 502 })
	});
	await assert.rejects(() => httpClient.createItem(item), MondayProviderError);

	const graphqlClient = createMondayClient({
		token: 'token',
		fetchImpl: async () => new Response(JSON.stringify({ errors: [{ message: 'private detail' }] }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		})
	});
	await assert.rejects(() => graphqlClient.createItem(item), MondayProviderError);
});

