import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { PROJECT, NAME, IMAGE, IMAGE_ID, assertEndpoint, assertContainer, assertProjectConfig, assertApprovedPipeline, rewriteConfig, createArgs, replaceWithRollback } from './lib/local-vector.mjs';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const project = path.join(root, 'tmp', PROJECT);
const stateRoot = path.join(root, '.local-state', 'vector', PROJECT);
const dockerBinary = process.platform === 'win32' ? 'docker.exe' : 'docker';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let context;

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 8 * 1024 * 1024, ...options });
  if (result.status !== 0) throw Error(`Command failed: ${path.basename(binary)} ${args[0] || ''}`);
  return result.stdout || '';
}
const dockerArgs = args => context ? ['--context', context, ...args] : args;
const docker = (args, options) => run(dockerBinary, dockerArgs(args), options);
const inspect = id => JSON.parse(docker(['inspect', id]))[0];

function noLinks(directory) {
  const relative = path.relative(root, directory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Path is outside the repository');
  let cursor = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw Error('Linked state/project paths are not permitted');
  }
}

function guard() {
  noLinks(project); noLinks(stateRoot); noLinks(path.join(project, 'supabase', 'config.toml'));
  const config = fs.readFileSync(path.join(project, 'supabase', 'config.toml'), 'utf8');
  assertProjectConfig(config);
  if (JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).crons?.length !== 0) throw Error('Cron must remain disabled');
  if (process.env.DOCKER_HOST) assertEndpoint(process.env.DOCKER_HOST);
  context = docker(['context', 'show']).trim();
  assertEndpoint(JSON.parse(docker(['context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}'])));
}

function cliStart(log) {
  const env = { ...process.env, DOCKER_CONTEXT: context };
  for (const key of Object.keys(env)) if (/SUPABASE_|DATABASE_URL|API_KEY|CRON_SECRET|DOCKER_HOST/.test(key)) delete env[key];
  const args = ['start', '--workdir', project];
  let binary = 'supabase';
  if (process.platform === 'win32') {
    const entry = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'supabase', 'dist', 'supabase.js');
    if (!fs.existsSync(entry)) throw Error('Supabase Node CLI entry not found; install the approved CLI first');
    binary = process.execPath; args.unshift(entry);
  }
  const fd = fs.openSync(log, 'wx', 0o600);
  try { run(binary, args, { env, timeout: 300000, stdio: ['ignore', fd, fd] }); }
  finally { fs.closeSync(fd); }
}

async function healthy(id) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = inspect(id); assertContainer(x, 'vector');
    if (x.State.Running && x.State.Health?.Status === 'healthy') return x;
    await pause(2000);
  }
  throw Error('Vector health check timed out');
}

function compliant(x, config) {
  const mounts = x.Mounts || [];
  return x.Image === IMAGE_ID && x.State.Running && x.State.Health?.Status === 'healthy'
    && x.HostConfig.RestartPolicy.Name === 'unless-stopped'
    && x.Config.Entrypoint?.[0] === 'vector'
    && !x.Config.Env.some(value => value.startsWith('DOCKER_HOST='))
    && mounts.length === 2
    && mounts.some(m => m.Source === '/var/run/docker.sock' && m.Destination === '/var/run/docker.sock' && !m.RW)
    && mounts.some(m => m.Destination === '/etc/vector/vector.yaml' && !m.RW && m.Type === 'bind')
    && config === rewriteConfig(config);
}

function metrics(id) {
  const query = '{ sinks { edges { node { componentId metrics { sentEventsTotal { sentEventsTotal } } } } } }';
  const result = JSON.parse(docker(['exec', id, 'wget', '-qO-', '--header=Content-Type: application/json',
    '--post-data=' + JSON.stringify({ query }), 'http://127.0.0.1:9001/graphql']));
  if (result.errors || !result.data?.sinks) throw Error('Vector metric query failed');
  return Object.fromEntries(result.data.sinks.edges.map(({ node }) => [node.componentId, node.metrics.sentEventsTotal?.sentEventsTotal || 0]));
}

function delivered(marker) {
  if (!/^vector-probe-[a-f0-9-]+$/.test(marker)) throw Error('Invalid probe marker');
  const db = inspect(`supabase_db_${PROJECT}`); assertContainer(db, 'db');
  const sql = query => docker(['exec', db.Id, 'psql', '-U', 'supabase_admin', '-d', '_supabase', '-v', 'ON_ERROR_STOP=1', '-Atc', query]).trim();
  const tables = sql("select table_name from information_schema.tables where table_schema='_analytics' and table_name like 'log_events_%'").split(/\s+/).filter(Boolean);
  if (!tables.length || tables.some(name => !/^log_events_[a-f0-9_]+$/.test(name))) throw Error('Unknown local Analytics tables');
  return sql('select exists (' + tables.map(name => `select 1 from _analytics.${name} t where strpos(row_to_json(t)::text, '${marker}') > 0`).join(' union all ') + ')') === 't';
}

function probe(marker) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port: 54321, path: `/auth/v1/health?vector_probe=${marker}`, agent: false }, response => {
      response.resume(); response.on('end', () => response.statusCode === 200 ? resolve() : reject(Error('Local health probe failed')));
    });
    request.setTimeout(5000, () => request.destroy(Error('Local health probe timed out')));
    request.on('error', () => reject(Error('Local health probe failed')));
  });
}

async function verify(id) {
  const first = await healthy(id);
  assertContainer(inspect(`supabase_kong_${PROJECT}`), 'kong');
  assertContainer(inspect(`supabase_analytics_${PROJECT}`), 'analytics');
  const before = metrics(id).logflare_kong || 0;
  const marker = 'vector-probe-' + randomUUID();
  const child = spawn(dockerBinary, dockerArgs(['exec', id, 'vector', 'tap', '--url', 'http://127.0.0.1:9001/graphql',
    '--quiet', '--inputs-of', 'logflare_kong', '--duration-ms', '8000']), { windowsHide: true });
  let output = '';
  child.stdout.on('data', bytes => { output = (output + bytes).slice(-1024 * 1024); });
  child.stderr.on('data', () => {});
  const done = new Promise(resolve => { child.on('error', () => resolve(-1)); child.on('exit', resolve); });
  let timer;
  try {
    await pause(1500);
    await probe(marker);
    const code = await Promise.race([done, new Promise(resolve => { timer = setTimeout(() => resolve(-1), 15000); })]);
    if (code !== 0 || !output.includes(marker)) throw Error('Synthetic log was not observed at the sink');
    let sent = before;
    for (let i = 0; i < 10 && sent <= before; i++) { await pause(1000); sent = metrics(id).logflare_kong || 0; }
    const last = inspect(id);
    if (sent <= before || !last.State.Running || last.State.Health?.Status !== 'healthy' || last.RestartCount !== first.RestartCount) throw Error('Log delivery or restart stability check failed');
    let received = false;
    for (let i = 0; i < 15 && !received; i++) { received = delivered(marker); if (!received) await pause(2000); }
    if (!received) throw Error('Synthetic marker was not stored by isolated Analytics');
    return { healthy: true, restarts: last.RestartCount, markerObserved: true, destinationConfirmed: true, sentEventsBefore: before, sentEventsAfter: sent };
  } finally { clearTimeout(timer); child.kill(); }
}

export async function main(command) {
  if (!['plan', 'start', 'repair', 'verify'].includes(command)) throw Error('Usage: node scripts/local-supabase.mjs [plan|start|repair|verify]');
  guard();
  fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
  const lockPath = path.join(stateRoot, 'repair.lock');
  const lock = fs.openSync(lockPath, 'wx', 0o600);
  const runId = randomUUID();
  const runDir = path.join(stateRoot, runId);
  try {
    fs.mkdirSync(runDir, { mode: 0o700 });
    if (command === 'start') cliStart(path.join(runDir, 'supabase-start.log'));
    assertContainer(inspect(`supabase_db_${PROJECT}`), 'db');
    const old = inspect(NAME); assertContainer(old, 'vector');
    if (old.Image !== IMAGE_ID) throw Error('Unknown Vector image; review/pin the new image before repair');
    const sourcePath = path.join(runDir, 'original.yaml');
    docker(['cp', `${old.Id}:/etc/vector/vector.yaml`, sourcePath]);
    fs.chmodSync(sourcePath, 0o600);
    const source = fs.readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
    assertApprovedPipeline(source);
    const safe = compliant(old, source);
    if (command === 'plan') return { action: safe ? 'noop' : 'replace', project: PROJECT };
    if (command === 'verify' && !safe) throw Error('Vector is not compliant; run repair explicitly');
    if (safe) return { changed: false, id: old.Id, ...await verify(old.Id) };
    const target = path.join(runDir, 'vector.yaml');
    fs.writeFileSync(target, rewriteConfig(source), { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(path.join(runDir, 'original-container.json'), JSON.stringify(old, null, 2), { flag: 'wx', mode: 0o600 });
    docker(['run', '--rm', '--network', 'none', '--entrypoint', 'vector', '--mount', `type=bind,source=${target},target=/etc/vector/vector.yaml,readonly`, IMAGE,
      'validate', '--no-environment', '/etc/vector/vector.yaml']);
    const backup = `${NAME}-saved-${runId.slice(0, 12)}`;
    const result = await replaceWithRollback({
      preserve: async () => {
        docker(['update', '--restart=no', old.Id]);
        docker(['stop', '--timeout', '15', old.Id]);
        docker(['rename', old.Id, backup]);
      },
      create: async () => docker(createArgs(target, runId)).trim(),
      recoverCreated: async () => {
        const ids = docker(['ps', '-aq', '--filter', `label=io.codex.vector-repair=${runId}`]).trim().split(/\s+/).filter(Boolean);
        if (!ids.length) return undefined;
        if (ids.length !== 1) throw Error('Ambiguous repair ownership');
        const x = inspect(ids[0]); assertContainer(x, 'vector');
        if (x.Config.Labels['io.codex.vector-repair'] !== runId) throw Error('Unknown replacement');
        return x.Id;
      },
      start: async id => { docker(['start', id]); },
      verify,
      discard: async id => {
        const x = inspect(id); assertContainer(x, 'vector');
        if (x.Config.Labels['io.codex.vector-repair'] !== runId) throw Error('Refusing to remove an unowned container');
        docker(['rm', '--force', id]);
      },
      restore: async () => {
        const x = inspect(old.Id);
        if (x.Name === `/${backup}`) docker(['rename', old.Id, NAME]);
        else if (x.Name !== `/${NAME}`) throw Error('Original container identity changed');
        const policy = old.HostConfig.RestartPolicy;
        if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(policy.Name)) throw Error('Unknown original restart policy');
        docker(['update', '--restart=' + policy.Name + (policy.Name === 'on-failure' && policy.MaximumRetryCount ? ':' + policy.MaximumRetryCount : ''), old.Id]);
        if (old.State.Running || old.State.Restarting) docker(['start', old.Id]);
      },
    });
    return { changed: true, preservedContainer: backup, ...result };
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3) { console.error('Only one fixed command is allowed'); process.exitCode = 1; }
  else main(process.argv[2] || 'plan').then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
