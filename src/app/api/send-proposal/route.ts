/**
 * 제안서 이메일 발송 API
 * Resend API를 사용하여 광고 제안서 이메일 발송
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { generateProposalPDF } from '@/app/lead-manager/proposal-service';

// Resend 클라이언트 생성 함수 (런타임에 호출)
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new Resend(apiKey);
}

// Supabase 클라이언트 생성 함수 (런타임에 호출)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  return createClient(url, key);
}

interface SendProposalRequest {
  leadId: string;
  recipientEmail: string;
  recipientName: string;
  stationName: string;
  stationLines: string[];
  trafficDaily?: number;
  stationCharacteristics?: string;
  inventoryItems: {
    id: string;
    stationName: string;
    adType: string;
    locationCode: string;
    priceMonthly: number;
    floorPlanUrl?: string;
  }[];
  totalPrice: number;
  discountRate: number;
  finalPrice: number;
  greetingMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const resend = getResend();
    const supabase = getSupabase();
    const body: SendProposalRequest = await request.json();

    // 필수 필드 검증
    if (!body.leadId || !body.recipientEmail || !body.greetingMessage) {
      return NextResponse.json(
        { success: false, message: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.recipientEmail)) {
      return NextResponse.json(
        { success: false, message: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 노선 색상 매핑
    const lineColors: Record<string, string> = {
      '1': '#0052A4',
      '2': '#00A84D',
      '3': '#EF7C1C',
      '4': '#00A5DE',
      '5': '#996CAC',
      '6': '#CD7C2F',
      '7': '#747F00',
      '8': '#E6186C',
      '9': '#BDB092',
      'S': '#77C4A3',
      'K': '#7CA8D5',
      'B': '#F5A200',
    };

    // 노선 배지 HTML 생성
    const lineBadges = body.stationLines
      .map(
        (line) =>
          `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${lineColors[line] || '#888'}; color: white; font-size: 12px; font-weight: bold; text-align: center; line-height: 24px; margin-right: 4px;">${line}</span>`
      )
      .join('');

    // 광고 항목 테이블 HTML 생성
    const inventoryTableRows = body.inventoryItems
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 16px; text-align: center; color: #94a3b8;">${index + 1}</td>
            <td style="padding: 16px; color: #f1f5f9;">${item.stationName}역</td>
            <td style="padding: 16px; color: #f1f5f9;">
              <span style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 2px 8px; border-radius: 4px; color: #60a5fa; font-size: 11px;">
                ${item.adType}
              </span>
            </td>
            <td style="padding: 16px; color: #f1f5f9; font-family: monospace;">${item.locationCode}</td>
            <td style="padding: 16px; text-align: right; color: #38bdf8; font-weight: 700;">${item.priceMonthly.toLocaleString()}원</td>
          </tr>`
      )
      .join('');

    // 도면 섹션 HTML 생성
    const floorPlanSections = body.inventoryItems
      .filter(item => item.floorPlanUrl)
      .map(item => `
        <div style="margin-top: 24px; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #f1f5f9; display: flex; align-items: center;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; margin-right: 8px;"></span>
            ${item.stationName}역 상세 도면 (${item.locationCode})
          </h3>
          <img src="${item.floorPlanUrl}" alt="${item.stationName} 도면" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);" />
        </div>
      `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Metro Ads Proposal</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; background-color: #020617; color: #f1f5f9;">
  <div style="max-width: 650px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
    
    <!-- 헤더부 (Gradient) -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 60px 40px; text-align: center; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.1); filter: blur(40px);"></div>
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        서울 지하철 광고 제안
      </h1>
      <p style="color: rgba(255,255,255,0.8); margin: 12px 0 0 0; font-size: 16px; font-weight: 500;">
        Antigravity Premium Media Solutions
      </p>
    </div>

    <!-- 메인 컨텐츠 -->
    <div style="padding: 48px 40px;">
      <!-- 수신자 -->
      <div style="margin-bottom: 32px;">
        <span style="display: inline-block; padding: 6px 12px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-size: 13px; font-weight: 600; border-radius: 100px; margin-bottom: 12px;">OFFICIAL PROPOSAL</span>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">${body.recipientName} 귀하</h2>
      </div>

      <!-- 인사말 섹션 -->
      <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; padding: 32px; border-radius: 20px; line-height: 1.8; color: #cbd5e1; font-size: 16px;">
        <div style="white-space: pre-line;">${body.greetingMessage}</div>
      </div>

      <!-- 추천 역사 하이라이트 -->
      <div style="margin-top: 48px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">추천 역사 분석</h3>
          <div style="display: flex; gap: 4px;">${lineBadges}</div>
        </div>
        
        <div style="display: grid; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155;">
          <div style="padding: 24px; border-bottom: 1px solid #334155;">
            <div style="font-size: 13px; color: #94a3b8; margin-bottom: 4px;">TARGET STATION</div>
            <div style="font-size: 22px; font-weight: 800; color: #38bdf8;">${body.stationName}역</div>
          </div>
          <div style="display: grid; padding: 20px 24px; gap: 20px;">
            ${body.trafficDaily ? `
            <div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">일일 유동인구</div>
              <div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">${body.trafficDaily.toLocaleString()}명</div>
            </div>
            ` : ''}
            ${body.stationCharacteristics ? `
            <div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">역사 주요권역 특색</div>
              <div style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">${body.stationCharacteristics}</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- 광고 매체 상세 리스트 -->
      <div style="margin-top: 48px;">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #ffffff;">광고 위치 배정 제안</h3>
        <div style="overflow: hidden; border-radius: 16px; border: 1px solid #334155;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #0f172a;">
            <thead style="background: #1e293b;">
              <tr>
                <th style="padding: 16px; text-align: center; color: #94a3b8; font-weight: 600;">NO</th>
                <th style="padding: 16px; text-align: left; color: #94a3b8; font-weight: 600;">역사</th>
                <th style="padding: 16px; text-align: left; color: #94a3b8; font-weight: 600;">유형</th>
                <th style="padding: 16px; text-align: left; color: #94a3b8; font-weight: 600;">위치코드</th>
                <th style="padding: 16px; text-align: right; color: #94a3b8; font-weight: 600;">월 단가</th>
              </tr>
            </thead>
            <tbody>
              ${inventoryTableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 배치도 섹션 -->
      ${floorPlanSections ? `
      <div style="margin-top: 48px;">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #ffffff;">역내 광고 위치 도면</h3>
        ${floorPlanSections}
      </div>
      ` : ''}

      <!-- 최종 견적 섹션 -->
      <div style="margin-top: 60px; padding: 40px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #38bdf8; border-radius: 24px; box-shadow: 0 0 30px rgba(56, 189, 248, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div style="font-size: 16px; color: #94a3b8;">표준 제안 금액</div>
          <div style="font-size: 20px; color: #cbd5e1;">${body.totalPrice.toLocaleString()}원</div>
        </div>
        ${body.discountRate > 0 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div style="font-size: 16px; color: #94a3b8;">Antigravity 특별 할인</div>
          <div style="font-size: 20px; color: #fb7185; font-weight: 700;">-${body.discountRate}%</div>
        </div>
        ` : ''}
        <div style="height: 1px; background: #334155; margin-bottom: 24px;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 18px; font-weight: 700; color: #ffffff;">최종 제안 금액</div>
          <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: 900; color: #38bdf8; letter-spacing: -0.05em;">${body.finalPrice.toLocaleString()}원 <span style="font-size: 16px; font-weight: 600;">/ 월</span></div>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">VAT 별도 (광고 집행 기간 조율 가능)</div>
          </div>
        </div>
      </div>

    </div>

    <!-- 푸터부 -->
    <div style="padding: 48px 40px; background: #020617; border-top: 1px solid #1e293b; text-align: center;">
      <p style="margin: 0 0 16px 0; color: #f1f5f9; font-size: 16px; font-weight: 600;">
        Antigravity Metro Advertising Team
      </p>
      <div style="color: #64748b; font-size: 14px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <span>T. 02-1234-5678</span>
        <span>E. ads@antigravity.metro</span>
      </div>
      <p style="margin: 40px 0 0 0; color: #334155; font-size: 12px; border-top: 1px solid #0f172a; padding-top: 24px;">
        본 이메일은 ${body.recipientName}님께 발송된 맞춤형 제안서입니다. 보안에 유의해 주시기 바랍니다.
      </p>
    </div>
  </div>
</body>
</html>
`;

    // 1. 제안서 DB에 먼저 저장 (DRAFT 상태로 시작)
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        lead_id: body.leadId,
        title: `${body.stationName}역 광고 제안서`,
        greeting_message: body.greetingMessage,
        inventory_ids: body.inventoryItems.map((item) => item.id),
        total_price: body.totalPrice,
        discount_rate: body.discountRate,
        final_price: body.finalPrice,
        status: 'DRAFT',
        email_recipient: body.recipientEmail,
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Supabase error:', proposalError);
      return NextResponse.json(
        { success: false, message: `제안서 저장 실패: ${proposalError.message}` },
        { status: 500 }
      );
    }

    // 2. 서버 사이드에서 PDF 생성
    let attachments: any[] = [];
    try {
      const pdfResult = await generateProposalPDF(proposalData.id);
      if (pdfResult.success && pdfResult.pdfBlob) {
        const buffer = await pdfResult.pdfBlob.arrayBuffer();
        const base64Content = Buffer.from(buffer).toString('base64');

        // 오늘 날짜로 파일명 생성
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const filename = `${body.recipientName.replace(/\s+/g, '_')}_광고제안서_${dateStr}.pdf`;

        attachments = [
          {
            filename: filename,
            content: base64Content,
          },
        ];
      }
    } catch (pdfErr) {
      console.error('PDF Generation error in route:', pdfErr);
      // PDF 생성 실패해도 이메일은 본문 내용으로 발송 계속 시도할 수 있음
    }

    // 3. Resend API로 이메일 발송 (첨부파일 포함)
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Metro Ads <onboarding@resend.dev>',
      to: body.recipientEmail,
      subject: `[서울 지하철 광고] ${body.stationName}역 광고 제안서 - ${body.recipientName}님`,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (emailError) {
      console.error('Resend API error:', emailError);
      return NextResponse.json(
        { success: false, message: `이메일 발송 실패: ${emailError.message}` },
        { status: 500 }
      );
    }

    // 4. 발송 완료 처리 및 리드 상태 업데이트
    await Promise.all([
      supabase
        .from('proposals')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
        })
        .eq('id', proposalData.id),
      supabase
        .from('leads')
        .update({ status: 'PROPOSAL_SENT' })
        .eq('id', body.leadId)
    ]);

    return NextResponse.json({
      success: true,
      message: '제안서가 PDF 첨부와 함께 성공적으로 발송되었습니다.',
      emailId: emailData?.id,
      proposalId: proposalData?.id,
    });
  } catch (error) {
    console.error('Send proposal error:', error);
    return NextResponse.json(
      { success: false, message: `서버 오류: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
