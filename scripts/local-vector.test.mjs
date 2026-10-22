import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertEndpoint, assertContainer, assertProjectConfig, assertApprovedPipeline, rewriteConfig, createArgs, replaceWithRollback } from './lib/local-vector.mjs';

const config = `api:\n  enabled: true\n  address: 0.0.0.0:9001\nsources:\n  docker_host:\n    type: docker_logs\n    exclude_containers:\n      - "supabase_vector_sopo-isolated"\ntransforms:\n  keep: {}\nsinks:\n  logflare_kong:\n    uri: "http://supabase_analytics_sopo-isolated:4000/api/logs?source_name=cloudflare.logs.prod"\n`;
test('remote Docker endpoints fail closed', () => {
  for (const endpoint of ['tcp://127.0.0.1:2375', 'ssh://server', 'http://remote:2375']) assert.throws(() => assertEndpoint(endpoint));
  assertEndpoint('npipe:////./pipe/dockerDesktopLinuxEngine');
  assertEndpoint('unix:///var/run/docker.sock');
});
test('foreign projects, ports and privileged containers are refused', () => {
  const good = { Name: '/supabase_vector_sopo-isolated', Config: { Labels: { 'com.supabase.cli.project': 'sopo-isolated' } }, HostConfig: { NetworkMode: 'supabase_network_sopo-isolated', PortBindings: {}, Privileged: false } };
  assertContainer(good, 'vector');
  for (const bad of [{ ...good, Name: '/production' }, { ...good, Config: { Labels: {} } }, { ...good, HostConfig: { ...good.HostConfig, Privileged: true } }, { ...good, HostConfig: { ...good.HostConfig, PortBindings: { '9001/tcp': [{}] } } }]) assert.throws(() => assertContainer(bad, 'vector'));
});
test('config rewrite is idempotent and preserves transformations', () => {
  const result = rewriteConfig(config);
  assert.match(result, /docker_host: unix:\/\/\/var\/run\/docker.sock/);
  assert.match(result, /com.supabase.cli.project=sopo-isolated/);
  assert.match(result, /address: 127.0.0.1:9001/);
  assert.match(result, /  keep: \{\}/);
  assert.equal(rewriteConfig(result), result);
});
test('unknown sources and remote sinks are rejected', () => {
  assert.throws(() => rewriteConfig(config.replace('type: docker_logs', 'type: exec')));
  assert.throws(() => rewriteConfig(config.replace('http://supabase_analytics_sopo-isolated:4000', 'https://production.example')));
});
test('new container has read-only mounts and no published/privileged options', () => {
  const args = createArgs('D:/safe/vector.yaml', 'synthetic-run');
  assert.ok(args.includes('type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock,readonly'));
  assert.ok(!args.some(a => ['-p', '--publish', '--privileged', '--volumes-from'].includes(a)));
});
test('failed replacement restores old container without touching volumes', async () => {
  const calls = [];
  const io = Object.fromEntries(['preserve', 'create', 'start', 'verify', 'discard', 'restore'].map(name => [name, async () => { calls.push(name); if (name === 'verify') throw Error('synthetic'); return 'new-id'; }]));
  await assert.rejects(replaceWithRollback(io), /rolled back/);
  assert.deepEqual(calls, ['preserve', 'create', 'start', 'verify', 'discard', 'restore']);
});
test('failed create never removes an unknown container', async () => {
  const calls = [];
  const io = { preserve: async () => {}, create: async () => { throw Error('synthetic'); }, discard: async () => calls.push('discard'), restore: async () => calls.push('restore') };
  await assert.rejects(replaceWithRollback(io), /rolled back/);
  assert.deepEqual(calls, ['restore']);
});

test('successful replacement does not invoke rollback', async () => {
  const calls = [];
  const io = Object.fromEntries(['preserve', 'create', 'start', 'verify', 'discard', 'restore'].map(name => [name, async () => { calls.push(name); return 'verified'; }]));
  assert.equal(await replaceWithRollback(io), 'verified');
  assert.deepEqual(calls, ['preserve', 'create', 'start', 'verify']);
});

test('rollback failures are reported and restoration is still attempted', async () => {
  let restored = false;
  const io = { preserve: async () => {}, create: async () => 'owned-id', start: async () => { throw Error('failure'); },
    discard: async () => { throw Error('failure'); }, restore: async () => { restored = true; } };
  await assert.rejects(replaceWithRollback(io), /rollback incomplete/);
  assert.equal(restored, true);
});

test('mount option injection is refused', () => {
  assert.throws(() => createArgs('D:/bad,readonly=false', 'run'));
  assert.throws(() => createArgs('D:/safe.yaml', 'bad\nlabel'));
});

test('nested project IDs cannot override root identity', () => {
  assertProjectConfig('project_id = "sopo-isolated"\n[analytics]\nenabled=true');
  assert.throws(() => assertProjectConfig('project_id = "production"\n[analytics]\nproject_id = "sopo-isolated"'));
  assert.throws(() => assertProjectConfig('[analytics]\nproject_id = "sopo-isolated"'));
});

test('unreviewed pipelines including inline sinks are rejected', () => {
  assert.throws(() => assertApprovedPipeline(config));
  assert.throws(() => assertApprovedPipeline(config + '  external: {type: http, uri: "https://production.example"}\n'));
});

test('ambiguous create timeout recovers only the owned replacement before restore', async () => {
  const calls = [];
  const io = { preserve: async () => {}, create: async () => { throw Error('timeout'); },
    recoverCreated: async () => 'owned-id', discard: async id => calls.push(id), restore: async () => calls.push('restore') };
  await assert.rejects(replaceWithRollback(io), /rolled back/);
  assert.deepEqual(calls, ['owned-id', 'restore']);
});
