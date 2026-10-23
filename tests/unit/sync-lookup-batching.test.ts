// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
vi.mock('@/lib/geocoding', () => ({ geocodeAddress: vi.fn() }));
vi.mock('@/app/lead-manager/utils', () => ({ findNearestStation: vi.fn() }));
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

describe('공공데이터 중복 조회 URL 크기', () => {
  it('한글 관리번호 500건을 URL 제한 내에서 빠짐없이 조회한다', async () => {
    const urls: string[] = [];
    const leads = Array.from({ length: 500 }, (_, index) => ({
      mgt_no: `GG_CLINIC_합성의원(${index})_경기도합성도로${index}번길`,
      biz_name: `합성의원${index}`, latitude: 37.5, longitude: 127,
    }));
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!init?.method || init.method === 'GET') {
        urls.push(url);
        if (url.length > 6000) return new Response('Bad Request', { status: 400 });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const client = createClient('http://127.0.0.1:54999', 'synthetic-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    });
    const result = await upsertLeadsByMgtNo(client, leads);
    expect(result.error).toBeNull();
    expect(result.savedCount).toBe(500);
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.every(url => url.length <= 6000)).toBe(true);
    for (const lead of leads) expect(urls.some(url => new URL(url).searchParams.get('mgt_no')?.includes(lead.mgt_no))).toBe(true);
  });

  it('관리번호 하나가 제한을 넘으면 외부 요청·쓰기 전에 중단한다', async () => {
    const fetcher = vi.fn();
    const client = createClient('http://127.0.0.1:54999', 'synthetic-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    });
    const result = await upsertLeadsByMgtNo(client, [{ mgt_no: '가'.repeat(2000) }]);
    expect(result.error?.message).toContain('관리번호');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
