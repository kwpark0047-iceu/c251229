import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), client: vi.fn() }));
vi.mock('resend', () => ({ Resend: class {
  emails = { send: mocks.send };
  constructor(key: string) { mocks.client(key); }
} }));
import { sendEmail } from '@/lib/email-service';
const mail = { to: 'synthetic@example.com', subject: 'Synthetic', html: '<p>test</p>' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 're_synthetic');
  vi.stubEnv('RESEND_FROM_EMAIL', 'notice@example.com');
  vi.stubEnv('RESEND_FROM_NAME', '위마켓');
  mocks.send.mockResolvedValue({ data: { id: 'synthetic-message' }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('안내 메일 발송 설정', () => {
  it('운영 환경의 발신 주소와 표시 이름을 사용한다', async () => {
    const result = await sendEmail(mail);
    expect(result.success).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith({ ...mail, from: '위마켓 <notice@example.com>' });
  });
  it.each(['', '   ', 'placeholder'])('키가 유효한 형식이 아니면 외부 요청을 하지 않는다: %s', async key => {
    vi.stubEnv('RESEND_API_KEY', key);
    expect(await sendEmail(mail)).toMatchObject({ success: false, errorCode: 'EMAIL_CONFIGURATION' });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(['', 'not-an-email', 'notice@example.com\r\nBcc: leak@example.com'])('발신 주소 오류 시 임의 도메인으로 대체하지 않는다', async sender => {
    vi.stubEnv('RESEND_FROM_EMAIL', sender);
    expect(await sendEmail(mail)).toMatchObject({ success: false, errorCode: 'EMAIL_CONFIGURATION' });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('외부 오류 원문에 수신자·키가 있어도 로그에 출력하지 않는다', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.send.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'synthetic@example.com re_private', statusCode: 403 } });
    expect(await sendEmail(mail)).toMatchObject({ success: false, errorCode: 'EMAIL_DELIVERY_FAILED' });
    expect(JSON.stringify(logger.mock.calls)).not.toContain('re_private');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('synthetic@example.com');
  });
  it('메시지 식별자가 없는 응답은 발송 성공으로 간주하지 않는다', async () => {
    mocks.send.mockResolvedValue({ data: null, error: null });
    expect((await sendEmail(mail)).success).toBe(false);
  });
});
