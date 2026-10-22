import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

const WEB_ROOTS = ['src', 'public'];
const WEB_FILES = ['package.json', 'package-lock.json', '.npmrc', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json'];
export const VERCEL_IGNORE = ['/*', ...WEB_ROOTS.flatMap(p => [`!/${p}/`, `!/${p}/**`]), ...WEB_FILES.map(p => `!/${p}`), '**/.env*', '**/*.test.*', '**/*.spec.*', '**/*.pem', '**/*.log', '**/*.tar', ''].join('\n');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function assertScriptOnlyPackage(actual, baseline, additions) {
  const expected = { ...baseline, scripts: { ...baseline.scripts, ...additions } };
  if (!isDeepStrictEqual(actual, expected)) throw Error('Only reviewed script additions are allowed in package.json');
}

export function assertCandidateFiles(actual, baseline, overlays) {
  validateEntries(actual); validateEntries(baseline); validateEntries(overlays);
  const approved = new Map(baseline.filter(x => !/^(\.agents|\.omo)\//.test(x.path)).map(x => [x.path, x.sha256]));
  for (const entry of overlays) approved.set(entry.path, entry.sha256);
  if (actual.length !== approved.size || actual.some(x => approved.get(x.path) !== x.sha256)) throw Error('Unreviewed candidate inventory');
}

export function npmCliPath(executable, exists) {
  const dir = path.dirname(executable);
  const found = [path.join(dir, 'node_modules/npm/bin/npm-cli.js'), path.resolve(dir, '../lib/node_modules/npm/bin/npm-cli.js')].find(exists);
  if (!found) throw Error('Approved npm CLI not found');
  return found;
}

export function assertFileNames(names, entries) {
  const expected = entries.map(x => x.path).sort();
  if (!isDeepStrictEqual([...names].sort(), expected)) throw Error('Unlisted candidate file');
}

export function assertSafeOutputTree(directory, children) {
  for (const entry of children(directory)) {
    if (entry.link) {
      if (!entry.internal) throw Error('External generated output link is forbidden');
    } else if (entry.directory) assertSafeOutputTree(path.join(directory, entry.name), children);
  }
}

export function validateEntries(entries) {
  if (!Array.isArray(entries) || !entries.length) throw Error('Empty baseline');
  const seen = new Set();
  for (const entry of entries) {
    const p = entry.path;
    if (typeof p !== 'string' || !p || /[\\:\x00-\x1f]/.test(p) || p.startsWith('/') || p.split('/').some(s => !s || s === '.' || s === '..')
      || seen.has(p.toLowerCase()) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Unsafe or duplicate manifest entry');
    seen.add(p.toLowerCase());
  }
}

export function isDeployablePath(p) {
  try { validateEntries([{ path: p, sha256: '0'.repeat(64) }]); } catch { return false; }
  if (p.split('/').some(s => s.startsWith('.env')) || /\.(?:test|spec)\.[^/]+$|\.(?:pem|log|tar)$/.test(p)) return false;
  return WEB_FILES.includes(p) || WEB_ROOTS.some(prefix => p.startsWith(prefix + '/'));
}

export function verifyEntries(entries, read) {
  validateEntries(entries);
  for (const entry of entries) if (sha256(read(entry.path)) !== entry.sha256) throw Error('Baseline file mismatch: ' + entry.path);
}

export function assertCronDisabled(config) {
  if (!Array.isArray(config.crons) || config.crons.length !== 0) throw Error('Cron must be explicitly disabled');
}

export function isolatedEnvironment(parent) {
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HOME', 'CI']) if (parent[key] !== undefined) env[key] = parent[key];
  return { ...env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54999', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-smoke-not-a-real-key', NEXT_TELEMETRY_DISABLED: '1' };
}

export function assertBaseline(record) {
  if (record.version !== 1 || record.projectId !== 'prj_RIVAmMIalvSUfp0tBweZuywMsawj' || record.teamId !== 'team_IqyqQQiqVwrCHZUNqDUuDQaO'
    || record.deploymentId !== 'dpl_HLk4z6AoFknUZeMBrUedFL9wK6Sr' || record.sourceDirectory !== 'tmp/presence-release-20261020'
    || record.sourceManifestSha256 !== '5245c6d3e2dfa6e9abbdb08dad8f37a49715534b5c5429e1e3c17f66c76f835b') throw Error('Unreviewed release identity');
  validateEntries(record.files);
  if (record.filesSha256 !== '3c06fea9b7e5a2975aadf294c42876e97bcf11cf3d1f691cc2b6a89e30b91893' || sha256(JSON.stringify(record.files)) !== record.filesSha256) throw Error('Baseline file list changed');
}
