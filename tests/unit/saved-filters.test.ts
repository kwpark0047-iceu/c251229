import { describe, it, expect } from 'vitest';
import { parseFilters, addFilter, filterStorageKey } from '@/app/lead-manager/saved-filters';
const filter = { category: 'ALL', regions: ['6110000'], status: 'NEW', view: 'grid', uncontacted: false, score: false } as const;
describe('개인 저장 필터 안전 경계', () => {
  it('계정과 조직을 서로 다른 저장 공간으로 구분한다', () => {
    expect(filterStorageKey('one', 'org')).not.toBe(filterStorageKey('two', 'org'));
    expect(filterStorageKey('one', 'org')).not.toBe(filterStorageKey('one', null));
  });
  it('허용된 조건만 저장하며 검색어와 연락처를 제거한다', () => {
    const result = addFilter([], '신규 리드', { ...filter, searchQuery: 'secret@example.com', phone: '01012345678' }, 'id');
    expect(JSON.stringify(result)).not.toMatch(/secret|phone|searchQuery/);
    expect(parseFilters(JSON.stringify(result))).toEqual(result);
  });
  it('손상·잘못된 enum·빈 지역·중복 ID를 거부한다', () => {
    expect(parseFilters('{bad')).toEqual([]);
    for (const invalid of [{ ...filter, category: '__proto__' }, { ...filter, regions: [] }, { ...filter, view: 'bad' }, { ...filter, status: ['NEW'] }, { ...filter, view: ['grid'] }]) {
      expect(() => addFilter([], '조건', invalid, 'id')).toThrow();
    }
    const result = addFilter([], '조건', filter, 'id');
    expect(parseFilters(JSON.stringify([...result, ...result]))).toEqual([]);
  });
  it('이름·중복·최대 개수를 검사한다', () => {
    expect(() => addFilter([], ' ', filter, 'id')).toThrow();
    const result = addFilter([], '조건', filter, 'id');
    expect(() => addFilter(result, ' 조건 ', filter, 'two')).toThrow();
    const full = Array.from({ length: 10 }, (_, i) => ({ ...result[0], id: String(i), name: String(i) }));
    expect(() => addFilter(full, '새 조건', filter, 'new')).toThrow();
  });
});
