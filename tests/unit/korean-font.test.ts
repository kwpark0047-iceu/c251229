import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    const license = readFileSync(resolve('src/app/fonts/OFL-NotoSansKR.txt'), 'utf8');
    expect(license).toContain('SIL OPEN FONT LICENSE');
  });
});
