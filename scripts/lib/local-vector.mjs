import { createHash } from 'node:crypto';
export const PROJECT = 'sopo-isolated';
export const NAME = `supabase_vector_${PROJECT}`;
export const IMAGE_ID = 'sha256:ca92d617e905953c3f852e7e88061f7039460e733522e3f0c21bc6ae946b2558';
export const IMAGE = `public.ecr.aws/supabase/vector@${IMAGE_ID}`;

export function assertProjectConfig(config) {
  const root = config.split(/^\s*\[/m)[0];
  const ids = [...root.matchAll(/^project_id\s*=\s*"([^"]+)"\s*$/gm)];
  if (ids.length !== 1 || ids[0][1] !== PROJECT) throw Error('Wrong isolated root project');
}

export function assertApprovedPipeline(config) {
  const text = config.replaceAll('\r\n', '\n');
  const start = text.indexOf('transforms:\n');
  const digest = createHash('sha256').update(text.slice(start)).digest('hex');
  if (start < 0 || digest !== 'c17a087900e19965c0beb68d9a5fe49147e0549bdae4f496814b30775ffb3217') {
    throw Error('Unreviewed Vector pipeline; inspect and approve before repair');
  }
}

export function assertEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint)) throw Error('Only a local Unix/named-pipe Docker engine is allowed');
}

export function assertContainer(container, kind) {
  if (!['vector', 'db', 'analytics', 'kong'].includes(kind)
    || container.Name !== `/supabase_${kind}_${PROJECT}`
    || container.Config?.Labels?.['com.supabase.cli.project'] !== PROJECT
    || container.HostConfig?.NetworkMode !== `supabase_network_${PROJECT}`
    || container.HostConfig.Privileged) throw Error('Unexpected isolated container identity');
  if (kind === 'vector' && Object.keys(container.HostConfig.PortBindings || {}).length) throw Error('Published Vector ports are not permitted');
}

export function rewriteConfig(input) {
  const text = input.replaceAll('\r\n', '\n');
  const api = /api:\n  enabled: true\n  address: (?:0\.0\.0\.0|127\.0\.0\.1):9001\n/;
  const source = /^sources:\n([\s\S]*?)(?=^transforms:)/m;
  const block = text.match(source)?.[1];
  if (!api.test(text) || !block || !/^  docker_host:\n/.test(block)
    || (block.match(/^    type: /gm) || []).length !== 1 || !block.includes('    type: docker_logs\n')) {
    throw Error('Unknown Vector configuration; refusing to rewrite');
  }
  const uris = [...text.matchAll(/^\s+uri:\s*["']?([^"'\s]+)["']?\s*$/gm)].map(match => match[1]);
  if (!uris.length || uris.some(uri => !/^http:\/\/supabase_analytics_sopo-isolated:4000\/api\/logs\?source_name=[a-zA-Z0-9._-]+$/.test(uri))) {
    throw Error('Only isolated Analytics sinks are allowed');
  }
  return text.replace(api, 'api:\n  enabled: true\n  address: 127.0.0.1:9001\n')
    .replace(source, `sources:\n  docker_host:\n    type: docker_logs\n    docker_host: unix:///var/run/docker.sock\n    include_labels:\n      - "com.supabase.cli.project=${PROJECT}"\n    exclude_containers:\n      - "${NAME}"\n\n`);
}

export function createArgs(configPath, runId) {
  if (!/^[a-zA-Z0-9-]+$/.test(runId) || /[,\r\n]/.test(configPath)) throw Error('Invalid repair path or run ID');
  return ['create', '--name', NAME, '--network', `supabase_network_${PROJECT}`, '--restart', 'unless-stopped',
    '--label', `com.supabase.cli.project=${PROJECT}`, '--label', `com.docker.compose.project=${PROJECT}`,
    '--label', `io.codex.vector-repair=${runId}`,
    '--mount', 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock,readonly',
    '--mount', `type=bind,source=${configPath},target=/etc/vector/vector.yaml,readonly`,
    '--health-cmd', 'wget --no-verbose --tries=1 --spider http://127.0.0.1:9001/health',
    '--health-interval', '10s', '--health-timeout', '2s', '--health-retries', '3',
    '--entrypoint', 'vector', IMAGE, '--config', '/etc/vector/vector.yaml'];
}

export async function replaceWithRollback(io) {
  let created;
  try {
    await io.preserve();
    created = await io.create();
    await io.start(created);
    return await io.verify(created);
  } catch {
    let rollbackFailed = false;
    if (!created && io.recoverCreated) {
      try { created = await io.recoverCreated(); } catch { rollbackFailed = true; }
    }
    if (created) { try { await io.discard(created); } catch { rollbackFailed = true; } }
    try { await io.restore(); } catch { rollbackFailed = true; }
    throw Error(rollbackFailed ? 'Vector repair failed; rollback incomplete; inspect preserved state' : 'Vector repair failed; rolled back');
  }
}
