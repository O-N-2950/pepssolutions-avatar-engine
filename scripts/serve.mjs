import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../packages/demo-app/dist/', import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.webm': 'video/webm', '.mp4': 'video/mp4',
};

export function releaseIdentity(env) {
  const railway = env.RAILWAY_GIT_COMMIT_SHA;
  const explicit = env.GIT_SHA;
  const valid = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
  if (railway !== undefined) {
    if (!valid(railway) || (explicit !== undefined && (!valid(explicit) || explicit.toLowerCase() !== railway.toLowerCase()))) {
      return { sha: null, source: null };
    }
    return { sha: railway.toLowerCase(), source: 'RAILWAY_GIT_COMMIT_SHA' };
  }
  return valid(explicit) ? { sha: explicit.toLowerCase(), source: 'GIT_SHA' } : { sha: null, source: null };
}

function reply(res, code, body, method, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(method === 'HEAD' ? undefined : body);
}

export function createApp({ root = defaultRoot, env = process.env } = {}) {
  return createServer(async (req, res) => {
    const method = req.method || 'GET';
    if (!['GET', 'HEAD'].includes(method)) {
      res.setHeader('Allow', 'GET, HEAD');
      reply(res, 405, 'Method not allowed', method);
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { reply(res, 400, 'Invalid request path', method); return; }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) {
      reply(res, 400, 'Invalid request path', method);
      return;
    }
    let actualRoot;
    let index;
    try {
      actualRoot = await realpath(root);
      index = await realpath(resolve(actualRoot, 'index.html'));
      if (!index.startsWith(actualRoot + sep) || !(await stat(index)).isFile()) throw new Error('Missing index');
    } catch { reply(res, 503, JSON.stringify({ status: 'unavailable', sha: null, reason: 'ASSETS_UNAVAILABLE' }), method, 'application/json; charset=utf-8'); return; }

    if (pathname === '/health') {
      const identity = releaseIdentity(env);
      reply(res, identity.sha ? 200 : 503,
        JSON.stringify({ status: identity.sha ? 'ok' : 'unavailable', sha: identity.sha, source: identity.source }),
        method, 'application/json; charset=utf-8');
      return;
    }

    try {
      let target;
      const requested = resolve(actualRoot, '.' + pathname);
      if (requested !== actualRoot && !requested.startsWith(actualRoot + sep)) { reply(res, 400, 'Invalid request path', method); return; }
      try {
        target = await realpath(requested);
        if (target !== actualRoot && !target.startsWith(actualRoot + sep)) { reply(res, 404, 'Not found', method); return; }
        if (!(await stat(target)).isFile()) target = index;
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
        if (extname(pathname)) { reply(res, 404, 'Not found', method); return; }
        target = index;
      }
      const metadata = await stat(target);
      res.writeHead(200, {
        'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': metadata.size,
        'Cache-Control': target === index ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      });
      if (method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(target);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch {
      if (res.headersSent) res.destroy();
      else reply(res, 500, 'Asset unavailable', method);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = createApp();
  server.listen(port, '0.0.0.0', () => process.stdout.write(`Avatar server listening on ${port}\n`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
}
