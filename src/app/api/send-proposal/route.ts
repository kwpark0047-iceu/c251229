/**
 * 제안서 이메일 발송 API
 * Resend API를 사용하여 광고 제안서 이메일 발송
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Supabase 클라이언트 (서버용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  }[];
  totalPrice: number;
  discountRate: number;
  finalPrice: number;
  greetingMessage: string;
}

export async function POST(request: NextRequest) {
  try {
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
          `<tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 12px; text-align: center;">${index + 1}</td>
            <td style="padding: 12px;">${item.stationName}역</td>
            <td style="padding: 12px;">${item.adType}</td>
            <td style="padding: 12px;">${item.locationCode}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600;">${item.priceMonthly.toLocaleString()}원/월</td>
          </tr>`
      )
      .join('');

    // 이메일 HTML 템플릿
    const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>지하철 광고 제안서</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

    <!-- 헤더 -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
        서울 지하철 광고 제안서
      </h1>
      <p style="color: #a0aec0; margin: 8px 0 0 0; font-size: 14px;">
        Seoul Metro Advertising Proposal
      </p>
    </div>

    <!-- 고객 정보 -->
    <div style="padding: 24px 32px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a202c;">
        ${body.recipientName} 귀하
      </p>
    </div>

    <!-- 인사말 -->
    <div style="padding: 32px;">
      <div style="white-space: pre-line; line-height: 1.8; color: #4a5568; font-size: 15px;">
${body.greetingMessage}
      </div>
    </div>

    <!-- 추천 역사 정보 -->
    <div style="padding: 24px 32px; background-color: #edf2f7; margin: 0 32px; border-radius: 12px;">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; font-weight: 600;">
        추천 역사
      </h2>
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; font-weight: 700; color: #1a202c; margin-right: 12px;">
          ${body.stationName}역
        </span>
        ${lineBadges}
      </div>
      ${body.trafficDaily ? `
      <p style="margin: 8px 0; color: #4a5568; font-size: 14px;">
        <strong>일일 유동인구:</strong> ${body.trafficDaily.toLocaleString()}명
      </p>
      ` : ''}
      ${body.stationCharacteristics ? `
      <p style="margin: 8px 0; color: #4a5568; font-size: 14px;">
        <strong>역사 특색:</strong> ${body.stationCharacteristics}
      </p>
      ` : ''}
    </div>

    <!-- 광고 매체 목록 -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2d3748; font-weight: 600;">
        제안 광고 매체
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #1a1a2e; color: white;">
            <th style="padding: 12px; text-align: center; width: 40px;">No</th>
            <th style="padding: 12px; text-align: left;">역사</th>
            <th style="padding: 12px; text-align: left;">광고유형</th>
            <th style="padding: 12px; text-align: left;">위치</th>
            <th style="padding: 12px; text-align: right;">월 단가</th>
          </tr>
        </thead>
        <tbody>
          ${inventoryTableRows}
        </tbody>
      </table>
    </div>

    <!-- 금액 정보 -->
    <div style="padding: 24px 32px; background-color: #1a1a2e; margin: 0 32px; border-radius: 12px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: #a0aec0; font-size: 14px;">합계 금액</span>
        <span style="color: #ffffff; font-size: 16px;">${body.totalPrice.toLocaleString()}원/월</span>
      </div>
      ${body.discountRate > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: #a0aec0; font-size: 14px;">할인율</span>
        <span style="color: #f56565; font-size: 16px;">-${body.discountRate}%</span>
      </div>
      ` : ''}
      <div style="border-top: 1px solid #4a5568; padding-top: 12px; display: flex; justify-content: space-between;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 600;">최종 금액</span>
        <span style="color: #48bb78; font-size: 20px; font-weight: 700;">${body.finalPrice.toLocaleString()}원/월</span>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="padding: 32px; text-align: center; background-color: #f8fafc; margin-top: 32px;">
      <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">
        문의사항이 있으시면 언제든 연락주세요.
      </p>
      <p style="margin: 0; color: #718096; font-size: 12px;">
        서울 지하철 광고 영업팀
      </p>
      <p style="margin: 16px 0 0 0; color: #a0aec0; font-size: 11px;">
        본 이메일은 ${body.recipientName}님께 발송된 광고 제안서입니다.
      </p>
    </div>
  </div>
</body>
</html>
`;

    // Resend API로 이메일 발송
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Metro Ads <onboarding@resend.dev>',
      to: body.recipientEmail,
      subject: `[서울 지하철 광고] ${body.stationName}역 광고 제안서 - ${body.recipientName}님`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Resend API error:', emailError);
      return NextResponse.json(
        { success: false, message: `이메일 발송 실패: ${emailError.message}` },
        { status: 500 }
      );
    }

    // 제안서 DB에 저장
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
        status: 'SENT',
        sent_at: new Date().toISOString(),
        email_recipient: body.recipientEmail,
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Supabase error:', proposalError);
      // 이메일은 발송되었으므로 부분 성공 처리
      return NextResponse.json({
        success: true,
        message: '이메일이 발송되었습니다. (DB 저장 실패)',
        emailId: emailData?.id,
      });
    }

    // 리드 상태 업데이트
    await supabase
      .from('leads')
      .update({ status: 'PROPOSAL_SENT' })
      .eq('id', body.leadId);

    return NextResponse.json({
      success: true,
      message: '제안서가 성공적으로 발송되었습니다.',
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
