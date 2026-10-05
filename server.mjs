import http from 'node:http';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { VibeCodeStorage } from 'vibecodestorage';

process.umask(0o077);
const here = dirname(fileURLToPath(import.meta.url));
const credentialsPath = resolve(process.env.VCS_CREDENTIALS_FILE || resolve(here, '.private/store.json'));
let store;
try { store = new VibeCodeStorage(JSON.parse(await readFile(credentialsPath, 'utf8'))); }
catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Cannot read the saved store. Keep the credential file and fix it; do not create a replacement store.');
  await mkdir(dirname(credentialsPath), { recursive: true, mode: 0o700 });
  // Reserve the local file before provisioning so simultaneous starts cannot create two stores.
  const file = await open(credentialsPath, 'wx', 0o600);
  try {
    ({ store } = await VibeCodeStorage.create({ endpoint: process.env.VCS_ENDPOINT || 'https://api.vibecodestorage.com' }));
    await file.writeFile(JSON.stringify(store.credentials) + '\n');
  } catch (error) {
    if (store) await store.destroy().catch(() => {});
    await unlink(credentialsPath).catch(() => {});
    throw error;
  } finally { await file.close(); }
}
const runId = randomUUID();
const port = Number(process.env.PORT || 3210);
const defaults = { project: 'My next idea', theme: 'forest', nextStep: 'Make the first useful thing.' };
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
let expectedHost;
const server = http.createServer(async (req, res) => {
  const reply = (status, value, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'" });
    res.end(type === 'application/json' ? JSON.stringify(value) : value);
  };
  if (req.headers.host !== expectedHost) { reply(403, { error: 'Open the printed localhost URL.' }); return; }
  try {
    if (req.method === 'GET' && files[req.url]) {
      const [file, type] = files[req.url]; reply(200, await readFile(resolve(here, 'public', file)), type); return;
    }
    if (req.method === 'GET' && req.url === '/api/settings') {
      try { const entry = await store.getEntry('project-desk'); reply(200, { settings: entry.value, version: entry.version, runId, restored: true }); }
      catch (error) { if (error.status !== 404) throw error; reply(200, { settings: defaults, version: 0, runId, restored: false }); }
      return;
    }
    if (req.method === 'POST' && req.url === '/api/settings') {
      if (req.headers.origin !== 'http://' + expectedHost) { reply(403, { error: 'Origin not allowed.' }); return; }
      if ((req.headers['content-type'] || '').split(';')[0] !== 'application/json') { reply(415, { error: 'JSON required.' }); return; }
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) { reply(413, { error: 'Keep your settings small.' }); return; } chunks.push(chunk); }
      let input; try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { reply(400, { error: 'Invalid JSON.' }); return; }
      const { project, theme, nextStep, version } = input || {};
      if (typeof project !== 'string' || !project.trim() || project.length > 80 || !['forest', 'sand', 'night'].includes(theme) ||
          typeof nextStep !== 'string' || nextStep.length > 300 || !Number.isSafeInteger(version) || version < 0) {
        reply(400, { error: 'Check the project name, theme and next step.' }); return;
      }
      const result = await store.set('project-desk', { project: project.trim(), theme, nextStep: nextStep.trim() }, { version });
      reply(200, { version: result.version }); return;
    }
    reply(404, { error: 'Not found.' });
  } catch (error) {
    const status = [409, 413, 429, 503].includes(error.status) ? error.status : 502;
    reply(status, { error: status === 409 ? 'Another window saved first. Reload before saving again.' : 'Storage is unavailable or a pilot limit was reached. Please retry later.' });
  }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
expectedHost = '127.0.0.1:' + server.address().port;
console.log('Project Desk ready at http://' + expectedHost);
console.log('Credentials stay in .private/store.json. Stop with Ctrl+C, then run npm start again to verify persistence.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
