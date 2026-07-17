'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { FORM_DEFINITIONS, ValidationError, parseHelpSubmission } = require('../src/help-forms');

const base = {
	name: 'Rizwan Khalid',
	email: 'RIZWAN@example.com',
	phone: '(916) 555-0123',
	details: 'Please help with this request.',
	website: ''
};

const cases = [
	['sales-inquiry', 102, { itemSku: 'SD-01' }],
	['missing-damaged-parts', 110, { orderNumber: 'SO-100', itemSku: 'SD-02', installed: 'yes' }],
	['returns-exchanges', 3, { orderNumber: 'SO-101', itemSku: 'SD-03', returnType: 'Return', reason: 'Wrong part' }],
	['order-tracking', 11, { orderNumber: 'SO-102' }],
	['tech-support', 101, { orderNumber: 'SO-103', itemSku: 'SD-04', installed: 'no' }],
	['warranty-inquiry', 12, { orderNumber: 'SO-104', itemSku: 'SD-05' }],
	['shipping-claim', 106, { orderNumber: 'SO-105', trackingNumber: '1Z999', ifNumber: 'IF-55' }]
];

test('defines every public Help Center form route', () => {
	assert.deepEqual(Object.keys(FORM_DEFINITIONS).sort(), cases.map(([slug]) => slug).sort());
});

for (const [slug, inquiryIndex, extra] of cases) {
	test(`${slug} validates and maps to the Customer Inquiries board`, () => {
		const payload = { ...base, ...extra };
		if (slug === 'sales-inquiry') payload.question = payload.details;
		const item = parseHelpSubmission(slug, payload, new Date('2026-07-15T18:30:00Z'));
		assert.equal(item.boardId, 2428283337);
		assert.equal(item.groupId, 'emailed_items');
		assert.equal(item.itemName, base.name);
		assert.equal(item.columnValues.label1.index, inquiryIndex);
		assert.equal(item.columnValues.email.email, 'rizwan@example.com');
		assert.equal(item.columnValues.phone.phone, '+19165550123');
		assert.equal(item.columnValues.date85.date, '2026-07-15');
	});
}

test('maps known board fields and preserves workflow-only details', () => {
	const item = parseHelpSubmission('returns-exchanges', {
		...base,
		orderNumber: 'SO-200', itemSku: 'SD-RETURN', returnType: 'Exchange', reason: 'Fitment',
		evidenceUrl: 'https://example.com/photo.jpg'
	});
	assert.equal(item.columnValues.long_textcd308p4p, 'SO-200');
	assert.equal(item.columnValues.long_text_mm0btcjw, 'SD-RETURN');
	assert.match(item.columnValues.long_text8, /Return type: Exchange/);
	assert.match(item.columnValues.long_text8, /Reason: Fitment/);
	assert.match(item.columnValues.long_text8, /Evidence: https:\/\/example\.com\/photo\.jpg/);
});

test('maps installed state to the existing Monday status column', () => {
	assert.equal(parseHelpSubmission('tech-support', { ...base, installed: 'yes' }).columnValues.color_mm0dprrg.index, 105);
	assert.equal(parseHelpSubmission('tech-support', { ...base, installed: 'no' }).columnValues.color_mm0dprrg.index, 3);
});

test('rejects an unknown form, unsupported fields, and missing required values', () => {
	assert.throws(() => parseHelpSubmission('unknown', base), /Unknown help form/);
	assert.throws(
		() => parseHelpSubmission('order-tracking', { ...base, orderNumber: '', internalRoute: 'hack' }),
		(error) => Boolean(error instanceof ValidationError
			&& error.fields.orderNumber
			&& error.fields.form)
	);
});

test('honeypot submissions are discarded for every workflow', () => {
	assert.deepEqual(parseHelpSubmission('shipping-claim', { ...base, website: 'spam' }), { discarded: true });
});
