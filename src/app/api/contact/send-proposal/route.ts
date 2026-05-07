import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Resend 클라이언트 생성 함수
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new Resend(apiKey);
}

export async function POST(request: NextRequest) {
  try {
    const resend = getResend();
    const { proposal, email } = await request.json();

    if (!proposal || !email) {
      return NextResponse.json(
        { success: false, message: '제안서 정보 또는 이메일 주소가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 노선 색상 매핑
    const LINE_COLORS: Record<string, string> = {
      '1': '#0052A4',
      '2': '#00A84D',
      '3': '#EF7C1C',
      '4': '#00A5DE',
      '5': '#996CAC',
      '6': '#CD7C2F',
      '7': '#747F00',
      '8': '#E6186C',
      '9': '#BDB092',
    };

    // 추천 역 섹션 생성
    const stationSections = proposal.topStations.map((station: any) => `
      <div style="margin-bottom: 30px; padding: 25px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <span style="width: 36px; height: 36px; border-radius: 50%; background: ${station.rank === 1 ? '#00A5DE' : '#666'}; color: white; display: inline-block; text-align: center; line-height: 36px; font-weight: bold; margin-right: 12px;">
            ${station.rank}
          </span>
          <div>
            <h3 style="margin: 0; color: #ffffff; font-size: 20px;">${station.stationName}역</h3>
            <div style="margin-top: 5px;">
              ${station.lineNumbers.map((line: string) => `
                <span style="display: inline-block; padding: 2px 8px; background: ${LINE_COLORS[line] || '#888'}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 4px;">
                  ${line}호선
                </span>
              `).join('')}
            </div>
          </div>
          <div style="margin-left: auto; text-align: right;">
            <div style="color: #00A5DE; font-size: 18px; font-weight: bold;">${station.dailyTraffic.toLocaleString()}명</div>
            <div style="color: #94a3b8; font-size: 12px;">일 평균 유동인구</div>
          </div>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">${station.characteristics}</p>
      </div>
    `).join('');

    // 기대 효과 섹션
    const effectsList = proposal.expectedEffects.map((effect: string) => `
      <li style="margin-bottom: 8px; display: flex; align-items: center; color: #cbd5e1;">
        <span style="color: #00A84D; margin-right: 10px;">✓</span> ${effect}
      </li>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #00A84D 0%, #00A5DE 100%); padding: 50px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">AI 맞춤형 광고 추천 제안서</h1>
      <p style="color: rgba(255,255,255,0.8); margin-top: 10px; font-size: 16px;">${proposal.clientInfo.company}님을 위한 최적의 미디어 전략</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 18px; border-left: 4px solid #00A84D; padding-left: 12px; margin-bottom: 15px;">① 광고 목적 및 타겟 분석</h2>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 5px 0;">타겟 고객층</p>
          <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">${proposal.purposeAnalysis.targetAudience}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0;">주요 전략</p>
          <ul style="padding: 0; margin: 0; list-style: none; color: #cbd5e1; font-size: 14px;">
            ${proposal.purposeAnalysis.purposes.map((p: string) => `<li style="margin-bottom: 5px;">• ${p}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 18px; border-left: 4px solid #00A5DE; padding-left: 12px; margin-bottom: 15px;">② AI 추천 역사 TOP 2</h2>
        ${stationSections}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 18px; border-left: 4px solid #E6186C; padding-left: 12px; margin-bottom: 15px;">③ 예산 및 구성안</h2>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">희망 예산</p>
              <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 5px 0 0 0;">${proposal.budgetPlan.inputBudget}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">예상 월 비용</p>
              <p style="color: #00A84D; font-size: 18px; font-weight: 700; margin: 5px 0 0 0;">${proposal.budgetPlan.monthlyEstimate}</p>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 15px 0 8px 0;">추천 구성</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${proposal.budgetPlan.recommendation.map((item: string) => `
              <span style="background: #1e293b; color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 13px;">${item}</span>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 18px; border-left: 4px solid #EF7C1C; padding-left: 12px; margin-bottom: 15px;">④ 기대 효과</h2>
        <ul style="padding: 0; margin: 0; list-style: none; font-size: 15px;">
          ${effectsList}
        </ul>
      </div>

      <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #1e293b;">
        <p style="color: #94a3b8; font-size: 14px;">본 제안서는 AI가 분석한 기초 데이터 기반의 추천안입니다.<br>상세 상담을 통해 더욱 정교한 마케팅 플랜을 제공해 드립니다.</p>
        <a href="https://c251229.vercel.app/contact" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background: #00A5DE; color: #ffffff; border-radius: 12px; text-decoration: none; font-weight: bold;">추가 문의하기</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #020617; padding: 30px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 Antigravity Metro Ads. All rights reserved.</p>
      <p style="color: #475569; font-size: 11px; margin-top: 5px;">본 메일은 수신자의 요청에 의해 발송된 AI 자동 생성 제안서입니다.</p>
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Antigravity <onboarding@resend.dev>',
      to: email,
      subject: `[Antigravity] ${proposal.clientInfo.company}님을 위한 AI 지하철 광고 추천 제안서`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { success: false, message: `이메일 발송 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '제안서가 성공적으로 발송되었습니다.',
      emailId: data?.id,
    });
  } catch (error) {
    console.error('Send AI proposal error:', error);
    return NextResponse.json(
      { success: false, message: `서버 오류: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
