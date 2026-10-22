import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

export interface IsolatedDatabaseConfig { url: string; projectId: 'sopo-isolated' }
type Environment = Record<string, string | undefined>;

export function getIsolatedDatabaseConfig(env: Environment): IsolatedDatabaseConfig | null {
  if (env.RUN_ISOLATED_DB_TESTS !== '1') return null;
  if (env.TEST_DATABASE_PROJECT_ID !== 'sopo-isolated' || !env.TEST_DATABASE_URL) {
    throw new Error('Explicit isolated database URL and sopo-isolated project are required');
  }
  let url: URL;
  try { url = new URL(env.TEST_DATABASE_URL); }
  catch { throw new Error('Invalid isolated database URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1'
    || url.port !== '54322' || url.pathname !== '/postgres' || url.username !== 'postgres'
    || url.search || url.hash) throw new Error('Only the approved loopback test database is allowed');
  return { url: env.TEST_DATABASE_URL, projectId: 'sopo-isolated' };
}

interface ContainerIdentity {
  Name: string;
  labels: Record<string, string>;
  ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
}
export function assertContainerIdentity(identity: ContainerIdentity) {
  if (identity.Name !== '/supabase_db_sopo-isolated'
    || identity.labels['com.supabase.cli.project'] !== 'sopo-isolated'
    || !identity.ports['5432/tcp']?.some(port => port.HostPort === '54322'
      && ['127.0.0.1', '0.0.0.0', '::'].includes(port.HostIp))) {
    throw new Error('Connected Docker project/port identity is not the approved isolated database');
  }
}

export function schemaIdentifier(runId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(runId)) {
    throw new Error('Invalid isolated run identifier');
  }
  return `codex_test_${runId.replaceAll('-', '')}`;
}
export function assertRunMarker(runId: string, rows: Array<{ run_id: unknown }>) {
  schemaIdentifier(runId);
  if (rows.length !== 1 || rows[0].run_id !== runId) throw new Error('Test schema ownership marker mismatch');
}

export function assertLocalEngineEndpoint(endpoint: string) {
  if (!endpoint.startsWith('npipe:////./pipe/') && !endpoint.startsWith('unix:///')) {
    throw new Error('Only a local Docker engine transport is allowed');
  }
}

export interface QueryResult { rows: Array<Record<string, unknown>>; rowCount: number | null }
export interface DatabaseClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
}
export async function cleanupOwnedSchema(db: DatabaseClient, runId: string) {
  const schema = schemaIdentifier(runId);
  const marker = await db.query(`select run_id from "${schema}".__test_run`);
  assertRunMarker(runId, marker.rows.map(row => ({ run_id: row.run_id })));
  await db.query(`drop schema "${schema}" cascade`);
  const remaining = await db.query('select to_regnamespace($1)::text as name', [schema]);
  if (remaining.rows[0]?.name !== null) throw new Error('Owned test schema cleanup was not confirmed');
}
export async function connectIsolatedDatabase(config: IsolatedDatabaseConfig): Promise<DatabaseClient> {
  getIsolatedDatabaseConfig({ RUN_ISOLATED_DB_TESTS: '1', TEST_DATABASE_PROJECT_ID: config.projectId, TEST_DATABASE_URL: config.url });
  // DB 접속 전에 로컬 엔진의 실제 컨테이너·호스트 포트 연결을 확인합니다.
  const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';
  const options = { encoding: 'utf8' as const, timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'] };
  if (process.env.DOCKER_HOST) assertLocalEngineEndpoint(process.env.DOCKER_HOST);
  const context = execFileSync(docker, ['context', 'show'], options).trim();
  const endpoint = JSON.parse(execFileSync(docker, ['context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}'], options));
  assertLocalEngineEndpoint(endpoint);
  const format = '{"Name":{{json .Name}},"labels":{{json .Config.Labels}},"ports":{{json .NetworkSettings.Ports}}}';
  const raw = execFileSync(docker, ['--context', context, 'inspect', '--format', format, 'supabase_db_sopo-isolated'], options);
  assertContainerIdentity(JSON.parse(raw));
  const { Client } = createRequire(import.meta.url)('pg') as {
    Client: new (options: { connectionString: string; connectionTimeoutMillis: number; statement_timeout: number }) => DatabaseClient;
  };
  const db = new Client({ connectionString: config.url, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    await db.connect();
    const result = await db.query("select current_database() as database, current_user as role, to_regprocedure('auth.uid()') is not null as supabase_auth");
    const row = result.rows[0];
    if (row?.database !== 'postgres' || row.role !== 'postgres' || row.supabase_auth !== true) throw new Error('Unexpected local database identity');
    return db;
  } catch (error) { await db.end(); throw error; }
}
