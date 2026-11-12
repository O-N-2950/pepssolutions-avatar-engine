import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createApp, releaseIdentity } from './serve.mjs';

const sha = 'a'.repeat(40);
let temp, root, server, port;
const env = { GIT_SHA: sha };

function read(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'avatar-serve-'));
  root = join(temp, 'dist');
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<html>Avatar demo</html>');
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("avatar")');
  await writeFile(join(temp, 'outside.txt'), 'must never be served');
  await symlink(join(temp, 'outside.txt'), join(root, 'linked.txt'));
  server = createApp({ root, env });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  port = server.address().port;
});

after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  if (temp) await rm(temp, { recursive: true, force: true });
});

test('health reports the complete explicit SHA as no-store JSON', async () => {
  const result = await read('/health?probe=1');
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { status: 'ok', sha, source: 'GIT_SHA' });
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('Railway GitHub SHA is authoritative and conflicts fail closed', async () => {
  env.RAILWAY_GIT_COMMIT_SHA = sha;
  assert.equal(JSON.parse((await read('/health')).body).source, 'RAILWAY_GIT_COMMIT_SHA');
  env.RAILWAY_GIT_COMMIT_SHA = 'b'.repeat(40);
  assert.equal((await read('/health')).status, 503);
  delete env.RAILWAY_GIT_COMMIT_SHA;
});

test('missing, malformed and abbreviated SHAs never produce healthy identity', async () => {
  for (const value of [undefined, '', 'abcdefg', 'a'.repeat(39), 'z'.repeat(40)]) {
    env.GIT_SHA = value;
    const response = await read('/health');
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).sha, null);
  }
  env.GIT_SHA = sha;
  assert.deepEqual(releaseIdentity({ RAILWAY_GIT_COMMIT_SHA: 'invalid', GIT_SHA: sha }), { sha: null, source: null });
});

test('existing assets retain MIME type and nested SPA routes receive index', async () => {
  const asset = await read('/assets/app.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['content-type'], /^text\/javascript/);
  assert.match(asset.body, /console.log/);
  const page = await read('/demo/voice?mode=idle');
  assert.equal(page.status, 200);
  assert.equal(page.body, '<html>Avatar demo</html>');
  assert.equal((await read('/missing.js')).status, 404);
});

test('encoded traversal, malformed paths and hidden files are rejected', async () => {
  for (const path of ['/../outside.txt', '/%2e%2e/outside.txt', '/assets/%2e%2e/%2e%2e/outside.txt', '/.env', '/%00', '/%zz', '/assets%5c..%5coutside.txt']) {
    const response = await read(path);
    assert.equal(response.status, 400, path);
    assert.ok(!response.body.includes('must never be served'));
  }
});

test('symlink outside the bundle is never served', async () => {
  const result = await read('/linked.txt');
  assert.equal(result.status, 404);
  assert.ok(!result.body.includes('must never be served'));
});

test('HEAD has no response body and non-read methods are denied', async () => {
  const head = await read('/health', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  const denied = await read('/', 'POST');
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.allow, 'GET, HEAD');
});

test('missing built index fails health even when SHA is valid', async () => {
  await rm(join(root, 'index.html'));
  const response = await read('/health');
  assert.equal(response.status, 503);
  assert.equal(JSON.parse(response.body).reason, 'ASSETS_UNAVAILABLE');
});
