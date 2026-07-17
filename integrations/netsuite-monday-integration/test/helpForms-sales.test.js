const test = require('node:test');
const assert = require('node:assert/strict');

const { validateSalesInquiry, toMondayItem } = require('../helpForms/sales');

const valid = {
  name: '  Riley Owner  ',
  email: '  riley@example.com ',
  phone: ' (916) 555-0142 ',
  itemSku: ' SD-INTAKE-01 ',
  question: '  Which intake fits my 2024 truck?  ',
  website: '',
};

test('normalizes a valid sales inquiry', () => {
  assert.deepEqual(validateSalesInquiry(valid), {
    ok: true,
    value: {
      name: 'Riley Owner',
      email: 'riley@example.com',
      phone: '9165550142',
      itemSku: 'SD-INTAKE-01',
      question: 'Which intake fits my 2024 truck?',
    },
  });
});

test('rejects missing required fields with field errors', () => {
  const result = validateSalesInquiry({ name: '', email: '', phone: '', question: '' });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'name', 'phone', 'question']);
});

test('rejects invalid email and phone values', () => {
  const result = validateSalesInquiry({ ...valid, email: 'wrong', phone: '12' });
  assert.equal(result.ok, false);
  assert.equal(result.errors.email, 'Enter a valid email address.');
  assert.equal(result.errors.phone, 'Enter a valid phone number.');
});

test('rejects oversize fields', () => {
  const result = validateSalesInquiry({
    ...valid,
    name: 'n'.repeat(256),
    itemSku: 's'.repeat(256),
    question: 'q'.repeat(2001),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.itemSku);
  assert.ok(result.errors.question);
});

test('silently rejects a filled honeypot', () => {
  const result = validateSalesInquiry({ ...valid, website: 'https://spam.invalid' });
  assert.deepEqual(result, { ok: false, bot: true, errors: {} });
});

test('maps a normalized inquiry to the existing Monday customer-inquiry columns', () => {
  const normalized = validateSalesInquiry(valid).value;
  assert.deepEqual(toMondayItem(normalized, new Date('2026-07-15T17:30:00Z')), {
    boardId: '2428283337',
    groupId: 'emailed_items',
    itemName: 'Riley Owner',
    columnValues: {
      label1: { index: 102 },
      email: { email: 'riley@example.com', text: 'riley@example.com' },
      phone: { phone: '9165550142', countryShortName: 'US' },
      long_text_mm0btcjw: { text: 'SD-INTAKE-01' },
      long_text8: { text: 'Which intake fits my 2024 truck?' },
      date85: { date: '2026-07-15' },
    },
  });
});
