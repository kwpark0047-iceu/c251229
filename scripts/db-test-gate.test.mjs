import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertDatabaseTests } from './lib/db-test-gate.mjs';

function report() {
  return {
    success: true, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, numFailedTestSuites: 0,
    testResults: [
      ['database.test.ts', 11], ['member-archive.test.ts', 9],
    ].map(([name, count]) => ({ name: `D:/repo/tests/integration/${name}`, status: 'passed',
      assertionResults: Array.from({ length: count }, (_, index) => ({ fullName: `case ${index}`, status: 'passed' })),
    })),
  };
}

test('both required suites must actually execute', () => {
  assert.deepEqual(assertDatabaseTests(report()), { suites: 2, passed: 20, skipped: 0 });
  const missing = report(); missing.testResults.pop();
  assert.throws(() => assertDatabaseTests(missing));
});

test('pending or failed assertions cannot be approved even with a success flag', () => {
  for (const status of ['pending', 'todo', 'failed', 'skipped', 'unknown']) {
    const input = report(); input.testResults[1].assertionResults[0].status = status;
    assert.throws(() => assertDatabaseTests(input));
  }
});

test('failed hooks, empty suites and truncated reports are rejected', () => {
  const failed = report(); failed.testResults[1].status = 'failed';
  assert.throws(() => assertDatabaseTests(failed));
  const empty = report(); empty.testResults[1].assertionResults = [];
  assert.throws(() => assertDatabaseTests(empty));
  for (const input of [null, {}, { ...report(), success: false }, { ...report(), numFailedTestSuites: 1 }]) {
    assert.throws(() => assertDatabaseTests(input));
  }
});

test('Windows paths are accepted but lookalike paths and duplicate suites are rejected', () => {
  const windows = report(); windows.testResults.forEach(suite => { suite.name = suite.name.replaceAll('/', '\\'); });
  assert.equal(assertDatabaseTests(windows).passed, 20);
  const wrong = report(); wrong.testResults[1].name = 'D:/repo/other/member-archive.test.ts';
  assert.throws(() => assertDatabaseTests(wrong));
  const duplicate = report(); duplicate.testResults.push(duplicate.testResults[0]);
  assert.throws(() => assertDatabaseTests(duplicate));
});

test('CI must run archive DB tests and verify the execution report', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const job = workflow.split('\n  isolated-db:')[1].split('\n  e2e:')[0];
  assert.match(job, /tests\/integration\/member-archive\.test\.ts/);
  assert.match(job, /--reporter=json/);
  assert.match(job, /node scripts\/verify-db-results\.mjs tmp\/isolated-db-results\.json/);
});

test('local release verification checks DB results before it can report verified', () => {
  const source = fs.readFileSync(new URL('./release-safety.mjs', import.meta.url), 'utf8');
  assert.match(source, /--reporter=json/);
  assert.match(source, /if \(step === 'test'\)/);
  assert.ok(source.indexOf('assertDatabaseTests(JSON.parse') < source.indexOf('verified: true'));
});

test('gate failures are recorded explicitly instead of leaving a zero-exit test as the last result', () => {
  const source = fs.readFileSync(new URL('./release-safety.mjs', import.meta.url), 'utf8');
  assert.match(source, /step: 'db-gate', exitCode: 1/);
  assert.match(source, /verified: false/);
});
