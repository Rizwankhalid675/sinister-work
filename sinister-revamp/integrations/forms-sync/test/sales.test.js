'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
	ValidationError,
	parseSalesSubmission
} = require('../src/sales');

const validPayload = {
	name: ' Rizwan Khalid ',
	email: ' rizwan@example.com ',
	phone: ' (916) 555-0123 ',
	itemSku: ' SD-INTAKE-01 ',
	question: ' Will this fit my 2024 Ford? ',
	website: ''
};

test('normalizes a valid sales request into the existing Monday board contract', () => {
	const result = parseSalesSubmission(validPayload, new Date('2026-07-15T18:30:00Z'));

	assert.deepEqual(result, {
		boardId: 2428283337,
		groupId: 'emailed_items',
		itemName: 'Rizwan Khalid',
		columnValues: {
			label1: { index: 102 },
			email: { email: 'rizwan@example.com', text: 'rizwan@example.com' },
			phone: { phone: '+19165550123', countryShortName: 'US' },
			long_text_mm0btcjw: 'SD-INTAKE-01',
			long_text8: 'Will this fit my 2024 Ford?',
			date85: { date: '2026-07-15' }
		}
	});
});

test('omits the optional SKU column when no SKU is supplied', () => {
	const result = parseSalesSubmission({ ...validPayload, itemSku: ' ' }, new Date('2026-07-15T18:30:00Z'));

	assert.equal(Object.hasOwn(result.columnValues, 'long_text_mm0btcjw'), false);
});

test('reports field errors for missing and malformed customer data', () => {
	assert.throws(
		() => parseSalesSubmission({ name: '', email: 'invalid', phone: '12', question: '' }),
		(error) => {
			assert.ok(error instanceof ValidationError);
			assert.deepEqual(error.fields, {
				name: 'Enter your name.',
				email: 'Enter a valid email address.',
				phone: 'Enter a valid phone number.',
				question: 'Enter your question.'
			});
			return true;
		}
	);
});

test('rejects oversized values and unexpected fields', () => {
	assert.throws(
		() => parseSalesSubmission({ ...validPayload, question: 'x'.repeat(2001), admin: true }),
		(error) => {
			assert.ok(error instanceof ValidationError);
			assert.equal(error.fields.question, 'Keep your question under 2,000 characters.');
			assert.equal(error.fields.form, 'The request contains unsupported fields.');
			return true;
		}
	);
});

test('silently identifies honeypot submissions without creating a Monday payload', () => {
	const result = parseSalesSubmission({ ...validPayload, website: 'https://spam.example' });

	assert.deepEqual(result, { discarded: true });
});

