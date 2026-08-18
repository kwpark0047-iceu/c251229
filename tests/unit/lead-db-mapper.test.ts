import { describe, expect, it } from 'vitest';
import { toLeadDbRow } from '@/app/lead-manager/lead-db-mapper';
import type { Lead } from '@/app/lead-manager/types';

describe('toLeadDbRow', () => {
  it('maps SOPO application fields to the snake_case database contract', () => {
    const lead: Lead = {
      id: 'lead-1',
      bizName: '상가',
      status: 'NEW',
      sopoBizesId: 'sopo-1',
      sopoBizName: 'SOPO 상가',
      sopoRoadAddress: '서울시 강남구 테헤란로 1',
      sopoProvinceCode: '11',
      sopoStdYm: '202608',
    };

    const row = toLeadDbRow(lead, 'org-1');

    expect(row.sopo_bizes_id).toBe('sopo-1');
    expect(row.sopo_biz_name).toBe('SOPO 상가');
    expect(row.sopo_road_address).toBe('서울시 강남구 테헤란로 1');
    expect(row.sopo_province_code).toBe('11');
    expect(row.sopo_std_ym).toBe('202608');
    expect('sopoBizesId' in row).toBe(false);
  });
});
