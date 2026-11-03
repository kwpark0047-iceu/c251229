// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunkArray } from '@/lib/utils/array-utils';
import { calculateAdRoi } from '@/lib/roi-calculator';
import { logger } from '@/lib/utils/logger';

describe('순수 유틸리티 회귀 검증', () => {
  describe('chunkArray', () => {
    it('크기 단위로 나누고 마지막 조각은 남은 원소만 가진다', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
    it('빈 배열은 빈 결과를 반환한다', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });
    it('크기보다 작은 배열은 한 조각으로 유지한다', () => {
      expect(chunkArray(['a'], 10)).toEqual([['a']]);
    });
  });

  describe('calculateAdRoi', () => {
    const lead = { category: 'FOOD' } as any;
    it('SSA등급 광고는 기본 월간 노출 150만회를 사용하고 CPM을 계산한다', () => {
      const item = { description: 'SSA등급 역사', adType: '벽면', priceMonthly: 3000000 } as any;
      const r = calculateAdRoi(lead, item);
      expect(r.monthlyImpressions).toBe(1500000);
      expect(r.dailyImpressions).toBe(50000);
      expect(r.cpm).toBe(2000);
    });
    it('등급 정보가 없으면 A등급(70만회)을 기본으로 사용한다', () => {
      const item = { description: '', adType: '벽면', priceMonthly: 700000 } as any;
      expect(calculateAdRoi(lead, item).monthlyImpressions).toBe(700000);
    });
    it('조명광고는 노출을 20% 가산한다', () => {
      const item = { description: 'A등급', adType: '조명', priceMonthly: 700000 } as any;
      expect(calculateAdRoi(lead, item).monthlyImpressions).toBe(840000);
    });
  });

  describe('logger', () => {
    afterEach(() => { vi.restoreAllMocks(); });
    it('error는 환경과 무관하게 출력한다', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('오류 메시지');
      expect(spy).toHaveBeenCalledWith('오류 메시지');
    });
    it('테스트 환경에서는 log를 출력하지 않는다', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.log('정보');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
