// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// 배포 스냅샷 기준: R01-R17은 기존 skip 17개와 일대일 대응한다.
// R01: LocalData category 조회 -> 중단된 serviceId 조회의 빈 결과.
// R02: category 검증 -> 실제 필수 serviceId/regionCode/날짜 검증.
// R03: 없는 GET의 조건부 405 검사 -> 실제 OPTIONS의 허용 메서드 계약.
// R04: title/content/price -> 실제 제안서 clientInfo/topStations/budgetPlan.
// R05: 기본 제안서는 leadId를 요구하지 않음 -> generate의 leadId 필수 계약.
// R06-R07: to/proposalId/messageId -> recipientEmail/leadId/emailId (검증 전 DRAFT 저장).
// R08: stationName/lineNum 변환 없음 -> KRIC body 원형과 메타데이터.
// R09: station은 선택값 -> 전체 노선 조회.
// R10: 응답 Cache-Control 없음 -> upstream next.revalidate/tags와 응답 ttl.
// R11: backup POST는 백업 생성이 아닌 복원.
// R12: backup GET은 목록이 아닌 JSON 다운로드.
// R13: DELETE 없음 -> 화이트리스트 밖 복원 차단 및 DELETE export 부재.
// R14: 도면 GET 계약은 유효했으나 서비스 DB 경계 mock 누락 -> 서비스 mock + 노선 전달 검증.
// R15: 업로드 storage mock 누락, floor는 미사용 -> planType/sortOrder 기본값 검증.
// R16: 필수 필드 400 계약은 유효했으나 조건부 핸들러 실행 -> 직접 호출 + storage 미호출 검증.
// R17: LocalData 키 누락은 사용자 인증 401이 아닌 설정 오류 503.
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), from: vi.fn(), createClient: vi.fn(),
  requireUser: vi.fn(), requireSyncAuth: vi.fn(), send: vi.fn(), pdf: vi.fn(),
  byLine: vi.fn(), allPlans: vi.fn(), upload: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/app/api/sync-utils', () => ({ requireUser: mocks.requireUser, requireSyncAuth: mocks.requireSyncAuth }));
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock('@/app/lead-manager/proposal-service', () => ({ generateProposalPDF: mocks.pdf }));
vi.mock('@/app/floor-plans/floor-plan-service', () => ({ getFloorPlansByLine: mocks.byLine, getAllFloorPlans: mocks.allPlans }));
vi.mock('@/app/floor-plans/storage-service', () => ({ uploadFloorPlanImage: mocks.upload }));

function request(path: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/${path}`, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'localdata-test' }, body: JSON.stringify(body),
  });
}
const localParams = { serviceId: '07_24_04_P', regionCode: '6110000', startDate: '20261001', endDate: '20261019' };
const mailBody = {
  leadId: 'lead-1', recipientEmail: 'client@example.com', recipientName: 'Client',
  stationName: 'Gangnam', stationLines: ['2'], greetingMessage: '<hello>',
  inventoryItems: [{ id: 'ad-1', stationName: 'Gangnam', adType: 'Poster', locationCode: 'A1', priceMonthly: 1000000 }],
  totalPrice: 1000000, discountRate: 10, finalPrice: 900000,
};
function draftMock() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'proposal-1' }, error: null });
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  mocks.from.mockImplementation((table: string) => {
    if (table === 'proposals') return { insert, update };
    if (table === 'leads') return { update };
    throw new Error(`Unexpected table: ${table}`);
  });
  return { insert, update, eq };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.stubEnv('LOCALDATA_API_KEY', '');
  vi.stubEnv('KRIC_API_KEY', 'kric-test');
  vi.stubEnv('DATAGOKR_API_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_KRIC_API_KEY', '');
  vi.stubEnv('STATION_INFO_API_KEY', '');
  vi.stubEnv('RESEND_API_KEY', 'resend-test');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(() => { throw new Error('Unexpected network call'); });
  mocks.from.mockImplementation(() => { throw new Error('Unexpected database call'); });
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  mocks.requireUser.mockResolvedValue(null);
  mocks.requireSyncAuth.mockResolvedValue({ orgId: 'org-1', role: 'admin', errorResponse: null });
  mocks.send.mockImplementation(() => { throw new Error('Unexpected mail call'); });
  mocks.pdf.mockImplementation(() => { throw new Error('Unexpected PDF call'); });
  mocks.byLine.mockImplementation(() => { throw new Error('Unexpected floor-plan query'); });
  mocks.allPlans.mockImplementation(() => { throw new Error('Unexpected floor-plan query'); });
  mocks.upload.mockImplementation(() => { throw new Error('Unexpected storage call'); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Deployed API handler contracts (17 restored skips)', () => {
  it('R01 LocalData returns discontinued empty results rather than business rows', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('<response><totalCount>99</totalCount></response>'));
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(request('localdata', localParams));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, leads: [], totalCount: 0, message: 'localdata.go.kr 연동이 중단되었습니다.' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('R02 LocalData rejects missing required parameters before upstream access', async () => {
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(request('localdata', { ...localParams, serviceId: '' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: '필수 파라미터가 누락되었습니다.' });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('R03 LocalData exposes POST/OPTIONS, not a GET handler', async () => {
    const route = await import('../../src/app/api/localdata/route');
    expect(route).not.toHaveProperty('GET');
    const response = await route.OPTIONS();
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.text()).toBe('');
  });
  it('R04 builds the actual public proposal structure using mocked Ollama output', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ image_url: 'https://example.test/plan.png', plan_type: 'psd' }], error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== 'floor_plans') throw new Error(`Unexpected table: ${table}`);
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit })) })) })) };
    });
    mocks.fetch.mockResolvedValueOnce(Response.json({ message: { content: JSON.stringify({ purpose: ['Awareness'], expectedEffects: ['Visits'], recommendedMedia: ['Poster'] }) } }));
    const { POST } = await import('../../src/app/api/ai-proposal/route');
    const response = await POST(request('ai-proposal', { name: 'Client', company: 'Cafe', address: '서울 강남구', businessType: '음식점/카페', budget: '미정', message: '' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.proposal.clientInfo.company).toBe('Cafe');
    expect(body.proposal.purposeAnalysis.purposes).toEqual(['Awareness']);
    expect(body.proposal.recommendedMedia.mediaTypes).toEqual(['Poster']);
    expect(body.proposal.topStations).toHaveLength(2);
    expect(body.proposal.topStations[0].floorPlans).toEqual([{ imageUrl: 'https://example.test/plan.png', planType: 'PSD도면' }]);
    expect(body.proposal.budgetPlan.inputBudget).toBe('미정');
    expect(mocks.fetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.objectContaining({ method: 'POST' }));
  });
  it('R05 generate requires leadId after authentication', async () => {
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request('ai-proposal/generate', {}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'leadId가 필요합니다.' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('R06 sends a saved proposal and marks both proposal and lead sent', async () => {
    const db = draftMock();
    mocks.pdf.mockResolvedValueOnce({ success: false });
    mocks.send.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
    const { POST } = await import('../../src/app/api/send-proposal/route');
    const response = await POST(request('send-proposal', mailBody));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, emailId: 'email-1', proposalId: 'proposal-1' });
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-1', status: 'DRAFT', inventory_ids: ['ad-1'] }));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'client@example.com', html: expect.stringContaining('&lt;hello&gt;') }));
    expect(db.update.mock.calls).toEqual([[{ status: 'SENT', sent_at: expect.any(String) }], [{ status: 'PROPOSAL_SENT' }]]);
    expect(db.eq.mock.calls).toEqual([['id', 'proposal-1'], ['id', 'lead-1']]);
  });
  it('R07 rejects invalid recipientEmail after DRAFT save without sending', async () => {
    const db = draftMock();
    const { POST } = await import('../../src/app/api/send-proposal/route');
    const response = await POST(request('send-proposal', { ...mailBody, recipientEmail: 'invalid' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, message: '올바른 이메일 주소를 입력해주세요.' });
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it('R08 station-info preserves KRIC rows and reports count', async () => {
    const rows = [{ stinNm: '강남', lnCd: '2' }];
    mocks.fetch.mockResolvedValueOnce(Response.json({ header: { resultCode: '00' }, body: rows }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(request('station-info?line=2&station=강남'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: rows, line: '2', _metadata: { count: 1, ttl: 3600 } });
    expect(new URL(mocks.fetch.mock.calls[0][0]).searchParams.get('stinNm')).toBe('강남');
  });
  it('R09 station-info allows all stations when station is omitted', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ body: [] }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(request('station-info?line=2'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: [], _metadata: { count: 0 } });
    expect(new URL(mocks.fetch.mock.calls[0][0]).searchParams.has('stinNm')).toBe(false);
  });
  it('R10 station-info requests tagged one-hour Next revalidation', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ body: [] }));
    const { GET } = await import('../../src/app/api/station-info/route');
    const response = await GET(request('station-info?line=2&station=강남'));
    expect(response.status).toBe(200);
    expect((await response.json())._metadata.ttl).toBe(3600);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ next: { revalidate: 3600, tags: ['kric-station-info', 'station-강남'] } }));
  });
  it('R11 backup POST restores records without imported timestamps', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== 'leads') throw new Error(`Unexpected table: ${table}`);
      return { upsert };
    });
    const { POST } = await import('../../src/app/api/backup/route');
    const response = await POST(request('backup', { version: '1.0', data: { leads: [{ id: 'lead-1', biz_name: 'Cafe', created_at: 'old', updated_at: 'old' }] } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, results: { leads: { success: 1, failed: 0 } } });
    expect(upsert).toHaveBeenCalledExactlyOnceWith({ id: 'lead-1', biz_name: 'Cafe' }, { onConflict: 'id' });
  });
  it('R12 backup GET downloads whitelisted table data and metadata', async () => {
    const range = vi.fn().mockResolvedValue({ data: [{ id: 'lead-1' }], error: null, count: 1 });
    const order = vi.fn();
    order.mockReturnValue({ order, range });
    const select = vi.fn(() => ({ order }));
    mocks.from.mockReturnValue({ select });
    const { GET } = await import('../../src/app/api/backup/route');
    const response = await GET(request('backup?tables=leads,organizations'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="backup_\d{8}_\d{4}\.json"$/);
    expect(await response.json()).toMatchObject({ version: '1.0', tables: ['leads'], counts: { leads: 1 }, data: { leads: [{ id: 'lead-1' }] } });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('leads');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(order).toHaveBeenCalledWith('id', { ascending: true });
    expect(select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(range).toHaveBeenCalledExactlyOnceWith(0, 499);
  });
  it('backup GET refuses partial downloads after a later page fails', async () => {
    const range = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: 'lead-1' }], error: null, count: 2 })
      .mockResolvedValueOnce({ data: null, error: { message: 'sensitive database detail' }, count: null });
    const order = vi.fn();
    order.mockReturnValue({ order, range });
    mocks.from.mockReturnValue({ select: vi.fn(() => ({ order })) });
    const { GET } = await import('../../src/app/api/backup/route');
    const response = await GET(request('backup?tables=leads'));
    expect(response.status).toBe(500);
    expect(response.headers.has('Content-Disposition')).toBe(false);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive database detail');
    expect(range).toHaveBeenNthCalledWith(2, 1, 500);
  });
  it('R13 backup has no DELETE and ignores unapproved restore tables', async () => {
    const route = await import('../../src/app/api/backup/route');
    expect(route).not.toHaveProperty('DELETE');
    const response = await route.POST(request('backup', { version: '1.0', data: { organizations: [{ id: 'forbidden' }] } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, results: {} });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('R14 floor-plans GET returns line-filtered plans', async () => {
    mocks.byLine.mockResolvedValueOnce([{ id: 'plan-1', lineNumber: '2' }]);
    const { GET } = await import('../../src/app/api/floor-plans/route');
    const response = await GET(request('floor-plans?line=2'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: 'plan-1', lineNumber: '2' }] });
    expect(mocks.byLine).toHaveBeenCalledExactlyOnceWith('2');
    expect(mocks.allPlans).not.toHaveBeenCalled();
  });
  it('R15 floor-plans POST defaults planType/sortOrder without requiring floor', async () => {
    const form = new FormData();
    form.append('file', new Blob(['image'], { type: 'image/png' }), 'plan.png');
    form.append('line', '2'); form.append('station', '강남');
    mocks.upload.mockResolvedValueOnce({ success: true, floorPlan: { id: 'plan-1' }, storagePath: '2/plan.png', publicUrl: 'https://example.test/plan.png' });
    const { POST } = await import('../../src/app/api/floor-plans/route');
    const response = await POST(new NextRequest('http://localhost/api/floor-plans', { method: 'POST', body: form }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, floorPlanId: 'plan-1', storagePath: '2/plan.png', publicUrl: 'https://example.test/plan.png' });
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ name: 'plan.png', size: 5 }), '2', 'station_layout', '강남', 0);
  });
  it('R16 floor-plans rejects absent line/station without storage access', async () => {
    const form = new FormData(); form.append('file', new Blob(['image']), 'plan.png');
    const { POST } = await import('../../src/app/api/floor-plans/route');
    const response = await POST(new NextRequest('http://localhost/api/floor-plans', { method: 'POST', body: form }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing required fields' });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('R17 LocalData missing server/custom key returns configuration 503, not auth 401', async () => {
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(new NextRequest('http://localhost/api/localdata', { method: 'POST', body: JSON.stringify(localParams) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: '서버 설정 오류: API 키 사용 중단' });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('retains the formerly active invalid-parameter case using actual regionCode', async () => {
    const { POST } = await import('../../src/app/api/localdata/route');
    const response = await POST(request('localdata', { ...localParams, regionCode: null }));
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('backup propagates authentication denial without querying tables', async () => {
    mocks.requireSyncAuth.mockResolvedValueOnce({ orgId: null, role: null, errorResponse: NextResponse.json({ success: false, error: 'Denied' }, { status: 401 }) });
    const { GET } = await import('../../src/app/api/backup/route');
    const response = await GET(request('backup'));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Denied' });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
