import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

describe('deterministic Korean font', () => {
  it('loads Korean typography locally without the Google CSS transformation', () => {
    const layout = readFileSync(resolve('src/app/layout.tsx'), 'utf8');
    expect(layout).toContain('from "next/font/local"');
    expect(layout).not.toContain('Noto_Sans_KR');
    expect(layout).toContain('src: "./fonts/NotoSansKR-Variable.woff2"');
    expect(layout).toContain('variable: "--font-noto-sans-kr"');
    expect(layout).toContain('weight: "100 900"');
  });

  it('ships a licensed WOFF2 asset rather than an external font URL', () => {
    const font = readFileSync(resolve('src/app/fonts/NotoSansKR-Variable.woff2'));
    expect(font.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(font.length).toBeGreaterThan(100_000);
    expect(createHash('sha256').update(font).digest('hex')).toBe(
      '33bfc9d4b7c8fe48d6c709218afac7982c6d463c683f162a72d9a82f4e423b32',
    );
    const license = readFileSync(resolve('src/app/fonts/OFL-NotoSansKR.txt'), 'utf8');
    expect(license).toContain('SIL OPEN FONT LICENSE');
  });
});
