'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = {
	'help-online-account-issues.mvt': 'missing-damaged-parts',
	'returns_exchanges.mvt': 'returns-exchanges',
	'help-order-status.mvt': 'order-tracking',
	'help-sinister-tech-support.mvt': 'tech-support',
	'help-warranty-inquiry.mvt': 'warranty-inquiry',
	'shipping-protection-requests.mvt': 'shipping-claim'
};

test('help-sales-inquiry.mvt uses its native Miva self-processor', () => {
	const source = fs.readFileSync(path.join(root, 'templates', 'help-sales-inquiry.mvt'), 'utf8');
	assert.match(source, /<form[^>]+method=["']post["']/i);
	assert.doesNotMatch(source, /<form[^>]+action=/i);
	assert.match(source, /name=["']Form_Action["'][^>]+value=["']sales-inquiry["']/i);
	assert.doesNotMatch(source, /data-sd2-help-form=|data-endpoint=|\/api\/help-forms\//i);
	assert.doesNotMatch(source, /<iframe\b|forms\.monday\.com\/forms\/embed|livehelpnow|application_secret|ticketForm/i);
	assert.match(source, /type=["']submit["']/i);
});

for (const [file, slug] of Object.entries(pages)) {
	test(`${file} uses the native ${slug} form`, () => {
		const source = fs.readFileSync(path.join(root, 'templates', file), 'utf8');
		assert.match(source, new RegExp(`data-sd2-help-form=["']${slug}["']`));
		assert.match(source, new RegExp(`data-endpoint=["']/api/help-forms/${slug}["']`));
		assert.doesNotMatch(source, /<iframe\b|forms\.monday\.com\/forms\/embed|livehelpnow|application_secret|ticketForm/i);
		assert.match(source, /data-help-form-submit/);
		assert.match(source, /data-help-form-success/);
	});
}

test('the storefront controller initializes every native help form and submits generic fields', () => {
	const source = fs.readFileSync(path.join(root, 'js', 'sd2-v2-components.js'), 'utf8');
	assert.match(source, /querySelectorAll\('\[data-sd2-help-form\]'\)/);
	assert.match(source, /form\.dataset\.submitLabel/);
	assert.match(source, /reference\s*\|\|\s*body\.requestId/);
});

test('no tracked help template retains a legacy external form embed', () => {
	const files = fs.readdirSync(path.join(root, 'templates')).filter((file) => /^(help-|returns_exchanges|shipping-protection-requests).*\.mvt$/i.test(file));
	for (const file of files) {
		const source = fs.readFileSync(path.join(root, 'templates', file), 'utf8');
		assert.doesNotMatch(source, /forms\.monday\.com\/forms\/embed|developer\.livehelpnow\.net|application_secret/i, file);
	}
});
