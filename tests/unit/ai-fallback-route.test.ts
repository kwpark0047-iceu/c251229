// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { AIAnalysis } from '../../src/app/api/ai-proposal/generate/route';

// R18: 기존 외부 API skip은 fetch mock 자체를 검사했고 경로/스키마도 달랐다.
// 실제 /api/ai-proposal/generate의 HTTP 공급자 오류는 200 + provider:template이다.
// 템플릿 생성기는 mock하지 않아 리드 필드 매핑과 실제 분석 내용을 검증한다.
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), createClient: vi.fn(), auth: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/app/api/sync-utils', () => ({ requireSyncAuth: mocks.auth }));
const lead = {
  id: 'lead-1', biz_name: 'Test Clinic', medical_subject: '내과', category: 'HEALTH',
  road_address: '서울 강남구 테헤란로 123', phone: '02-000-0000', nearest_station: '강남',
  station_lines: ['2', '신분당'], station_distance: 250, nearest_exit_no: '3',
};
function request(body: unknown = { leadId: lead.id }) {
  return new NextRequest('http://localhost/api/ai-proposal/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.resetModules();
  vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
  vi.stubEnv('OPENAI_BASE_URL', 'https://provider.example.test/v1');
  vi.stubEnv('OPENAI_MODEL', 'test-model');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(() => { throw new Error('Unexpected provider request'); });
  mocks.auth.mockResolvedValue({ orgId: 'org-1', role: 'member', errorResponse: null });
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'leads') throw new Error(`Unexpected table: ${table}`);
    return { select: mocks.select };
  });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: lead, error: null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function expectTemplate(body: { success: boolean; leadId: string; provider: string; analysis: AIAnalysis }) {
  expect(body).toMatchObject({ success: true, leadId: lead.id, provider: 'template', analysis: {
    businessOverview: { name: lead.biz_name, type: lead.medical_subject, address: lead.road_address, phone: lead.phone },
    stationAnalysis: { station: lead.nearest_station, lines: lead.station_lines },
    recommendation: { suggestedStations: [lead.nearest_station] },
  } });
  expect(body.analysis.businessOverview.summary).toContain(lead.biz_name);
  expect(body.analysis.stationAnalysis.distance).toContain('250m');
  expect(body.analysis.stationAnalysis.distance).toContain('3번');
  expect(body.analysis.recommendation.mediaTypes.length).toBeGreaterThan(0);
  expect(body.analysis.expectedEffects.length).toBeGreaterThan(0);
  expect(body.analysis.summary).toContain(lead.biz_name);
}

describe('Actual AI provider fallback route', () => {
  it('R18 returns real template analysis after provider HTTP failure', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('billing unavailable', { status: 500 }));
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expectTemplate(await response.json());
    expect(mocks.eq.mock.calls).toEqual([['id', lead.id], ['organization_id', 'org-1']]);
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith('https://provider.example.test/v1/chat/completions', expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-openai-key' } }));
    const payload = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(payload.model).toBe('test-model');
    expect(payload.messages[1].content).toContain(lead.biz_name);
    expect(payload.messages[1].content).toContain(lead.road_address);
    expect(payload.response_format).toEqual({ type: 'json_object' });
  });
  it('returns parsed provider analysis with provider=openai', async () => {
    const analysis = {
      businessOverview: { name: 'Provider Clinic', type: 'Clinic', address: 'Seoul', phone: '02', summary: 'Overview' },
      stationAnalysis: { station: 'Gangnam', lines: ['2'], trafficEstimate: 'Busy', characteristics: 'Offices', distance: '250m', recommendation: 'Local reach' },
      marketAnalysis: { competitors: ['Clinic'], demandLevel: 'High', targetCustomers: 'Workers', seasonality: 'Year-round', strengths: ['Local'], opportunities: ['Commute'] },
      recommendation: { mediaTypes: ['Poster'], suggestedStations: ['Gangnam'], budgetPlan: 'Monthly', contractTip: 'Six months' },
      expectedEffects: ['Awareness'], summary: 'Provider analysis',
    };
    mocks.fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: JSON.stringify(analysis) } }] }));
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, analysis, leadId: lead.id, provider: 'openai' });
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it('uses the template without provider access when no key is configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expectTemplate(await response.json());
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([
    ['empty choices', { choices: [] }],
    ['malformed content JSON', { choices: [{ message: { content: 'not JSON' } }] }],
  ])('uses template for %s', async (_label, upstream) => {
    mocks.fetch.mockResolvedValueOnce(Response.json(upstream));
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expectTemplate(await response.json());
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('returns 500 for a thrown transport error (not the HTTP-error fallback branch)', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Connection refused'));
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'AI 상권분석 생성 중 오류가 발생했습니다.' });
  });
  it('does not call the provider when the organization-scoped lead is absent', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: '리드를 찾을 수 없습니다.' });
    expect(mocks.eq.mock.calls).toEqual([['id', lead.id], ['organization_id', 'org-1']]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('propagates auth denial without database/provider access', async () => {
    mocks.auth.mockResolvedValueOnce({ orgId: null, role: null, errorResponse: NextResponse.json({ success: false, error: 'Denied' }, { status: 401 }) });
    const { POST } = await import('../../src/app/api/ai-proposal/generate/route');
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Denied' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
