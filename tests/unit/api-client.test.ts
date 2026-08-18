import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, safeFetch } from '@/app/lead-manager/api-client';

describe('safeFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not retry a LocalData gateway timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'upstream timeout' }), { status: 504 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(safeFetch('/api/localdata', { maxRetries: 2 })).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
