import fs from 'node:fs';
import { assertDatabaseTests } from './lib/db-test-gate.mjs';

try {
  const [file, ...extra] = process.argv.slice(2);
  if (!file || extra.length) throw Error('Usage: verify-db-results.mjs <vitest-json-report>');
  const result = assertDatabaseTests(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error instanceof SyntaxError ? 'Invalid database JSON report' : error.message);
  process.exitCode = 1;
}
