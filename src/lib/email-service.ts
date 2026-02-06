import { Resend } from 'resend';

// 환경 변수에서 API 키 로드 (서버 사이드에서만 직접 접근 권장)
// Lazy initialization to prevent build errors when API key is missing
let resendInstance: Resend | null = null;

const getResendClient = () => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Email sending will fail.');
    }
    resendInstance = new Resend(apiKey || 're_123456789'); // Dummy key to prevent crash during initialization if key is missing
  }
  return resendInstance;
};

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 이메일 발송 공통 함수
 */
export async function sendEmail({ to, subject, html }: EmailParams) {
  try {
    const resend = getResendClient();

    // API 키가 없는 경우 실제 발송 시도 전에 체크
    if (!process.env.RESEND_API_KEY) {
      console.error('Email send failed: RESEND_API_KEY is missing');
      return { success: false, error: new Error('RESEND_API_KEY is missing') };
    }

    const { data, error } = await resend.emails.send({
      from: '위마켓 <notifications@wemarket.subway>', // 실제 운영 시 인증된 도메인 필요
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service exception:', error);
    return { success: false, error };
  }
}

/**
 * 제안서 발송 알림 메일 템플릿
 */
export async function sendProposalNotification(email: string, bizName: string, proposalTitle: string) {
  const subject = `[위마켓] ${bizName}님, 새로운 지하철 광고 제안서가 도착했습니다.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #00A84D;">지하철 광고 제안 안내</h2>
      <p>안녕하세요, <strong>${bizName}</strong>님!</p>
      <p>위마켓에서 제안드리는 <strong>'${proposalTitle}'</strong>이(가) 준비되었습니다.</p>
      <p>광고 매체 상세 정보와 기대 효과 분석 내용을 플랫폼에서 확인하실 수 있습니다.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="https://wemarket.subway/proposals" style="background-color: #00A5DE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">제안서 확인하기</a>
      </div>
      <p style="color: #666; font-size: 12px;">본 메일은 발신 전용입니다. 문의 사항은 고객센터를 이용해 주세요.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * 제안서 리마인더 메일 템플릿 (3일 미열람 대상)
 */
export async function sendProposalReminder(email: string, recipientName: string, proposalTitle: string) {
  const subject = `[리마인드] ${recipientName}님, 보내드린 제안서를 놓치지 마세요.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #3CB54A 0%, #00A5DE 100%); padding: 30px; border-radius: 12px; color: white; text-align: center; margin-bottom: 25px;">
        <h1 style="margin: 0; font-size: 24px;">다시 한번 확인 부탁드립니다!</h1>
      </div>
      <p>안녕하세요, <strong>${recipientName}</strong> 담당자님.</p>
      <p>며칠 전 보내드린 <strong>'${proposalTitle}'</strong> 제안서가 아직 확인 전인 것으로 나타나 리마인드 드립니다.</p>
      <p>귀사의 성공적인 홍보를 위해 엄선한 광고 구좌들이 현재 가용 상태입니다. 좋은 위치를 선점하실 수 있는 기회를 놓치지 마세요.</p>
      <div style="margin: 40px 0; text-align: center;">
        <a href="https://wemarket.subway/proposals" style="background-color: #3CB54A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(60, 181, 74, 0.4);">제안서 열람하기</a>
      </div>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">혹시 제안 수신이 어려우셨거나 추가로 궁금하신 점이 있다면 이 메일에 회신해 주세요. 영업 담당자가 신속히 안내해 드리겠습니다.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 11px; text-align: center;">본 메일은 시스템에 의해 자동으로 발송되는 리마인더입니다.<br/>© 위마켓 서울 지하철 광고 통합 플랫폼</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}
