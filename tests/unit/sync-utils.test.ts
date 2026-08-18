import { describe, expect, it } from 'vitest';
import { isSupabaseAuthError } from '@/app/api/sync-utils';

describe('isSupabaseAuthError', () => {
  it('recognizes invalid Supabase API key responses without exposing credentials', () => {
    expect(isSupabaseAuthError({ code: 'invalid_api_key', message: 'Invalid API key' })).toBe(true);
    expect(isSupabaseAuthError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
  });
});
