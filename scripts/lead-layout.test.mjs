import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('card actions have a dedicated wrapping layout and explicit labels', () => {
  const source = read('src/app/lead-manager/components/GridView.tsx');
  assert.match(source, /styles\.cardActions/);
  assert.match(source, /통화 기록/);
  assert.match(source, /상가 조회/);
  const css = read('src/app/lead-manager/components/lead-actions.module.css');
  assert.match(css, /auto-fit/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
});
test('header reserves natural height for both navigation and toolbar', () => {
  const source = read('src/app/lead-manager/page.tsx');
  const header = source.match(/<header className=.*$/m)?.[0] || '';
  assert.doesNotMatch(header, /\bh-(14|16)\b/);
  assert.match(source, /flex flex-wrap items-center justify-between min-h-16/);
});

