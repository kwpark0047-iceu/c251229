// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// 실제 핸들러 경계만 실행한다. 기존 fetch 자체 검사/빈 캐시 검사/시간 >= 0 검사는 제거한다.
// LocalData는 좌표 변환/자동 재시도를 제공하지 않으며 현재 중단 응답 계약으로 대체한다.
// AI 성공/기존 skip 1개(R18)는 ai-fallback-route.test.ts에서 실제 generate 핸들러로 검증한다.
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), from: vi.fn(), createClient: vi.fn(), requireUser: vi.fn(), send: vi.fn(), pdf: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/app/api/sync-utils', () => ({ requireUser: mocks.requireUser }));
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock('@/app/lead-manager/proposal-service', () => ({ generateProposalPDF: mocks.pdf }));

const params = { serviceId: '07_24_04_P', regionCode: '6110000', startDate: '20261001', endDate: '20261019' };
function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'localdata-test' }, body: JSON.stringify(body) });
}
const mail = {
  leadId: 'lead-1', recipientEmail: 'client@example.com', recipientName: 'Client', stationName: 'Gangnam', stationLines: ['2'],
  greetingMessage: '<script>alert(1)</script>', inventoryItems: [], totalPrice: 100, discountRate: 0, finalPrice: 100,
};
function prepareMail() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const single = vi.fn().mockResolvedValue({ data: { id: 'proposal-1' }, error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'proposals') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })), update };
    if (table === 'leads') return { update };
    throw new Error(`Unexpected table: ${table}`);
  });
  return { update, single };
}
beforeEach(() => {
  vi.resetAllMocks(); vi.resetModules();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(() => { throw new Error('Unexpected network call'); });
  mocks.from.mockImplementation(() => { throw new Error('Unexpected database call'); });
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  mocks.requireUser.mockResolvedValue(null);
  mocks.send.mockImplementation(() => { throw new Error('Unexpected mail call'); });
  mocks.pdf.mockImplementation(() => { throw new Error('Unexpected PDF call'); });
  vi.stubEnv('LOCALDATA_API_KEY', ''); vi.stubEnv('RESEND_API_KEY', 'mail-test');
  vi.stubEnv('KRIC_API_KEY', 'kric-test'); vi.stubEnv('DATAGOKR_API_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_KRIC_API_KEY', ''); vi.stubEnv('STATION_INFO_API_KEY', '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('LocalData deployed upstream boundary', () => {
  it('discards legacy XML records because parsing is discontinued (not coordinate conversion)', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('<row><bplcNm>Cafe</bplcNm><x>200000</x><y>500000</y></row>'));
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(post('localdata', params));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, leads: [], totalCount: 0, message: 'localdata.go.kr 연동이 중단되었습니다.' });
    const url = new URL(mocks.fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://example.com/api/placeholder');
    expect(url.searchParams.get('lastModTsBgn')).toBe(params.startDate);
    expect(url.searchParams.get('resultType')).toBe('xml');
  });
  it('passes an upstream failure through without an undocumented automatic retry', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(post('localdata', params));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'API 서버 오류: 503' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects HTML error pages rather than returning success with fake business rows', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('<!DOCTYPE html><html>Unavailable</html>'));
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(post('localdata', params));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ success: false, error: 'API 서버 연결이 중단되었습니다.' });
  });
  it('signals timeout recovery with 504 and X-Retry-After instead of testing elapsed time >= 0', async () => {
    mocks.fetch.mockRejectedValueOnce(new DOMException('Timed out', 'AbortError'));
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(post('localdata', params));
    expect(response.status).toBe(504);
    expect(response.headers.get('X-Retry-After')).toBe('30');
    expect(await response.json()).toEqual({ success: false, error: '공공데이터 포털 서버(localdata.go.kr)가 현재 불안정하거나 응답하지 않습니다.' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('KRIC deployed upstream boundary', () => {
  it('normalizes a singleton body and requests tagged revalidation', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ header: { resultCode: '00' }, body: { stinNm: '강남' } }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(new NextRequest('http://localhost/api/station-info?line=2&station=강남'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: [{ stinNm: '강남' }], _metadata: { count: 1, ttl: 3600 } });
    expect(mocks.fetch).toHaveBeenCalledWith(expect.stringContaining('https://openapi.kric.go.kr/'), expect.objectContaining({ next: { revalidate: 3600, tags: ['kric-station-info', 'station-강남'] } }));
  });
  it('returns a client fallback hint for upstream HTTP failure', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('Maintenance', { status: 503 }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(new NextRequest('http://localhost/api/station-info?line=2'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: false, error: 'KRIC API 요청 실패 (503)', details: 'Maintenance', fallback_data: true });
  });
  it('identifies KRIC authentication errors even when upstream HTTP succeeds', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ header: { resultCode: '30', resultMsg: 'Invalid key' } }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(new NextRequest('http://localhost/api/station-info'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: false, error: 'KRIC API 오류: Invalid key', code: '30', is_auth_error: true });
  });
});

describe('Resend deployed handler boundary', () => {
  it('sends escaped HTML with a server-generated PDF attachment and returns emailId', async () => {
    const db = prepareMail();
    mocks.pdf.mockResolvedValueOnce({ success: true, pdfBlob: new Blob(['pdf content'], { type: 'application/pdf' }) });
    mocks.send.mockResolvedValueOnce({ data: { id: 'email-pdf' }, error: null });
    const { POST } = await import('../../src/app/api/send-proposal/route');
    const response = await POST(post('send-proposal', mail));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, emailId: 'email-pdf', proposalId: 'proposal-1' });
    expect(mocks.pdf).toHaveBeenCalledExactlyOnceWith('proposal-1');
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: mail.recipientEmail, html: expect.stringContaining('&lt;script&gt;alert(1)&lt;/script&gt;'), attachments: [{ filename: expect.stringMatching(/\.pdf$/), content: Buffer.from('pdf content').toString('base64') }] }));
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('returns provider send errors and does not mark records SENT', async () => {
    const db = prepareMail();
    mocks.pdf.mockResolvedValueOnce({ success: false });
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: 'Provider unavailable' } });
    const { POST } = await import('../../src/app/api/send-proposal/route');
    const response = await POST(post('send-proposal', mail));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, message: '이메일 발송 실패: Provider unavailable' });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
  });
  it('continues with HTML-only mail when PDF generation throws', async () => {
    const db = prepareMail();
    mocks.pdf.mockRejectedValueOnce(new Error('Renderer unavailable'));
    mocks.send.mockResolvedValueOnce({ data: { id: 'email-html' }, error: null });
    const { POST } = await import('../../src/app/api/send-proposal/route');
    const response = await POST(post('send-proposal', mail));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, emailId: 'email-html' });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: undefined, html: expect.stringContaining('/proposal/proposal-1') }));
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
