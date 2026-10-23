import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { snapshotSource, compareSnapshots } from './lib/source-snapshot.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-snapshot-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'vercel.json'), '{"crons":[]}');
  fs.writeFileSync(path.join(root, 'src', 'page.tsx'), 'original');
  return root;
}

test('snapshots are deterministic and exclude secrets, tests and local artifacts', t => {
  const root = fixture(t);
  for (const name of ['.env.local', 'key.pem', 'page.test.tsx']) fs.writeFileSync(path.join(root, 'src', name), 'secret');
  fs.mkdirSync(path.join(root, '.local-state'));
  fs.writeFileSync(path.join(root, '.local-state', 'key.json'), 'secret');
  const first = snapshotSource(root);
  assert.deepEqual(first, snapshotSource(root));
  assert.deepEqual(first.files.map(x => x.path), ['src/page.tsx', 'vercel.json']);
  assert.match(first.digest, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(first).includes('secret'), false);
});

test('comparison distinguishes additions, changes and removals', t => {
  const root = fixture(t), before = snapshotSource(root);
  fs.unlinkSync(path.join(root, 'src', 'page.tsx'));
  fs.writeFileSync(path.join(root, 'src', 'new.ts'), 'new');
  fs.writeFileSync(path.join(root, 'vercel.json'), '{"crons":[],"framework":"nextjs"}');
  assert.deepEqual(compareSnapshots(before, snapshotSource(root)), {
    added: ['src/new.ts'], changed: ['vercel.json'], removed: ['src/page.tsx'],
  });
});

test('enabled cron cannot become a valid snapshot', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'vercel.json'), '{"crons":[{"path":"/api/cron","schedule":"* * * * *"}]}');
  assert.throws(() => snapshotSource(root));
});

test('tampered snapshot and traversal entries are rejected', t => {
  const good = snapshotSource(fixture(t));
  assert.throws(() => compareSnapshots({ ...good, digest: '0'.repeat(64) }, good));
  assert.throws(() => compareSnapshots({ ...good, files: [{ path: '../secret', sha256: 'a'.repeat(64) }] }, good));
});

test('linked source directories are rejected', t => {
  const root = fixture(t), external = fixture(t);
  fs.symlinkSync(path.join(external, 'src'), path.join(root, 'src', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => snapshotSource(root), /link/i);
});
