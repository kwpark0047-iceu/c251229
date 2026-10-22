import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// Next가 운영 환경 파일을 자동 로드하지 않도록 별도 후보/깨끗한 CI에서만 실행합니다.
const environmentFiles = readdirSync(process.cwd()).filter(name => name.startsWith('.env') && name !== '.env.example');
if (environmentFiles.length) throw new Error('Isolated smoke requires a checkout without environment files');
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HOME', 'CI']) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
Object.assign(env, {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54999',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-smoke-not-a-real-key',
  NEXT_DIST_DIR: '.next', NEXT_TELEMETRY_DISABLED: '1',
});
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3117'], {
  env, stdio: 'inherit', windowsHide: true,
});
child.on('error', () => { process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
