import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(async () => ({})),
  requireUser: vi.fn(),
  fetchSopoData: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/app/api/sync-utils', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/app/lead-manager/utils/sopo-utils', () => ({ fetchSopoData: mocks.fetchSopoData }));

import { GET } from '@/app/api/sopo/lookup/route';

describe('GET /api/sopo/lookup', () => {
  beforeEach(() => {
    mocks.requireUser.mockReset();
    mocks.fetchSopoData.mockReset();
    mocks.requireUser.mockResolvedValue(null);
    mocks.fetchSopoData.mockResolvedValue([]);
  });

  it('rejects unauthenticated requests before querying SOPO', async () => {
    mocks.requireUser.mockResolvedValue(
      NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    );

    const response = await GET(new Request('https://example.test/api/sopo/lookup?mgtNo=building-1'));

    expect(response.status).toBe(401);
    expect(mocks.fetchSopoData).not.toHaveBeenCalled();
  });

  it('rejects overlong lookup identifiers at the route boundary', async () => {
    const response = await GET(
      new Request(`https://example.test/api/sopo/lookup?mgtNo=${'x'.repeat(101)}`)
    );

    expect(response.status).toBe(400);
    expect(mocks.fetchSopoData).not.toHaveBeenCalled();
  });

  it('passes validated lookup parameters to the SOPO adapter', async () => {
    const response = await GET(
      new Request('https://example.test/api/sopo/lookup?mgtNo=building-1&sigunNm=%EA%B0%95%EB%82%A8%EA%B5%AC')
    );

    expect(response.status).toBe(200);
    expect(mocks.fetchSopoData).toHaveBeenCalledWith({ key: 'building-1', sigunNm: '강남구' });
  });

  it('limits repeated requests from the same client', async () => {
    const requests = Array.from({ length: 31 }, () =>
      GET(
        new Request('https://example.test/api/sopo/lookup?mgtNo=building-1', {
          headers: { 'x-forwarded-for': 'route-test-client' },
        })
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.at(-1)?.status).toBe(429);
    expect(mocks.fetchSopoData).toHaveBeenCalledTimes(30);
  });
});
