const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../index');

async function startApi(context) {
  const server = createApp().listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

function jsonRequest(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

test('health and full task lifecycle', async (context) => {
  const base = await startApi(context);
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const created = await fetch(`${base}/api/tasks`, jsonRequest('POST', { title: ' Tester API ' }));
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.equal(task.title, 'Tester API');
  assert.equal(task.completed, false);
  assert.equal(created.headers.get('location'), `/api/tasks/${task.id}`);
  const list = await fetch(`${base}/api/tasks`);
  assert.deepEqual(await list.json(), [task]);
  const detail = await fetch(`${base}/api/tasks/${task.id}`);
  assert.deepEqual(await detail.json(), task);
  const updated = await fetch(`${base}/api/tasks/${task.id}`, jsonRequest('PATCH', {
    title: 'Termine', completed: true,
  }));
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), { ...task, title: 'Termine', completed: true });
  const removed = await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const missing = await fetch(`${base}/api/tasks/${task.id}`, { method });
    assert.equal(missing.status, 404);
  }
  const emptyList = await fetch(`${base}/api/tasks`);
  assert.deepEqual(await emptyList.json(), []);
});

test('rejects invalid input and malformed JSON', async (context) => {
  const base = await startApi(context);
  for (const body of [{}, { title: ' ' }, { title: 42 }, { title: 'x'.repeat(201) },
    { title: 'Test', completed: 'false' }, { title: 'Test', id: 'custom' }, []]) {
    const response = await fetch(`${base}/api/tasks`, jsonRequest('POST', body));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  const malformed = await fetch(`${base}/api/tasks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  const oversized = await fetch(`${base}/api/tasks`, jsonRequest('POST', { title: 'x'.repeat(17000) }));
  assert.equal(oversized.status, 413);
  const created = await fetch(`${base}/api/tasks`, jsonRequest('POST', { title: 'Test' }));
  const task = await created.json();
  for (const body of [{}, { title: '' }, { completed: 1 }, { unknown: true }]) {
    const response = await fetch(`${base}/api/tasks/${task.id}`, jsonRequest('PATCH', body));
    assert.equal(response.status, 400);
  }
  const unchanged = await fetch(`${base}/api/tasks/${task.id}`);
  assert.deepEqual(await unchanged.json(), task);
  const missing = await fetch(`${base}/unknown`);
  assert.equal(missing.status, 404);
  assert.equal(typeof (await missing.json()).error, 'string');
});