import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 인코딩 손상(모지바케) 재발 방지 테스트
 * - 한글이 한자(CJK)나 호환 자모로 바뀌거나, 한글/기호 앞에 '?'가 붙은 줄이 있으면 실패합니다.
 * - 과거 ProposalForm.tsx 등에서 UI 문구가 이런 형태로 깨져 배포되었습니다.
 */
const ROOT = join(__dirname, '..', '..');
const TARGET_DIRS = ['src', 'scripts', 'tests'];
const SKIP = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'playwright-report', 'tmp', 'release']);
const EXT = /\.(ts|tsx|js|mjs|cjs|sql|md|json)$/;
const SELF = 'tests/unit/encoding-guard.test.ts';
const GARBLED = /[㄰-㆏一-鿿豈-﫿�]|\?[^\x00-\x7F]/;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full);
    return EXT.test(name) ? [full] : [];
  });
}

describe('인코딩 손상 방지', () => {
  it('소스 파일에 모지바케(깨진 한글) 줄이 없다', () => {
    const offenders: string[] = [];
    for (const dir of TARGET_DIRS) {
      for (const file of listFiles(join(ROOT, dir))) {
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        if (rel === SELF) continue;
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (GARBLED.test(line)) offenders.push(`${rel}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
