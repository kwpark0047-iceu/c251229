import path from 'node:path';
import { snapshotSource, compareSnapshots } from './lib/source-snapshot.mjs';

// 출력에는 파일 경로와 해시만 포함하며 환경변수나 소스 본문은 읽어 내보내지 않는다.
try {
  const current = snapshotSource(path.resolve(process.argv[2] || '.'));
  const baseline = process.argv[3] ? snapshotSource(path.resolve(process.argv[3])) : null;
  process.stdout.write(JSON.stringify({
    purpose: 'source-inventory-only-not-deployment-or-validation-proof',
    current,
    ...(baseline ? { baseline, difference: compareSnapshots(baseline, current) } : {}),
  }, null, 2) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
