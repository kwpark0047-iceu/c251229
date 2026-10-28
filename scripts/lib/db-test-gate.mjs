const required = new Map([
  ['tests/integration/database.test.ts', 11],
  ['tests/integration/member-archive.test.ts', 10],
]);

export function assertDatabaseTests(report) {
  if (report?.success !== true || !Array.isArray(report.testResults)) throw Error('Database report is incomplete or unsuccessful');
  for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests', 'numFailedTestSuites']) {
    if (report[key] !== 0) throw Error('Database report contains failed, skipped or unknown results');
  }
  let passed = 0;
  for (const [name, minimum] of required) {
    const matches = report.testResults.filter(suite => {
      const filename = typeof suite?.name === 'string' ? suite.name.replaceAll('\\', '/') : '';
      return !filename.split('/').includes('..') && (filename === name || filename.endsWith('/' + name));
    });
    if (matches.length !== 1) throw Error('Missing or duplicate required database suite: ' + name);
    const suite = matches[0];
    if (suite.status !== 'passed' || !Array.isArray(suite.assertionResults)
      || suite.assertionResults.length < minimum
      || suite.assertionResults.some(test => test.status !== 'passed')) {
      throw Error('Required database tests did not all execute successfully: ' + name);
    }
    passed += suite.assertionResults.length;
  }
  return { suites: required.size, passed, skipped: 0 };
}
