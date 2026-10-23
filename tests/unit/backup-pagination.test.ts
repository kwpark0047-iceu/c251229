import { describe, expect, it } from 'vitest';
import { readBackupRows } from '@/lib/backup-pagination';

describe('backup pagination', () => {
  it('uses the actual returned length when the server caps requested pages', async () => {
    const rows = Array.from({ length: 7 }, (_, id) => ({ id }));
    const offsets: number[] = [];
    const result = await readBackupRows(async (from, to) => {
      offsets.push(from);
      return { data: rows.slice(from, Math.min(to + 1, from + 2)), error: null, count: rows.length };
    });
    expect(result).toEqual(rows);
    expect(offsets).toEqual([0, 2, 4, 6]);
  });
  it('rejects a failed page rather than exporting a partial backup', async () => {
    await expect(readBackupRows(async from => from === 0
      ? { data: [{ id: 1 }], error: null, count: 2 }
      : { data: null, error: { message: 'private DB error' }, count: null })).rejects.toThrow('Backup page failed');
  });
  it('rejects missing counts, changing counts, empty truncated pages and duplicate rows', async () => {
    await expect(readBackupRows(async () => ({ data: [], error: null, count: null }))).rejects.toThrow();
    await expect(readBackupRows(async from => ({ data: [{ id: from }], error: null, count: from ? 3 : 2 }))).rejects.toThrow();
    await expect(readBackupRows(async () => ({ data: [], error: null, count: 1 }))).rejects.toThrow();
    await expect(readBackupRows(async () => ({ data: [{ id: 1 }], error: null, count: 2 }))).rejects.toThrow();
  });
  it('handles empty tables and rejects rows without stable IDs', async () => {
    expect(await readBackupRows(async () => ({ data: [], error: null, count: 0 }))).toEqual([]);
    await expect(readBackupRows(async () => ({ data: [{}], error: null, count: 1 }))).rejects.toThrow();
  });
});
