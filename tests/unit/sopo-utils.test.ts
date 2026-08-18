import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapSopoToLead, type SopoItem } from '@/app/lead-manager/utils/sopo-utils';

const item: SopoItem = {
  bizesId: 'store-1',
  bizesNm: 'SOPO 상가',
  brchNm: '',
  indsLclsCd: 'I',
  indsLclsNm: '음식',
  indsMclsCd: 'I20',
  indsMclsNm: '한식',
  indsSclsCd: 'I20101',
  indsSclsNm: '한식당',
  ksicCd: '56111',
  ksicNm: '한식 음식점업',
  ctprvnCd: '11',
  ctprvnNm: '서울특별시',
  signguCd: '11680',
  signguNm: '강남구',
  adongCd: '11680660',
  adongNm: '역삼1동',
  ldongCd: '11680101',
  ldongNm: '역삼동',
  lnoCd: 'building-1',
  lnoMnno: 10,
  lnoSlno: '2',
  lnoAdr: '서울특별시 강남구 역삼동 10-2',
  rdnmCd: '116804166742',
  rdnm: '테헤란로',
  bldMnno: 10,
  bldSlno: '2',
  bldMngNo: 'building-management-1',
  bldNm: '테스트빌딩',
  rdnmAdr: '서울특별시 강남구 테헤란로 10',
  oldZipcd: '06234',
  newZipcd: '06234',
  dongNo: '1',
  flrNo: '2',
  hoNo: '201',
  lon: 127.0,
  lat: 37.5,
  stdrYm: '202608',
};

describe('mapSopoToLead', () => {
  it('maps real SOPO fields without replacing existing lead identity', () => {
    const result = mapSopoToLead([item], {
      id: 'lead-1',
      bizName: '기존 상호',
      status: 'CONTACTED',
      roadAddress: '기존 주소',
    });

    expect(result.id).toBe('lead-1');
    expect(result.bizName).toBe('기존 상호');
    expect(result.status).toBe('CONTACTED');
    expect(result.sopoBizesId).toBe('store-1');
    expect(result.sopoLotAddress).toBe(item.lnoAdr);
    expect(result.sopoCategoryLarge).toBe('I');
    expect(result.sopoProvinceCode).toBe('11');
    expect(result.sopoStdYm).toBe('202608');
  });

  it('rejects an empty SOPO result', () => {
    expect(() => mapSopoToLead([])).toThrow('매핑할 SOPO 데이터가 없습니다.');
  });
});

describe('fetchSopoData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed external responses instead of trusting a TypeScript cast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ header: { resultCode: '00' }, body: { items: [{ bizesId: 'store-1' }] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const { fetchSopoData } = await import('@/app/lead-manager/utils/sopo-utils');

    await expect(fetchSopoData({ key: 'building-1', serviceKey: 'test-key' })).rejects.toThrow(
      'SOPO API 응답 형식이 올바르지 않습니다.'
    );
  });
});
