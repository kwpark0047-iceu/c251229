import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createRateLimiter,
  escapeHtml,
  getClientKey,
  isSameOrigin,
} from "@/lib/api-guard";

// Resend 클라이언트 생성 함수
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return new Resend(apiKey);
}

// 남용 방지: IP당 1분에 5회까지 발송 허용
const isRateLimited = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

const MAX_STATIONS = 5;
const MAX_LIST_ITEMS = 20;
const MAX_TEXT_LENGTH = 2000;

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 문자열 목록 여부 (길이 제한 포함) */
const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= MAX_LIST_ITEMS &&
  v.every((x) => typeof x === "string");

/** 제안서 본문 구조를 검증합니다. 템플릿이 참조하는 필드가 모두 올바른 타입인지 확인합니다. */
function isValidProposal(p: unknown): p is {
  clientInfo: { company: string };
  purposeAnalysis: { targetAudience: string; purposes: string[] };
  topStations: {
    rank: number;
    stationName: string;
    lineNumbers: string[];
    dailyTraffic: number;
    characteristics: string;
  }[];
  expectedEffects: string[];
  budgetPlan: {
    inputBudget: string;
    monthlyEstimate: string;
    recommendation: string[];
  };
} {
  if (!isRecord(p)) return false;
  const {
    clientInfo,
    purposeAnalysis,
    topStations,
    expectedEffects,
    budgetPlan,
  } = p;
  if (!isRecord(clientInfo) || typeof clientInfo.company !== "string")
    return false;
  if (
    !isRecord(purposeAnalysis) ||
    typeof purposeAnalysis.targetAudience !== "string" ||
    !isStringList(purposeAnalysis.purposes)
  )
    return false;
  if (
    !Array.isArray(topStations) ||
    topStations.length === 0 ||
    topStations.length > MAX_STATIONS
  )
    return false;
  const stationsOk = topStations.every(
    (s) =>
      isRecord(s) &&
      typeof s.rank === "number" &&
      typeof s.stationName === "string" &&
      isStringList(s.lineNumbers) &&
      typeof s.dailyTraffic === "number" &&
      typeof s.characteristics === "string",
  );
  if (!stationsOk) return false;
  if (!isStringList(expectedEffects)) return false;
  if (
    !isRecord(budgetPlan) ||
    typeof budgetPlan.inputBudget !== "string" ||
    typeof budgetPlan.monthlyEstimate !== "string" ||
    !isStringList(budgetPlan.recommendation)
  )
    return false;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 동일 출처 요청만 허용 (외부 사이트에서의 자동 발송 차단)
    if (!isSameOrigin(request))
      return fail("다른 사이트에서 보낸 요청은 허용되지 않습니다.", 403);

    // 2. 요청 빈도 제한
    if (isRateLimited(getClientKey(request))) {
      return fail("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    }

    const resend = getResend();
    const body = await request.json().catch(() => null);
    const proposal = isRecord(body) ? body.proposal : undefined;
    const email = isRecord(body) ? body.email : undefined;

    if (!proposal || !email) {
      return fail("제안서 정보 또는 이메일 주소가 누락되었습니다.", 400);
    }

    // 3. 이메일 유효성 검사 (길이 제한 포함)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !emailRegex.test(email)
    ) {
      return fail("올바른 이메일 주소를 입력해주세요.", 400);
    }

    // 4. 제안서 구조 검증
    if (!isValidProposal(proposal)) {
      return fail("제안서 데이터 형식이 올바르지 않습니다.", 400);
    }

    // 노선 색상 매핑
    const LINE_COLORS: Record<string, string> = {
      "1": "#0052A4",
      "2": "#00A84D",
      "3": "#EF7C1C",
      "4": "#00A5DE",
      "5": "#996CAC",
      "6": "#CD7C2F",
      "7": "#747F00",
      "8": "#E6186C",
      "9": "#BDB092",
      수인분당: "#F5A200",
      신분당: "#D4003B",
      경의중앙: "#77C4A3",
      경춘: "#0C8E72",
      우이신설: "#B7C452",
      신림: "#6789CA",
      공항: "#0090D2",
      경강: "#003DA5",
    };

    // 추천 역 섹션 생성 (모든 사용자 값은 escapeHtml로 이스케이프)
    const stationSections = proposal.topStations
      .map(
        (station) => `
      <div style="margin-bottom: 30px; padding: 25px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <span style="width: 36px; height: 36px; border-radius: 50%; background: ${station.rank === 1 ? "#00A5DE" : "#666"}; color: white; display: inline-block; text-align: center; line-height: 36px; font-weight: bold; margin-right: 12px;">
            ${escapeHtml(station.rank)}
          </span>
          <div>
            <h3 style="margin: 0; color: #ffffff; font-size: 20px;">${escapeHtml(station.stationName)}역</h3>
            <div style="margin-top: 5px;">
              ${station.lineNumbers
                .map(
                  (line) => `
                <span style="display: inline-block; padding: 2px 8px; background: ${LINE_COLORS[line] || "#888"}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 4px;">
                  ${escapeHtml(line)}호선
                </span>
              `,
                )
                .join("")}
            </div>
          </div>
          <div style="margin-left: auto; text-align: right;">
            <div style="color: #00A5DE; font-size: 18px; font-weight: bold;">${escapeHtml(station.dailyTraffic.toLocaleString())}명</div>
            <div style="color: #94a3b8; font-size: 12px;">일 평균 유동인구</div>
          </div>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">${escapeHtml(station.characteristics.slice(0, MAX_TEXT_LENGTH))}</p>
      </div>
    `,
      )
      .join("");

    // 기대 효과 섹션
    const effectsList = proposal.expectedEffects
      .map(
        (effect) => `
      <li style="margin-bottom: 8px; display: flex; align-items: center; color: #cbd5e1;">
        <span style="color: #00A84D; margin-right: 10px;">✓</span> ${escapeHtml(effect)}
      </li>
    `,
      )
      .join("");

    const company = escapeHtml(proposal.clientInfo.company);
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
      <p style="color: rgba(255,255,255,0.8); margin-top: 10px; font-size: 16px;">${company}님을 위한 최적의 미디어 전략</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffffff; font-size: 18px; border-left: 4px solid #00A84D; padding-left: 12px; margin-bottom: 15px;">① 광고 목적 및 타겟 분석</h2>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 5px 0;">타겟 고객층</p>
          <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">${escapeHtml(proposal.purposeAnalysis.targetAudience)}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0;">주요 전략</p>
          <ul style="padding: 0; margin: 0; list-style: none; color: #cbd5e1; font-size: 14px;">
            ${proposal.purposeAnalysis.purposes.map((p) => `<li style="margin-bottom: 5px;">• ${escapeHtml(p)}</li>`).join("")}
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
              <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 5px 0 0 0;">${escapeHtml(proposal.budgetPlan.inputBudget)}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">예상 월 비용</p>
              <p style="color: #00A84D; font-size: 18px; font-weight: 700; margin: 5px 0 0 0;">${escapeHtml(proposal.budgetPlan.monthlyEstimate)}</p>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 15px 0 8px 0;">추천 구성</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${proposal.budgetPlan.recommendation
              .map(
                (item) => `
              <span style="background: #1e293b; color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 13px;">${escapeHtml(item)}</span>
            `,
              )
              .join("")}
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

    // 제목은 HTML이 아니므로 줄바꿈만 제거해 헤더 주입을 막습니다.
    const safeSubjectCompany = proposal.clientInfo.company
      .replace(/[\r\n]+/g, " ")
      .slice(0, 100);
    const { data, error } = await resend.emails.send({
      from: "Antigravity <onboarding@resend.dev>",
      to: email,
      subject: `[Antigravity] ${safeSubjectCompany}님을 위한 AI 지하철 광고 추천 제안서`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend API error:", error);
      return fail(`이메일 발송 실패: ${error.message}`, 500);
    }

    return NextResponse.json({
      success: true,
      message: "제안서가 성공적으로 발송되었습니다.",
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Send AI proposal error:", error);
    return NextResponse.json(
      { success: false, message: `서버 오류: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
