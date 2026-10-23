import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertReadiness } from './lib/release-readiness.mjs';
const digest = 'a'.repeat(64);
const receipt = () => ({ sourceDigest: digest, databaseVerified: true, results: ['type-check', 'lint', 'test', 'db-gate', 'build'].map(stage => ({ stage, exitCode: 0, ...(stage === 'db-gate' ? { suites: 2, passed: 20, skipped: 0 } : {}) })) });
test('accepts matching sequential successful evidence without claiming deployment', () => {
  assert.deepEqual(assertReadiness(digest, receipt()), { pipelineVerified: true, deploymentVerified: false, browserVerified: false });
});
test('rejects stale source and absent database verification', () => {
  assert.throws(() => assertReadiness('b'.repeat(64), receipt()), /Source/);
  assert.throws(() => assertReadiness(digest, { ...receipt(), databaseVerified: false }), /Database/);
});
test('rejects missing, failed, duplicate and reordered stages', () => {
  for (const mutate of [r => r.pop(), r => r[1].exitCode = 1, r => r.push(r[0]), r => r.reverse()]) {
    const input = receipt(); mutate(input.results);
    assert.throws(() => assertReadiness(digest, input));
  }
});
test('rejects skipped or insufficient database evidence', () => {
  for (const override of [{ skipped: 1 }, { passed: 19 }, { suites: 1 }]) {
    const input = receipt(); Object.assign(input.results[3], override);
    assert.throws(() => assertReadiness(digest, input), /Database/);
  }
});
test('rejects malformed receipts and unexpected failed extra stages', () => {
  for (const input of [null, {}, { ...receipt(), results: null }]) assert.throws(() => assertReadiness(digest, input));
  const input = receipt(); input.results.splice(2, 0, { stage: 'local-tools', exitCode: 1 });
  assert.throws(() => assertReadiness(digest, input));
});
