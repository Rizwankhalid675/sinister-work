const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'sd2-v2-components.js'), 'utf8');
const match = source.match(/\/\* BEGIN SD2 HELP FORMS \*\/([\s\S]*?)\/\* END SD2 HELP FORMS \*\//);
assert.ok(match, 'the deployed V2 component bundle must contain the help-form controller');
const context = { module: { exports: {} }, exports: {}, URL, URLSearchParams, console, setTimeout, clearTimeout };
vm.runInNewContext(match[1], context);
const { buildSalesPayload, sendSalesInquiry, HelpFormError } = context.module.exports;

test('builds the public Sales Inquiry payload without internal routing fields', () => {
  const payload = buildSalesPayload({
    name: ' Riley ', email: ' Riley@Example.com ', phone: ' 916-555-0142 ',
    itemSku: ' SD-01 ', question: ' Help me choose. ', website: '', issue: 'tampered',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    name: 'Riley', email: 'riley@example.com', phone: '916-555-0142',
    itemSku: 'SD-01', question: 'Help me choose.', website: '',
  });
});

test('returns the request reference after a successful submission', async () => {
  const calls = [];
  const result = await sendSalesInquiry('/api/help-forms/sales-inquiry', { name: 'Riley' }, async (...args) => {
    calls.push(args);
    return { ok: true, status: 201, json: async () => ({ ok: true, reference: 'req_123' }) };
  });
  assert.equal(result.ok, true);
  assert.equal(result.requestId, 'req_123');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers['Content-Type'], 'application/json');
});

test('surfaces server field errors without discarding the request reference', async () => {
  await assert.rejects(
    sendSalesInquiry('/api/help-forms/sales-inquiry', {}, async () => ({
      ok: false, status: 422,
      json: async () => ({ ok: false, reference: 'req_bad', fields: { email: 'Enter your email.' } }),
    })),
    (error) => error instanceof HelpFormError
      && error.requestId === 'req_bad'
      && error.errors.email === 'Enter your email.'
  );
});

test('uses the fallback message when the endpoint is unavailable', async () => {
  await assert.rejects(
    sendSalesInquiry('/api/help-forms/sales-inquiry', {}, async () => { throw new TypeError('network'); }),
    (error) => error instanceof HelpFormError && /backup form/i.test(error.message)
  );
});

test('treats a missing relay route as unavailable instead of a field validation error', async () => {
  await assert.rejects(
    sendSalesInquiry('/api/help-forms/sales-inquiry', {}, async () => ({
      ok: false,
      status: 404,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    })),
    (error) => error instanceof HelpFormError
      && /backup form/i.test(error.message)
      && !/highlighted fields/i.test(error.message)
  );
});
