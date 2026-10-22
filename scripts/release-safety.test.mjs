import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { dependencyHash } from './release-safety.mjs';
import { isDeployablePath, validateEntries, verifyEntries, assertCronDisabled, isolatedEnvironment, VERCEL_IGNORE, assertBaseline, sha256, assertScriptOnlyPackage, assertCandidateFiles, npmCliPath, assertFileNames, assertSafeOutputTree } from './lib/release-policy.mjs';

test('only web files are eligible for deployment', () => {
  for (const p of ['src/app/page.tsx', 'public/logo.svg', 'package-lock.json', 'next.config.ts']) assert.equal(isDeployablePath(p), true, p);
  for (const p of ['tmp/container.json', '.local-state/run/config.yaml', '.env.local', 'nested/.env.production', 'scripts/local-supabase.mjs', 'scripts/lib/local-vector.mjs', 'release/baseline.json', 'supabase/migrations/a.sql', 'docs/run.md', 'tests/e2e/a.spec.ts', 'src/a.test.ts', 'src/a.spec.tsx', '.vercel/project.json', '.next-e2e/build.js', 'backup.tar', 'backup.zip', 'key.pem', 'run.log']) assert.equal(isDeployablePath(p), false, p);
});

test('unsafe or ambiguous paths are rejected', () => {
  for (const p of ['../outside', '/absolute', 'C:/outside', 'src/../outside', 'src\\page.tsx', 'src//page.tsx']) assert.throws(() => validateEntries([{ path: p, sha256: 'a'.repeat(64) }]));
  assert.throws(() => validateEntries([{ path: 'A.ts', sha256: 'a'.repeat(64) }, { path: 'a.ts', sha256: 'a'.repeat(64) }]));
  assert.throws(() => validateEntries([{ path: 'a.ts', sha256: 'wrong' }]));
});

test('baseline verification detects missing and modified files', () => {
  verifyEntries([{ path: 'src/page.tsx', sha256: sha256('reviewed') }], () => Buffer.from('reviewed'));
  const entries = [{ path: 'src/page.tsx', sha256: 'a'.repeat(64) }];
  assert.throws(() => verifyEntries(entries, () => { throw Error('missing'); }));
  assert.throws(() => verifyEntries(entries, () => Buffer.from('tampered')));
});

test('empty manifests and malformed identity cannot be accepted', () => {
  assert.throws(() => validateEntries([]));
  assert.throws(() => validateEntries(null));
  assert.throws(() => assertBaseline({}));
});

test('package overlay permits script additions regardless of property order but no dependency changes', () => {
  const base = { scripts: { build: 'next build' }, dependencies: { next: '16.4.2' } };
  const actual = { dependencies: { next: '16.4.2' }, scripts: { check: 'node check.mjs', build: 'next build' } };
  assertScriptOnlyPackage(actual, base, { check: 'node check.mjs' });
  assert.throws(() => assertScriptOnlyPackage({ ...actual, dependencies: { next: 'other' } }, base, { check: 'node check.mjs' }));
  assert.throws(() => assertScriptOnlyPackage({ ...actual, scripts: { ...actual.scripts, extra: 'unknown' } }, base, { check: 'node check.mjs' }));
});

test('candidate inventory is anchored outside its editable manifest', () => {
  const base = [{ path: 'src/page.tsx', sha256: 'a'.repeat(64) }, { path: 'vitest.config.mts', sha256: 'b'.repeat(64) }];
  const overlay = [{ path: 'scripts/release-safety.mjs', sha256: 'c'.repeat(64) }];
  const good = [...overlay, ...base].sort((a, b) => a.path.localeCompare(b.path));
  assertCandidateFiles(good, base, overlay);
  assert.throws(() => assertCandidateFiles(good.slice(1), base, overlay));
  assert.throws(() => assertCandidateFiles(good.map(x => x.path === 'vitest.config.mts' ? { ...x, sha256: 'd'.repeat(64) } : x), base, overlay));
  assert.throws(() => assertCandidateFiles([...good, { path: 'tests/extra.ts', sha256: 'a'.repeat(64) }], base, overlay));
});

test('npm is found in Windows and Unix global layouts', () => {
  assert.match(npmCliPath(process.execPath, p => !p.includes('lib')), /npm-cli\.js$/);
  assert.match(npmCliPath(process.execPath, p => p.includes('lib')), /lib[\\/]node_modules[\\/]npm/);
  assert.throws(() => npmCliPath(process.execPath, () => false));
});

test('unlisted tests or environment files cannot enter a candidate', () => {
  const entries = [{ path: 'tests/approved.test.ts', sha256: 'a'.repeat(64) }];
  assertFileNames(['tests/approved.test.ts'], entries);
  assert.throws(() => assertFileNames(['tests/approved.test.ts', 'tests/unreviewed.test.ts'], entries));
  assert.throws(() => assertFileNames(['tests/approved.test.ts', '.env.local'], entries));
  assert.throws(() => assertFileNames([], entries));
});

test('generated output trees cannot hide linked descendants', () => {
  assertSafeOutputTree('output', () => [{ name: 'page.js', link: false, directory: false }]);
  assertSafeOutputTree('output', p => p === 'output' ? [{ name: 'cache', link: false, directory: true }] : []);
  assert.throws(() => assertSafeOutputTree('output', () => [{ name: 'cache', link: true, directory: true }]));
});

test('contained build dependency links are permitted without traversing cycles', () => {
  assertSafeOutputTree('output', () => [{ name: 'dependency', link: true, internal: true, directory: true }]);
});

test('parallel dependency fingerprint matches canonical bytes and detects modifications', async () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'release-digest-'));
  const a = path.join(dir, 'a'), b = path.join(dir, 'b');
  try {
    fs.writeFileSync(b, 'second'); fs.writeFileSync(a, 'first');
    const expected = sha256(JSON.stringify([{ path: 'a', sha256: sha256('first') }, { path: 'b', sha256: sha256('second') }]));
    assert.equal(await dependencyHash(dir), expected);
    fs.writeFileSync(a, 'changed');
    assert.notEqual(await dependencyHash(dir), expected);
  } finally { fs.unlinkSync(a); fs.unlinkSync(b); fs.rmdirSync(dir); }
});

test('dependency caches cannot redirect writes outside the isolated tree', async () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'release-cache-link-'));
  const modules = path.join(dir, 'modules'), outside = path.join(dir, 'outside');
  fs.mkdirSync(modules); fs.mkdirSync(outside);
  const marker = path.join(outside, 'sentinel'), link = path.join(modules, '.vite');
  fs.writeFileSync(marker, 'preserved');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    await assert.rejects(dependencyHash(modules), /cache|link/i);
    assert.equal(fs.readFileSync(marker, 'utf8'), 'preserved');
  } finally { fs.unlinkSync(link); fs.unlinkSync(marker); fs.rmdirSync(modules); fs.rmdirSync(outside); fs.rmdirSync(dir); }
});

test('cron must be explicitly an empty array', () => {
  assertCronDisabled({ crons: [] });
  for (const config of [{}, { crons: null }, { crons: {} }, { crons: [{ path: '/api/cron/sync' }] }]) assert.throws(() => assertCronDisabled(config));
});

test('test environment never inherits production credentials', () => {
  const env = isolatedEnvironment({ PATH: 'tools', SUPABASE_SERVICE_ROLE_KEY: 'production', DATABASE_URL: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://production', CRON_SECRET: 'production', VERCEL_TOKEN: 'production' });
  assert.equal(env.PATH, 'tools');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:54999');
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'CRON_SECRET', 'VERCEL_TOKEN']) assert.equal(env[key], undefined);
});

test('deployment exclusion file matches the reviewed policy exactly', () => {
  const root = new URL('../', import.meta.url);
  assert.equal(fs.readFileSync(new URL('.vercelignore', root), 'utf8').replaceAll('\r\n', '\n'), VERCEL_IGNORE);
});

test('baseline pins the reviewed deployment and file list', () => {
  const record = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../release/baseline.json', import.meta.url))));
  assertBaseline(record);
  assert.throws(() => assertBaseline({ ...record, deploymentId: 'unreviewed' }));
  assert.throws(() => assertBaseline({ ...record, files: record.files.slice(1) }));
});
