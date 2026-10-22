// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';

const require = createRequire(import.meta.url);
const follow = require('follow-redirects');
let source: Server, destination: Server, sourcePort: number, destinationPort: number;
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Expected loopback TCP server');
  return address.port;
}
beforeAll(async () => {
  destination = createServer((req, res) => res.end(JSON.stringify(req.headers)));
  destinationPort = await listen(destination);
  source = createServer((req, res) => {
    if (req.url === '/final') { res.end(JSON.stringify(req.headers)); return; }
    res.writeHead(302, { Location: `http://127.0.0.1:${req.url === '/same' ? sourcePort : destinationPort}/final` });
    res.end();
  });
  sourcePort = await listen(source);
});
afterAll(async () => {
  for (const server of [source, destination]) {
    if (!server) continue;
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

function request(path: string, headers: Record<string, string> | string[], sensitiveHeaders?: string[]) {
  return new Promise<Record<string, string>>((resolve, reject) => {
    const req = follow.http.get({ hostname: '127.0.0.1', port: sourcePort, path, headers, sensitiveHeaders }, (response: IncomingMessage) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('error', reject);
      response.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('Loopback redirect timeout')));
  });
}

describe('리다이렉트 인증 헤더 경계 (합성 값·루프백 전용)', () => {
  it('배열 형식 헤더도 다른 origin으로 전달하지 않는다', async () => {
    const result = await request('/cross', ['Authorization', 'synthetic-auth', 'Cookie', 'session=synthetic', 'Proxy-Authorization', 'synthetic-proxy']);
    expect(result.authorization).toBeUndefined();
    expect(result.cookie).toBeUndefined();
    expect(result['proxy-authorization']).toBeUndefined();
  });
  it('대소문자가 섞인 중복 배열 헤더도 모두 제거한다', async () => {
    const result = await request('/cross', ['aUtHoRiZaTiOn', 'synthetic-one', 'Authorization', 'synthetic-two', 'cOoKiE', 'synthetic-cookie', 'X-Request-ID', 'synthetic-trace']);
    expect(result.authorization).toBeUndefined();
    expect(result.cookie).toBeUndefined();
    expect(result['x-request-id']).toBe('synthetic-trace');
  });
  it.each(['X-Api^Key', 'X-Api|Key'])('특수 문자가 있는 민감 헤더 %s를 제거한다', async name => {
    const result = await request('/cross', { [name]: 'synthetic-secret', 'X-Request-ID': 'synthetic-trace' }, [name]);
    expect(result[name.toLowerCase()]).toBeUndefined();
    expect(result['x-request-id']).toBe('synthetic-trace');
  });
  it('일반 객체 형식의 cross-origin 인증 헤더도 제거한다', async () => {
    const result = await request('/cross', { Authorization: 'synthetic-auth', Cookie: 'session=synthetic', 'X-Request-ID': 'synthetic-trace' });
    expect(result.authorization).toBeUndefined();
    expect(result.cookie).toBeUndefined();
    expect(result['x-request-id']).toBe('synthetic-trace');
  });
  it('같은 origin의 정상 리다이렉트는 기존 인증을 보존한다', async () => {
    const result = await request('/same', { Authorization: 'synthetic-auth', Cookie: 'session=synthetic' });
    expect(result.authorization).toBe('synthetic-auth');
    expect(result.cookie).toBe('session=synthetic');
  });
  it.each(['/same', '/cross'])('실제 Axios Node 어댑터의 %s 동작을 보존한다', async path => {
    const { data } = await axios.get<Record<string, string>>(`http://127.0.0.1:${sourcePort}${path}`, {
      proxy: false, timeout: 3000, headers: { Authorization: 'synthetic-auth', 'X-Request-ID': 'synthetic-trace' },
    });
    expect(data.authorization).toBe(path === '/same' ? 'synthetic-auth' : undefined);
    expect(data['x-request-id']).toBe('synthetic-trace');
  });
});
