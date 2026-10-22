// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertContainerIdentity, assertLocalEngineEndpoint, assertRunMarker, cleanupOwnedSchema, getIsolatedDatabaseConfig, schemaIdentifier } from '../helpers/isolated-db';

const env = { RUN_ISOLATED_DB_TESTS: '1', TEST_DATABASE_PROJECT_ID: 'sopo-isolated', TEST_DATABASE_URL: 'postgresql://postgres:local-only@127.0.0.1:54322/postgres' };
describe('격리 DB 안전 경계', () => {
  it('공용 테스트 설정은 운영 환경 파일을 자동 로드하지 않는다', () => {
    const setup = readFileSync(new URL('../../vitest.setup.ts', import.meta.url), 'utf8');
    expect(setup).not.toMatch(/readFileSync|dotenv|\.env\.local/);
  });
  it('명시적 실행 승인이 없으면 연결을 구성하지 않는다', () => {
    expect(getIsolatedDatabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co' })).toBeNull();
  });
  it.each([
    'postgresql://postgres:x@production.supabase.co:54322/postgres',
    'postgresql://postgres:x@127.0.0.1.evil.invalid:54322/postgres',
    'postgresql://postgres:x@127.0.0.1:5432/postgres',
    'postgresql://postgres:x@127.0.0.1:54322/production',
    'postgresql://postgres:x@127.0.0.1:54322/postgres?host=production.supabase.co',
  ])('원격·우회·미승인 DB 주소를 거부한다: %s', url => {
    expect(() => getIsolatedDatabaseConfig({ ...env, TEST_DATABASE_URL: url })).toThrow();
  });
  it('전용 프로젝트 ID와 연결 문자열을 모두 요구한다', () => {
    expect(() => getIsolatedDatabaseConfig({ ...env, TEST_DATABASE_PROJECT_ID: 'production' })).toThrow();
    expect(() => getIsolatedDatabaseConfig({ ...env, TEST_DATABASE_URL: undefined })).toThrow();
    expect(getIsolatedDatabaseConfig(env)?.projectId).toBe('sopo-isolated');
  });
  it('실제 로컬 컨테이너 이름·라벨·포트 매핑을 검사한다', () => {
    const metadata = { Name: '/supabase_db_sopo-isolated', labels: { 'com.supabase.cli.project': 'sopo-isolated' }, ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '54322' }] } };
    expect(() => assertContainerIdentity(metadata)).not.toThrow();
    expect(() => assertContainerIdentity({ ...metadata, Name: '/supabase_db_production' })).toThrow();
    expect(() => assertContainerIdentity({ ...metadata, labels: {} })).toThrow();
    expect(() => assertContainerIdentity({ ...metadata, ports: {} })).toThrow();
  });
  it('원격 Docker 엔진과 터널 전송을 거부한다', () => {
    expect(() => assertLocalEngineEndpoint('npipe:////./pipe/dockerDesktopLinuxEngine')).not.toThrow();
    expect(() => assertLocalEngineEndpoint('unix:///var/run/docker.sock')).not.toThrow();
    expect(() => assertLocalEngineEndpoint('tcp://production.invalid:2376')).toThrow();
    expect(() => assertLocalEngineEndpoint('ssh://production.invalid')).toThrow();
  });
  it('삭제 대상은 실행별 스키마와 소유 표식이 일치할 때만 허용한다', () => {
    const id = 'a9fe46ef-3c03-4dd5-9cb8-2fd80c1163c1';
    expect(schemaIdentifier(id)).toBe('codex_test_a9fe46ef3c034dd59cb82fd80c1163c1');
    expect(() => schemaIdentifier('public;drop schema public')).toThrow();
    expect(() => assertRunMarker(id, [{ run_id: id }])).not.toThrow();
    expect(() => assertRunMarker(id, [])).toThrow();
    expect(() => assertRunMarker(id, [{ run_id: 'other' }])).toThrow();
  });
  it('소유 표식 불일치 시 DROP을 실행하지 않고 정리 실패를 전달한다', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ run_id: 'another-run' }], rowCount: 1 });
    await expect(cleanupOwnedSchema({ query, connect: vi.fn(), end: vi.fn() }, 'a9fe46ef-3c03-4dd5-9cb8-2fd80c1163c1')).rejects.toThrow('marker');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).not.toMatch(/DROP|DELETE/);
  });
  it('정확한 소유 스키마만 정리하고 제거 결과까지 확인한다', async () => {
    const id = 'a9fe46ef-3c03-4dd5-9cb8-2fd80c1163c1';
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ run_id: id }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ name: null }], rowCount: 1 });
    await cleanupOwnedSchema({ query, connect: vi.fn(), end: vi.fn() }, id);
    expect(query.mock.calls[1][0]).toBe(`drop schema "${schemaIdentifier(id)}" cascade`);
    expect(query.mock.calls[2]).toEqual(['select to_regnamespace($1)::text as name', [schemaIdentifier(id)]]);
  });
});
