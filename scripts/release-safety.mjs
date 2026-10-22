import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { assertBaseline, assertCronDisabled, verifyEntries, isDeployablePath, isolatedEnvironment, sha256, VERCEL_IGNORE, assertScriptOnlyPackage, assertCandidateFiles, npmCliPath, assertFileNames, assertSafeOutputTree } from './lib/release-policy.mjs';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const overlays = ['.vercelignore', '.gitignore', 'package.json', '.github/workflows/ci.yml', 'tests/unit/isolated-ci-policy.test.ts', 'vitest.config.mts', 'release/baseline.json',
  'scripts/lib/release-policy.mjs', 'scripts/release-safety.mjs', 'scripts/release-safety.test.mjs',
  'scripts/lib/local-vector.mjs', 'scripts/local-supabase.mjs', 'scripts/local-vector.test.mjs'];
const addedScripts = {
  'release:check': 'node scripts/release-safety.mjs check',
  'release:prepare': 'node scripts/release-safety.mjs prepare',
  'release:verify': 'node scripts/release-safety.mjs verify',
  'test:local-tools': 'node --test scripts/local-vector.test.mjs scripts/release-safety.test.mjs',
};

function readRegular(base, rel) {
  let cursor = base;
  if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('Linked source root is forbidden');
  for (const part of rel.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('Linked release path is forbidden: ' + rel);
  }
  if (!fs.statSync(cursor).isFile()) throw Error('Not a regular file: ' + rel);
  return fs.readFileSync(cursor);
}

function baseline() {
  const record = JSON.parse(readRegular(root, 'release/baseline.json'));
  assertBaseline(record);
  return record;
}

function check(base) {
  const record = JSON.parse(readRegular(base, 'release/baseline.json'));
  assertBaseline(record);
  assertCronDisabled(JSON.parse(readRegular(base, 'vercel.json')));
  if (readRegular(base, '.vercelignore').toString().replaceAll('\r\n', '\n') !== VERCEL_IGNORE) throw Error('Deployment allowlist differs from policy');
  const pkg = JSON.parse(readRegular(base, 'package.json'));
  for (const [name, value] of Object.entries(addedScripts)) if (pkg.scripts[name] !== value) throw Error('Missing local tool command: ' + name);
  return record;
}

export function candidatePath(name) {
  if (!/^release-safety-[a-z0-9-]{1,64}$/.test(name || '')) throw Error('Use a new release-safety-<name> directory');
  const tmp = path.join(root, 'tmp');
  if (fs.lstatSync(tmp).isSymbolicLink()) throw Error('Linked tmp directory is forbidden');
  const target = path.join(tmp, name);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error('Linked candidate is forbidden');
  return target;
}

function packageOnlyScripts(base, source) {
  const actual = JSON.parse(readRegular(base, 'package.json'));
  const expected = JSON.parse(readRegular(source, 'package.json'));
  assertScriptOnlyPackage(actual, expected, addedScripts);
}

function deploymentFiles(base) {
  const result = [];
  const visit = (dir, prefix = '') => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix + item.name;
      if (item.isSymbolicLink()) throw Error('Linked web source is forbidden');
      if (item.isDirectory()) visit(path.join(dir, item.name), rel + '/');
      else if (isDeployablePath(rel)) result.push(rel);
    }
  };
  for (const dir of ['src', 'public']) visit(path.join(base, dir), dir + '/');
  for (const rel of ['package.json', 'package-lock.json', '.npmrc', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json']) {
    if (fs.existsSync(path.join(base, rel))) result.push(rel);
  }
  return result.sort();
}

function verifyCandidate(target, record) {
  check(target);
  const source = path.join(root, record.sourceDirectory);
  verifyEntries(record.files, rel => readRegular(source, rel));
  const manifest = JSON.parse(readRegular(target, 'release/candidate.json'));
  if (manifest.baselineDeployment !== record.deploymentId) throw Error('Wrong candidate baseline');
  assertCandidateFiles(manifest.files, record.files, overlays.map(rel => ({ path: rel, sha256: sha256(readRegular(root, rel)) })));
  const names = [];
  const walk = (dir, prefix = '') => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix + item.name;
      if (item.isSymbolicLink()) throw Error('Unexpected candidate link');
      if (!prefix && ['node_modules', '.next', '.next-e2e', '.next-admin-isolated', 'coverage', 'test-results', 'playwright-report'].includes(item.name)) {
        if (!item.isDirectory()) throw Error('Unexpected generated file type');
        if (item.name !== 'node_modules') assertSafeOutputTree(path.join(dir, item.name), p => fs.readdirSync(p, { withFileTypes: true }).map(x => {
          const link = x.isSymbolicLink();
          const resolved = link ? fs.realpathSync(path.join(p, x.name)) : '';
          const internal = link && ['node_modules', '.next', '.next-e2e', '.next-admin-isolated'].some(name => resolved.startsWith(path.join(target, name) + path.sep));
          return { name: x.name, link, internal, directory: x.isDirectory() };
        }));
        continue;
      }
      if (rel === 'release/candidate.json' || rel === 'tsconfig.tsbuildinfo') continue;
      if (item.isDirectory()) walk(path.join(dir, item.name), rel + '/');
      else names.push(rel);
    }
  };
  walk(target);
  assertFileNames(names, manifest.files);
  verifyEntries(manifest.files, rel => readRegular(target, rel));
  const approved = new Map(record.files.map(entry => [entry.path, entry.sha256]));
  const actual = deploymentFiles(target);
  const expected = record.files.map(entry => entry.path).filter(isDeployablePath).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Unreviewed deployment file added or removed');
  for (const rel of actual) {
    if (rel === 'package.json') continue;
    if (sha256(readRegular(target, rel)) !== approved.get(rel)) throw Error('Unreviewed application change: ' + rel);
  }
  packageOnlyScripts(target, source);
  return { target, baseline: record.deploymentId, webFiles: actual.length, localToolsExcluded: true, crons: 0 };
}

function prepare(name) {
  const record = check(root);
  const source = path.join(root, record.sourceDirectory);
  verifyEntries(record.files, rel => readRegular(source, rel));
  packageOnlyScripts(root, source);
  const target = candidatePath(name);
  if (fs.existsSync(target)) throw Error('Candidate already exists; it will not be overwritten');
  fs.mkdirSync(target);
  const names = new Set();
  for (const entry of record.files) {
    if (/^(\.agents|\.omo)\//.test(entry.path)) continue;
    names.add(entry.path);
    const dest = path.join(target, entry.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, readRegular(source, entry.path), { flag: 'wx' });
  }
  for (const rel of overlays) {
    fs.mkdirSync(path.dirname(path.join(target, rel)), { recursive: true });
    fs.writeFileSync(path.join(target, rel), readRegular(root, rel));
    names.add(rel);
  }
  fs.writeFileSync(path.join(target, 'release/candidate.json'), JSON.stringify({
    baselineDeployment: record.deploymentId,
    files: [...names].sort().map(rel => ({ path: rel, sha256: sha256(readRegular(target, rel)) })),
  }, null, 2));
  return verifyCandidate(target, record);
}

export async function dependencyHash(directory) {
  const files = [];
  const base = fs.realpathSync(directory);
  const visit = (dir, prefix = '') => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name), rel = prefix + item.name;
      if (['.vite', '.cache'].includes(item.name)) {
        if (item.isSymbolicLink()) throw Error('Linked dependency cache is forbidden');
        if (item.isDirectory()) assertSafeOutputTree(file, p => fs.readdirSync(p, { withFileTypes: true }).map(x => ({
          name: x.name, link: x.isSymbolicLink(), directory: x.isDirectory(),
          internal: x.isSymbolicLink() && fs.realpathSync(path.join(p, x.name)).startsWith(base + path.sep),
        })));
        continue;
      }
      if (item.isSymbolicLink()) {
        const resolved = fs.realpathSync(file);
        if (!resolved.startsWith(base + path.sep)) throw Error('Dependency link escapes isolated modules');
        files.push({ path: rel, sha256: sha256(fs.readlinkSync(file)) });
      } else if (item.isDirectory()) visit(file, rel + '/');
      else files.push({ path: rel, file });
    }
  };
  visit(directory);
  let cursor = 0;
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (cursor < files.length) {
      const entry = files[cursor++];
      if (entry.file) { entry.sha256 = sha256(await fs.promises.readFile(entry.file)); delete entry.file; }
    }
  }));
  return sha256(JSON.stringify(files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)));
}

function safeDirectory(rel) {
  let cursor = root;
  for (const part of rel.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor)) {
      if (fs.lstatSync(cursor).isSymbolicLink() || !fs.statSync(cursor).isDirectory()) throw Error('Unsafe state/log directory');
    } else fs.mkdirSync(cursor);
  }
  return cursor;
}

async function installDependencies(target, npm, env, logs) {
  const modules = path.join(target, 'node_modules');
  const state = safeDirectory('.local-state/releases/' + path.basename(target));
  const stamp = path.join(state, 'dependencies.json');
  if (fs.existsSync(modules)) {
    if (fs.lstatSync(modules).isSymbolicLink() || fs.realpathSync(modules) !== modules) throw Error('Shared node_modules is forbidden');
    const saved = JSON.parse(readRegular(root, path.relative(root, stamp).split(path.sep).join('/')));
    if (saved.candidate !== path.basename(target) || saved.sha256 !== await dependencyHash(modules)) throw Error('Dependencies changed; preserve them and prepare a new candidate');
    return saved.sha256;
  }
  // 이 후보가 소유한 의존성만 재설치하며 lifecycle script는 실행하지 않습니다.
  const fd = fs.openSync(path.join(logs, 'install.log'), 'wx', 0o600);
  let result;
  try { result = spawnSync(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: target, env, stdio: ['ignore', fd, fd], timeout: 600000, windowsHide: true }); }
  finally { fs.closeSync(fd); }
  if (result.status !== 0) throw Error('Isolated npm ci failed; inspect install.log');
  if (fs.lstatSync(modules).isSymbolicLink() || fs.realpathSync(modules) !== modules) throw Error('Unexpected installed dependency root');
  const digest = await dependencyHash(modules);
  if (fs.existsSync(stamp) && (fs.lstatSync(stamp).isSymbolicLink() || !fs.statSync(stamp).isFile())) throw Error('Unsafe dependency stamp');
  const temporary = stamp + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify({ candidate: path.basename(target), sha256: digest }), { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, stamp);
  return digest;
}

async function verifyUnlocked(name) {
  const record = baseline();
  const target = candidatePath(name);
  const summary = verifyCandidate(target, record);
  if (fs.readdirSync(target).some(p => p.startsWith('.env') && p !== '.env.example')) throw Error('Environment files are forbidden in candidate');
  const logs = safeDirectory('tmp/' + path.basename(target) + '-logs/' + randomUUID());
  const npm = npmCliPath(process.execPath, fs.existsSync);
  const temp = safeDirectory('.local-state/tmp');
  const installEnv = { ...isolatedEnvironment(process.env), npm_config_cache: safeDirectory('.local-state/npm-cache'), TEMP: temp, TMP: temp };
  const dependencies = await installDependencies(target, npm, installEnv, logs);
  const require = createRequire(path.join(target, 'package.json'));
  const local = require('dotenv').parse(readRegular(root, 'tmp/sopo-isolated/.env.local'));
  const url = new URL(local.DB_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.port !== '54322' || url.pathname !== '/postgres' || url.username !== 'postgres' || url.search || url.hash) throw Error('Only isolated DB is allowed');
  const env = { ...installEnv, RUN_ISOLATED_DB_TESTS: '1', TEST_DATABASE_PROJECT_ID: 'sopo-isolated', TEST_DATABASE_URL: local.DB_URL };
  if (process.platform === 'win32' && fs.existsSync('D:/DevCaches/playwright')) env.PLAYWRIGHT_BROWSERS_PATH = 'D:/DevCaches/playwright';
  const steps = [['type-check', ['run', 'type-check']], ['lint', ['run', 'lint']], ['local-tools', ['run', 'test:local-tools']],
    ['test', ['run', 'test', '--', '--reporter=dot', '--maxWorkers=1', '--pool=threads']], ['build', ['run', 'build']],
    ['browser', ['exec', '--', 'playwright', 'test', '--config', 'playwright.isolated.config.ts', '--project=chromium']]];
  const results = [];
  for (const [step, args] of steps) {
    const fd = fs.openSync(path.join(logs, step + '.log'), 'wx', 0o600);
    let result;
    try { result = spawnSync(process.execPath, [npm, ...args], { cwd: target, env, stdio: ['ignore', fd, fd], timeout: 600000, windowsHide: true }); }
    finally { fs.closeSync(fd); }
    results.push({ step, exitCode: result.status });
    fs.writeFileSync(path.join(logs, 'results.json'), JSON.stringify({ ...summary, results }, null, 2));
    console.log(JSON.stringify(results.at(-1)));
    if (result.status !== 0) throw Error('Verification failed: ' + step + '; inspect local log');
  }
  verifyCandidate(target, record);
  if (await dependencyHash(path.join(target, 'node_modules')) !== dependencies) throw Error('Installed dependency integrity changed during verification');
  return { ...summary, verified: true, logs };
}

async function verify(name) {
  candidatePath(name);
  const directory = safeDirectory('.local-state/releases/' + name);
  const lock = path.join(directory, 'verify.lock');
  const fd = fs.openSync(lock, 'wx', 0o600);
  try { return await verifyUnlocked(name); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

async function main() {
  const [command = 'check', name, ...extra] = process.argv.slice(2);
  if (extra.length || (command === 'check' && name)) throw Error('Unexpected arguments');
  if (command === 'check') { const record = check(root); return { baseline: record.deploymentId, crons: 0, deployAllowlist: true }; }
  if (command === 'prepare') return prepare(name);
  if (command === 'inspect') return verifyCandidate(candidatePath(name), baseline());
  if (command === 'verify') return verify(name);
  throw Error('Usage: release-safety.mjs check | prepare <name> | inspect <name> | verify <name>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
