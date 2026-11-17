// @vitest-environment node
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { z } = require('zod');
const parserRequire = createRequire(require.resolve('@typescript-eslint/typescript-estree'));
const { minimatch, Minimatch } = parserRequire('minimatch');
const { satisfies } = require('semver');
const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));

describe('development dependency security boundaries', () => {
  it.each([
    ['follow-redirects', '>=1.16.2'],
    ['vite', '>=8.2.4 <9'],
    ['vitest', '>=4.1.12 <5'],
    ['@vitest/mocker', '>=4.1.12 <5'],
    ['zod', '>=4.6.6 <5'],
  ])('locks a patched %s release', (name, range) => {
    expect(satisfies(lock.packages[`node_modules/${name}`].version, range)).toBe(true);
  });

  it('replaces only the affected modern minimatch branch', () => {
    const modern = Object.entries(lock.packages).filter(([name, entry]) =>
      name.endsWith('/minimatch') && Number((entry as { version: string }).version.split('.')[0]) >= 7);
    expect(modern.length).toBeGreaterThan(0);
    for (const [, entry] of modern) {
      expect(satisfies((entry as { version: string }).version, '>=11.0.1')).toBe(true);
    }
    expect(lock.packages['node_modules/minimatch'].version).toMatch(/^3\./);
    expect(lock.packages['node_modules/readdir-glob/node_modules/minimatch'].version).toMatch(/^5\./);
  });

  it('rejects oversized constrained collections without validating every item', () => {
    const result = z.array(z.string()).max(2).safeParse(Array(20).fill(0));
    expect(result.success).toBe(false);
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0].code).toBe('too_big');
  });

  it('preserves ordinary collection validation', () => {
    expect(z.array(z.string()).max(2).safeParse(['one', 'two']).success).toBe(true);
    expect(z.array(z.string()).max(2).safeParse([0]).success).toBe(false);
  });

  it('preserves the TypeScript parser CommonJS glob API and dotfiles', () => {
    expect(minimatch('src/.generated/file.ts', 'src/**/*.ts', { dot: true })).toBe(true);
    expect(minimatch('src/file.js', 'src/**/*.ts', { dot: true })).toBe(false);
    expect(new Minimatch('**/*.ts', { dot: true }).match('src/file.ts')).toBe(true);
  });
});
