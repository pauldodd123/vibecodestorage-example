// Node.js 24+, npm install vibecodestorage@0.1.4
// Keep this module on your backend. Never serve .private/ or return credentials.
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { VibeCodeStorage } from 'vibecodestorage';

export async function openStore({ file = resolve('.private/store.json'), endpoint = 'https://api.vibecodestorage.com' } = {}) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  // A separate lock prevents simultaneous starts from allocating different stores.
  // A crash leaves the lock in place: do not guess whether another process is alive.
  const lockPath = file + '.lock';
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Storage setup is already running or was interrupted. Keep the saved credentials and pending request; remove only the lock after confirming no setup process is running.'); throw error; }
  const pendingPath = file + '.pending';
  async function load(path) { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Cannot read private storage state. Preserve it; do not create a replacement store.'); } }
  async function save(path, value) {
    const temporary = path + '.' + randomUUID() + '.tmp';
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, path);
  }
  try {
    const credentials = await load(file);
    if (credentials) return new VibeCodeStorage(credentials);
    let pending = await load(pendingPath);
    if (!pending) { pending = VibeCodeStorage.createRequest({ endpoint }); await save(pendingPath, pending); }
    // SDK retries one uncertain transport failure using these same secrets.
    // A 429/503 exits setup visibly. Never start a background provisioning loop.
    const { store } = await VibeCodeStorage.create({ endpoint, creationRequest: pending });
    await save(file, store.credentials);
    await unlink(pendingPath);
    return store;
  } finally { await lock.close(); await unlink(lockPath); }
}
