export function assertReadiness(sourceDigest, receipt) {
  if (!/^[a-f0-9]{64}$/.test(sourceDigest) || receipt?.sourceDigest !== sourceDigest) {
    throw Error('Source does not match verification receipt');
  }
  if (receipt.databaseVerified !== true) throw Error('Database verification is required');
  const required = ['type-check', 'lint', 'test', 'db-gate', 'build'];
  const allowed = new Set([...required, 'local-tools']);
  if (!Array.isArray(receipt.results)) throw Error('Missing verification stages');
  const seen = new Set();
  for (const result of receipt.results) {
    if (!result || !allowed.has(result.stage) || seen.has(result.stage) || result.exitCode !== 0) {
      throw Error('Failed, duplicate or unsupported verification stage');
    }
    seen.add(result.stage);
  }
  const order = receipt.results.filter(r => r.stage !== 'local-tools').map(r => r.stage);
  if (JSON.stringify(order) !== JSON.stringify(required)) throw Error('Missing or unordered verification stages');
  const database = receipt.results.find(r => r.stage === 'db-gate');
  if (database.suites !== 2 || !Number.isSafeInteger(database.passed) || database.passed < 20 || database.skipped !== 0) {
    throw Error('Database evidence is incomplete');
  }
  return { pipelineVerified: true, deploymentVerified: false, browserVerified: false };
}
