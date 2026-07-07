const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../src/app');

async function withServer(run) {
  const server = createServer();

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  return {
    response,
    body: text ? JSON.parse(text) : null,
  };
}

test('supports contact CRUD and search', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, '/contacts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Johnson',
        phone: '555-0100',
        email: 'alice@example.com',
      }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.name, 'Alice Johnson');

    const contactId = created.body.data.id;

    const fetched = await requestJson(baseUrl, `/contacts/${contactId}`);
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.data.phone, '555-0100');

    const updated = await requestJson(baseUrl, `/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ phone: '555-0199' }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.phone, '555-0199');

    const search = await requestJson(baseUrl, '/contacts?q=alice');
    assert.equal(search.response.status, 200);
    assert.equal(search.body.data.length, 1);
    assert.equal(search.body.data[0].id, contactId);

    const deleted = await fetch(`${baseUrl}/contacts/${contactId}`, {
      method: 'DELETE',
    });
    assert.equal(deleted.status, 204);

    const missing = await requestJson(baseUrl, `/contacts/${contactId}`);
    assert.equal(missing.response.status, 404);
  });
});

test('validates required fields and malformed json', async () => {
  await withServer(async (baseUrl) => {
    const invalid = await requestJson(baseUrl, '/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: '', phone: '' }),
    });

    assert.equal(invalid.response.status, 400);
    assert.deepEqual(invalid.body.errors, ['name is required.', 'phone is required.']);

    const malformed = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    });

    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: 'Invalid JSON body.' });
  });
});
