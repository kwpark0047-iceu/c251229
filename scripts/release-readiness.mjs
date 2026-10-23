import fs from 'node:fs';
import path from 'node:path';
import { snapshotSource } from './lib/source-snapshot.mjs';
import { assertReadiness } from './lib/release-readiness.mjs';

// This read-only gate never updates a baseline, deploys, or connects to a database.
try {
  const [root, receiptPath] = process.argv.slice(2);
  if (!root || !receiptPath) throw Error('Usage: node scripts/release-readiness.mjs <source-directory> <receipt.json>');
  const source = snapshotSource(path.resolve(root));
  const receipt = JSON.parse(fs.readFileSync(path.resolve(receiptPath), 'utf8'));
  process.stdout.write(JSON.stringify({ sourceDigest: source.digest, ...assertReadiness(source.digest, receipt) }) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
