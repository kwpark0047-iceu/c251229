// @vitest-environment node
import { readFileSync } from 'node:fs';
import ignore from 'ignore';
import { describe, expect, it } from 'vitest';

describe('배포 파일 및 부모 디렉터리 탐색 정책', () => {
  const policy = readFileSync(new URL('../../.vercelignore', import.meta.url), 'utf8');
  it.each(['src', 'src/app', 'src/app/page.tsx', 'src/lib/member-status-error.ts',
    'public', 'public/logo.svg', 'package.json', 'package-lock.json', 'next.config.ts', 'vercel.json'])('%s는 부모 탐색부터 허용한다', file => {
    const filter = ignore().add(policy);
    const parts = file.split('/');
    for (let end = 1; end <= parts.length; end++) expect(filter.ignores(parts.slice(0, end).join('/'))).toBe(false);
  });
  it.each(['tmp', 'config', 'scripts', 'tests', '.local-state', '.env.local',
    'src/.env.production', 'src/a.test.ts', 'src/a.spec.tsx', 'public/key.pem', 'public/log.log'])('%s는 업로드하지 않는다', file => {
    expect(ignore().add(policy).ignores(file)).toBe(true);
  });
});
