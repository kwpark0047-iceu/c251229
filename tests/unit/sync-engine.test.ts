import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/lead-manager/utils', () => ({ findNearestStation: vi.fn(), convertGRS80ToWGS84: vi.fn() }));
vi.mock('@/app/api/sync-utils', () => ({ upsertLeadsByMgtNo: vi.fn() }));
import { fetchGGAllPages, fetchSeoulAllPages, fetchSyncJson, getSourceList, syncSource } from '@/app/api/sync-engine';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';
const gg = { endpoint: 'https://openapi.gg.go.kr/AsembyStus', dataKey: 'AsembyStus', category: 'HEALTH', service_name: '의원', nameField: 'BIZPLC_NM', phoneField: '', envKey: 'GG_CLINIC_API_KEY', label: '경기도 의원', mgtPrefix: 'GG_CLINIC' };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('공공데이터 수집 회귀 검증', () => {
  it('saves mapped leads within the authenticated organization', async () => {
    vi.stubEnv('GG_CLINIC_API_KEY', 'clinic-key');
    vi.mocked(upsertLeadsByMgtNo).mockResolvedValue({ savedCount: 1, insertedCount: 1, updatedCount: 0, skippedCount: 0, failedCount: 0, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ AsembyStus: [{ head: [{ list_total_count: 1 }] }, { row: [{ BIZPLC_NM: '테스트 의원', REFINE_ROADNM_ADDR: '합성 주소' }] }] }))));
    const db = { from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })) };
    const result = await syncSource(db as unknown as Parameters<typeof syncSource>[0], 'gg-clinics', 'organization-a');
    expect(result.saved).toBe(1);
    expect(upsertLeadsByMgtNo).toHaveBeenLastCalledWith(db, [expect.objectContaining({ organization_id: 'organization-a', biz_name: '테스트 의원' })]);
  });
  it('bounds requests waiting for a provider response', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })));
      const pending = expect(fetchSyncJson('https://example.test', '서울 의원')).rejects.toThrow('시간이 초과');
      await vi.advanceTimersByTimeAsync(15_001);
      await pending;
    } finally { vi.useRealTimers(); }
  });
  it('never writes sync logs or leads in lookup-only mode', async () => {
    vi.stubEnv('GG_CLINIC_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ RESULT: { CODE: 'INFO-200' } }))));
    const db = { from: vi.fn(() => { throw new Error('unexpected write'); }) };
    const result = await syncSource(db as unknown as Parameters<typeof syncSource>[0], 'gg-clinics', 'org', { sync: false });
    expect(result.error).toBeUndefined(); expect(db.from).not.toHaveBeenCalled();
  });
  it('uses the documented GG KEY parameter', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ AsembyStus: [{ head: [{ list_total_count: 1 }] }, { row: [{ BIZPLC_NM: '의원' }] }] })));
    vi.stubGlobal('fetch', fetcher);
    await fetchGGAllPages(gg, 'test-key');
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get('KEY')).toBe('test-key');
    expect(url.searchParams.has('SERVICE_KEY')).toBe(false);
  });
  it('recognizes per-source keys without a shared GG key', () => {
    vi.stubEnv('GG_API_KEY', ''); vi.stubEnv('GG_CLINIC_API_KEY', 'clinic-key');
    expect(getSourceList().find(s => s.key === 'gg-clinics')?.hasKey).toBe(true);
  });
  it('rejects a failed later GG page rather than saving a partial success', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ AsembyStus: [{ head: [{ list_total_count: 2 }] }, { row: [{ BIZPLC_NM: '의원' }] }] })))
      .mockResolvedValueOnce(new Response('bad', { status: 400 })));
    await expect(fetchGGAllPages(gg, 'key', undefined, 1)).rejects.toThrow();
  });
  it('does not expose an upstream response containing credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret-key', { status: 400 })));
    const error = await fetchGGAllPages(gg, 'secret-key').catch(e => e);
    expect(error.message).not.toContain('secret-key');
  });
  it('rejects failed Seoul pages instead of reporting an empty success', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ LOCALDATA_010102: { list_total_count: 1 } })))
      .mockResolvedValueOnce(new Response('bad', { status: 500 })));
    await expect(fetchSeoulAllPages({ serviceCode: 'LOCALDATA_010102', category: 'HEALTH', service_name: '의원', label: '서울 의원', envKey: 'SEOUL_DATA_API_KEY' }, 'key')).rejects.toThrow();
  });
});
