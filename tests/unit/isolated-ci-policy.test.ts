// @vitest-environment node
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
describe('격리 CI 설정', () => {
  it('워크플로가 운영 Supabase 비밀값을 사용하지 않는다', () => {
    const workflow = read('.github/workflows/ci.yml');
    expect(workflow).not.toContain('secrets.NEXT_PUBLIC_SUPABASE');
    expect(workflow).toContain('playwright.isolated.config.ts');
    expect(workflow).toContain('http://127.0.0.1:54999');
    expect(workflow).toContain('RUN_ISOLATED_DB_TESTS:');
    expect(workflow).toContain('TEST_DATABASE_PROJECT_ID: sopo-isolated');
    expect(workflow).toContain('needs: [lint, type-check, test, isolated-db, e2e, local-tools]');
    expect(workflow).toContain('name: Local Tool Contracts (No Docker Access)');
    expect(workflow).toContain('node --test scripts/local-vector.test.mjs scripts/release-safety.test.mjs');
    expect(read('vitest.config.mts')).toContain("'scripts/**'");
  });
  it('브라우저 서버는 기존 서버와 운영 환경 파일을 재사용하지 않는다', () => {
    expect(read('playwright.isolated.config.ts')).toContain('reuseExistingServer: false');
    const launcher = read('scripts/run-isolated-smoke.mjs');
    expect(launcher).toContain("name.startsWith('.env')");
    expect(launcher).not.toContain('...process.env');
    expect(launcher).toContain('http://127.0.0.1:54999');
    expect(launcher).toContain("'start', '--hostname'");
  });
  it('예약 작업은 0건이다', () => {
    expect(JSON.parse(read('vercel.json')).crons).toEqual([]);
  });
  it('환경 파일이 있으면 Next 프로세스를 시작하기 전에 거부한다', () => {
    const directory = mkdtempSync(join(tmpdir(), 'isolated-smoke-'));
    const file = join(directory, '.env.local');
    writeFileSync(file, 'SYNTHETIC_VALUE=not-a-secret');
    try {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/run-isolated-smoke.mjs', import.meta.url))], {
        cwd: directory, encoding: 'utf8', timeout: 10000, windowsHide: true,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('checkout without environment files');
      expect(result.stderr).not.toContain('not-a-secret');
    } finally {
      unlinkSync(file);
      rmdirSync(directory);
    }
  });
});
