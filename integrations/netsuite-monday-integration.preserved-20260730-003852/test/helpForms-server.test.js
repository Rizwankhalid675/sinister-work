const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createHelpFormsServer } = require('../helpForms/server');

const valid = {
  name: 'Riley Owner',
  email: 'riley@example.com',
  phone: '916-555-0142',
  question: 'Which intake fits?',
  website: '',
};

async function withServer(createItem, run) {
  const server = createHelpFormsServer({
    createItem,
    requestId: () => 'req_test123',
    now: () => new Date('2026-07-15T17:30:00Z'),
    logger: { error() {} },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('creates a Monday item for a valid sales inquiry', async () => {
  const calls = [];
  await withServer(async (...args) => { calls.push(args); return 'monday-secret-id'; }, async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://www.sinisterdiesel.com' },
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true, requestId: 'req_test123' });
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), ['2428283337', 'emailed_items', 'Riley Owner']);
});

test('returns field errors without calling Monday', async () => {
  let calls = 0;
  await withServer(async () => { calls += 1; }, async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 422);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.requestId, 'req_test123');
    assert.ok(body.errors.email);
  });
  assert.equal(calls, 0);
});

test('rejects unsupported routes and content types', async () => {
  await withServer(async () => 'id', async (base) => {
    const missing = await fetch(`${base}/api/help-forms/nope`, { method: 'POST' });
    assert.equal(missing.status, 404);
    const wrongType = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hello',
    });
    assert.equal(wrongType.status, 415);
  });
});

test('rejects disallowed browser origins', async () => {
  await withServer(async () => 'id', async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' },
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('returns storefront CORS headers for allowed preflight requests', async () => {
  await withServer(async () => 'id', async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'OPTIONS', headers: { origin: 'https://sinisterdiesel.com' },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://sinisterdiesel.com');
  });
});

test('rejects request bodies larger than 32 KB', async () => {
  await withServer(async () => 'id', async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...valid, question: 'x'.repeat(33000) }),
    });
    assert.equal(response.status, 413);
  });
});

test('masks Monday provider failures', async () => {
  await withServer(async () => { throw new Error('secret provider details'); }, async (base) => {
    const response = await fetch(`${base}/api/help-forms/sales-inquiry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.deepEqual(body, {
      ok: false,
      requestId: 'req_test123',
      message: 'We could not send your request right now. Please use the backup form.',
    });
  });
});
