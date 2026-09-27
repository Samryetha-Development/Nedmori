import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApiServer } from './server.mjs';

let server;
let origin;
before(async () => {
  server = createApiServer({ storePath: null });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test('health and submission lifecycle', async () => {
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  const created = await fetch(`${origin}/api/submissions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pid: 1002, language: 'Python 3', code: 'print(3)' }),
  });
  assert.equal(created.status, 201);
  const record = await created.json();
  assert.equal(record.status, 'Pending');
  const list = await (await fetch(`${origin}/api/submissions?problemId=1002`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].code, 'print(3)');
});

test('rejects invalid submissions', async () => {
  const response = await fetch(`${origin}/api/submissions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pid: 9999, language: 'Python 3', code: '' }),
  });
  assert.equal(response.status, 400);
});

test('renders problem markdown with KaTeX and Shiki on the server', async () => {
  const response = await fetch(`${origin}/api/problems/1002/rendered`);
  assert.equal(response.status, 200);
  const rendered = await response.json();
  assert.match(rendered.markdown, /```text/);
  assert.match(rendered.html, /class="katex"/);
  assert.match(rendered.html, /class="shiki/);
  assert.match(rendered.html, /data-copy=/);
  const basic = await (await fetch(`${origin}/api/problems/1001/rendered`)).json();
  assert.match(basic.markdown, /\$a\$/);
  assert.match(basic.markdown, /\$b\$/);
  assert.match(basic.html, /class="katex"/);
});
