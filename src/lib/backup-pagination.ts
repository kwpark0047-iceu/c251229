interface BackupPage {
  data: Record<string, unknown>[] | null;
  error: unknown;
  count: number | null;
}

export async function readBackupRows(fetchPage: (from: number, to: number) => PromiseLike<BackupPage>): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let expected: number | undefined;
  do {
    const page = await fetchPage(rows.length, rows.length + 499);
    if (page.error || !Array.isArray(page.data)) throw new Error('Backup page failed');
    if (!Number.isSafeInteger(page.count) || page.count! < 0 || page.count! > 100000) throw new Error('Backup count unavailable or exceeds safe limit');
    if (expected !== undefined && page.count !== expected) throw new Error('Backup changed during export');
    expected = page.count!;
    for (const row of page.data) {
      if (!['string', 'number'].includes(typeof row.id)) throw new Error('Backup row has no stable ID');
      const id = String(row.id);
      if (!id || seen.has(id)) throw new Error('Backup has duplicate row IDs');
      seen.add(id);
    }
    if ((!page.data.length && rows.length < expected) || rows.length + page.data.length > expected) throw new Error('Backup count mismatch');
    rows.push(...page.data);
  } while (rows.length < expected);
  return rows;
}
