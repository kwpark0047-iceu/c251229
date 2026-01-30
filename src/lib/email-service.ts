import { Resend } from 'resend';

// 환경 변수에서 API 키 로드 (서버 사이드에서만 직접 접근 권장)
const resend = new Resend(process.env.RESEND_API_KEY);

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
