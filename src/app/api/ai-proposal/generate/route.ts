/**
 * AI 상권분석 자료 생성 API
 * POST /api/ai-proposal/generate
 *
 * 리드(사업장) 데이터를 기반으로 OpenAI GPT를 호출해
 * 지하철 광고 상권분석 JSON을 생성합니다.
 * 인증: requireSyncAuth (로그인 + 소속 조직 필수, owner/admin 외도 조회 가능)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireSyncAuth } from '@/app/api/sync-utils';

// AI 분석 결과 JSON 스키마
export interface AIAnalysis {
  businessOverview: {
    name: string;
    type: string;
    address: string;
    phone: string;
    summary: string;
  };
  stationAnalysis: {
    station: string;
    lines: string[];
    trafficEstimate: string;
    characteristics: string;
    distance: string;
    recommendation: string;
  };
  marketAnalysis: {
    competitors: string[];
    demandLevel: string;
    targetCustomers: string;
    seasonality: string;
    strengths: string[];
    opportunities: string[];
  };
  recommendation: {
    mediaTypes: string[];
    suggestedStations: string[];
    budgetPlan: string;
    contractTip: string;
  };
  expectedEffects: string[];
  summary: string;
}

function buildPrompt(lead: {
  bizName?: string;
  medicalSubject?: string;
  category?: string;
  roadAddress?: string;
  lotAddress?: string;
  phone?: string;
  nearestStation?: string;
  stationLines?: string[];
  stationDistance?: number;
  nearestExitNo?: string;
}): string {
  const stationName = lead.nearestStation ? `${lead.nearestStation}역` : '미정';
  const lines = lead.stationLines?.length ? lead.stationLines.join(', ') : '미정';
  const distance = lead.stationDistance
    ? lead.stationDistance < 1000
      ? `${lead.stationDistance}m`
      : `${(lead.stationDistance / 1000).toFixed(1)}km`
    : '미정';

  return `당신은 서울 지하철 광고 영업 전문가입니다. 아래 사업장 정보를 분석해 맞춤형 지하철 광고 상권분석 자료를 작성해주세요.

[사업장 정보]
- 업체명: ${lead.bizName || '미정'}
- 업종/진료과목: ${lead.medicalSubject || lead.category || '미정'}
- 주소: ${lead.roadAddress || lead.lotAddress || '미정'}
- 전화: ${lead.phone || '미정'}
- 인근 지하철역: ${stationName}
- 노선: ${lines}
- 역까지 거리: ${distance}
- 가까운 출구: ${lead.nearestExitNo ? lead.nearestExitNo + '번 출구' : '미정'}

다음 JSON 형태로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "businessOverview": {
    "name": "업체명",
    "type": "업종",
    "address": "주소",
    "phone": "전화번호",
    "summary": "사업장 개요 2~3문장 (업종 특성, 타겟 고객, 광고 필요성)"
  },
  "stationAnalysis": {
    "station": "추천 지하철역 (인근 역 기준, 최적의 광고 역 선정)",
    "lines": ["노선명"],
    "trafficEstimate": "유동인구 추정치와 근거",
    "characteristics": "역 주변 상권 특성",
    "distance": "사업장-역 간 거리 및 접근성 평가",
    "recommendation": "이 역에서 광고를 해야 하는 이유 2~3문장"
  },
  "marketAnalysis": {
    "competitors": ["경쟁 업체 유형 3~4개"],
    "demandLevel": "수요 수준 분석 (높음/중간/낮음 + 근거)",
    "targetCustomers": "주요 타겟 고객층",
    "seasonality": "계절/시기별 광고 효과 분석",
    "strengths": ["이 사업장의 광고 강점 3~4개"],
    "opportunities": ["활용 가능한 광고 기회 3~4개"]
  },
  "recommendation": {
    "mediaTypes": ["추천 광고 매체 3개 (조명광고/스크린도어/포스터광고/디지털사이니지 등)"],
    "suggestedStations": ["추천 역 2~3개"],
    "budgetPlan": "예산 규모별 추천 구성안 (월 100만원 미만 / 100~500만원 / 500만원 이상)",
    "contractTip": "계약 및 할인 활용 팁 1문장"
  },
  "expectedEffects": ["기대 효과 3~5개"],
  "summary": "전체 분석 요약 3~4문장 (광고주에게 전달할 핵심 메시지)"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 + 소속 조직 확인
    const auth = await requireSyncAuth(supabase);
    if (auth.errorResponse) return auth.errorResponse;
    const orgId = auth.orgId;

    // 요청 본문 파싱
    let body: { leadId?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '요청 본문이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const leadId = body.leadId;
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'leadId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 리드 조회 (조직 필터)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(
        'id, biz_name, medical_subject, category, road_address, lot_address, phone, nearest_station, station_lines, station_distance, nearest_exit_no'
      )
      .eq('id', leadId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (leadError) {
      console.error('[ai-proposal/generate] 리드 조회 오류:', leadError);
      return NextResponse.json(
        { success: false, error: '리드 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        { success: false, error: '리드를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // OpenAI 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // AI 분석 요청 (JSON 모드)
    const prompt = buildPrompt({
      bizName: lead.biz_name,
      medicalSubject: lead.medical_subject,
      category: lead.category,
      roadAddress: lead.road_address,
      lotAddress: lead.lot_address,
      phone: lead.phone,
      nearestStation: lead.nearest_station,
      stationLines: lead.station_lines,
      stationDistance: lead.station_distance,
      nearestExitNo: lead.nearest_exit_no,
    });

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '당신은 서울 지하철 광고 영업 전문가입니다. 항상 요청한 JSON 형태로만 응답하며, 한국어로 작성합니다.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      console.error(
        `[ai-proposal/generate] OpenAI 오류 ${aiRes.status}: ${errText.slice(0, 300)}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `AI 분석 생성에 실패했습니다. (HTTP ${aiRes.status})`,
        },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'AI 응답이 비어 있습니다.' },
        { status: 502 }
      );
    }

    // JSON 파싱 + 스키마 검증
    let analysis: AIAnalysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error('[ai-proposal/generate] AI 응답 JSON 파싱 실패:', content.slice(0, 300));
      return NextResponse.json(
        { success: false, error: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, analysis, leadId });
  } catch (error) {
    console.error('[ai-proposal/generate] 오류:', error);
    return NextResponse.json(
      { success: false, error: 'AI 상권분석 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
