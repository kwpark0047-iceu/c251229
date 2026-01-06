/**
 * AI 자동추천 제안서 생성 API
 * POST /api/ai-proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStationsByNames, StationInfo } from '@/lib/kric-api';

interface ProposalRequest {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  businessType: string;
  adType: string;
  budget: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProposalRequest = await request.json();
    const supabase = await createClient();

    // 예산에 따른 추천 노선 결정
    const budgetLineMap: Record<string, string[]> = {
      '100만원 미만': ['8'],
      '100만원 ~ 500만원': ['7', '8'],
      '500만원 ~ 1,000만원': ['5', '7', '8'],
      '1,000만원 ~ 5,000만원': ['2', '5', '7'],
      '5,000만원 이상': ['1', '2', '5'],
      '미정': ['2', '5', '7'],
    };

    const recommendedLines = budgetLineMap[body.budget] || ['2', '5', '7'];

    // 광고 유형에 따른 매체 유형 결정
    const adTypeMediaMap: Record<string, string[]> = {
      '역사 내 포스터': ['조명광고', '포스터'],
      '스크린도어 광고': ['스크린도어'],
      '전동차 내부 광고': ['전동차내광고'],
      '디지털 사이니지': ['디지털사이니지', 'DID'],
      '역사 래핑': ['래핑광고', '역사래핑'],
      '기타': ['조명광고', '포스터', '스크린도어'],
    };

    const mediaTypes = adTypeMediaMap[body.adType] || ['조명광고', '포스터'];

    // 추천 인벤토리 조회 (노선 및 매체 유형 기준)
    const { data: inventoryData, error: invError } = await supabase
      .from('ad_inventory')
      .select('*')
      .in('line_number', recommendedLines)
      .limit(10);

    if (invError) {
      console.error('인벤토리 조회 오류:', invError);
    }

    // 추천 도면 조회
    const { data: floorPlansData, error: fpError } = await supabase
      .from('floor_plans')
      .select('*')
      .in('line_number', recommendedLines)
      .eq('plan_type', 'station_layout')
      .limit(6);

    if (fpError) {
      console.error('도면 조회 오류:', fpError);
    }

    // 노선별 역 정보 집계
    const stationsByLine: Record<string, string[]> = {};
    const inventory = inventoryData || [];

    inventory.forEach((item: any) => {
      const line = item.line_number || '기타';
      if (!stationsByLine[line]) {
        stationsByLine[line] = [];
      }
      if (item.station_name && !stationsByLine[line].includes(item.station_name)) {
        stationsByLine[line].push(item.station_name);
      }
    });

    // KRIC API로 역사 상세 정보 조회
    const allStationNames = Object.values(stationsByLine).flat();
    const stationInfoMap = await getStationsByNames(allStationNames);

    // 역사 정보 배열 생성
    const stationDetails: {
      stationName: string;
      lineNumber: string;
      address: string;
      englishName: string;
      latitude: string;
      longitude: string;
    }[] = [];

    stationInfoMap.forEach((info, name) => {
      stationDetails.push({
        stationName: name,
        lineNumber: info.lnCd,
        address: info.roadNmAdr || info.lonmAdr || '',
        englishName: info.stinNmEng || '',
        latitude: info.stinLocLat || '',
        longitude: info.stinLocLon || '',
      });
    });

    // 제안서 데이터 생성
    const proposal = {
      id: `PROP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      client: {
        name: body.name,
        company: body.company,
        phone: body.phone,
        email: body.email,
      },
      request: {
        adType: body.adType || '미지정',
        budget: body.budget || '미정',
        message: body.message,
      },
      recommendation: {
        lines: recommendedLines.map(line => ({
          number: line,
          name: `${line}호선`,
          stations: stationsByLine[line] || [],
        })),
        inventory: inventory.slice(0, 8).map((item: any) => ({
          id: item.id,
          stationName: item.station_name,
          lineNumber: item.line_number,
          mediaType: item.media_type,
          location: item.location,
          size: item.size,
          price: item.price,
          priceUnit: item.price_unit,
        })),
        floorPlans: (floorPlansData || []).map((plan: any) => ({
          id: plan.id,
          stationName: plan.station_name,
          lineNumber: plan.line_number,
          imageUrl: plan.image_url,
          planType: plan.plan_type,
        })),
        stationDetails, // KRIC API 역사 정보
      },
      summary: {
        totalMedia: inventory.length,
        totalStations: Object.values(stationsByLine).flat().length,
        estimatedBudget: body.budget,
        recommendedPeriod: '1개월',
      },
    };

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error) {
    console.error('제안서 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
