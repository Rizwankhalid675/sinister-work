const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Sales Inquiry posts directly back to its tracked Miva page', () => {
	const page = read('templates/help-sales-inquiry.mvt');

	assert.match(page, /<form[^>]+method=["']post["']/i);
	assert.doesNotMatch(page, /<form[^>]+action=/i);
	assert.match(page, /name=["']Form_Action["'][^>]+value=["']sales-inquiry["']/i);
	assert.match(page, /name=["']contactName["']/i);
	assert.match(page, /name=["']contactEmail["']/i);
	assert.match(page, /name=["']contactPhone["']/i);
	assert.match(page, /name=["']contactItemSku["']/i);
	assert.match(page, /name=["']contactMessage["']/i);
	assert.doesNotMatch(page, /data-sales-form=|data-sd2-help-form=|data-endpoint=|\/api\/(?:forms\/submit|help-forms\/)/i);
});

test('Sales Inquiry renders safe server-returned states', () => {
	const page = read('templates/help-sales-inquiry.mvt');

	assert.match(page, /g\.status EQ 'submitted'/);
	assert.match(page, /g\.status EQ 'error'/);
	assert.match(page, /role=["']status["']/i);
	assert.match(page, /role=["']alert["']/i);
});

test('the tracked Sales page validates, sanitizes, emails, and returns status only', () => {
	const processor = read('templates/help-sales-inquiry.mvt');

	assert.match(processor, /v9_SendEmail\(l\.mail\)/);
	assert.match(processor, /v9_SendEmail\(l\.visitor_mail\)/);
	assert.match(processor, /\[Sales Inquiry\]/);
	assert.match(processor, /glosub/);
	assert.match(processor, /substring/);
	assert.match(processor, /s\.http_referer/);
	assert.match(processor, /ISNULL g\.website/);
	assert.match(processor, /g\.Form_Action EQ 'sales-inquiry'/);
	assert.match(processor, /status=submitted/);
	assert.match(processor, /status=error/);
	assert.doesNotMatch(processor, /api\.monday\.com|Bearer|email-to-board|client_secret/i);
	assert.doesNotMatch(processor, /status=(?:submitted|error)[^\n]*(?:contactName|contactEmail|contactPhone|contactMessage)/i);
});
