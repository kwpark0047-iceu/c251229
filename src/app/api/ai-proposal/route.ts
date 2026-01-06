/**
 * AI 자동추천 제안서 생성 API
 * POST /api/ai-proposal
 *
 * 추천 로직:
 * 1. 주소 기반 가장 가까운 역 추천
 * 2. 업종별 맞춤 광고 위치 추천
 * 3. 예산 및 광고유형에 따른 매체 추천
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

// 서울 구별 주요 지하철역 매핑
const districtStationMap: Record<string, { stations: string[]; lines: string[] }> = {
  '강남구': { stations: ['강남', '역삼', '삼성', '선릉', '코엑스', '봉은사'], lines: ['2', '7'] },
  '서초구': { stations: ['서초', '교대', '방배', '양재', '남부터미널'], lines: ['2', '3'] },
  '송파구': { stations: ['잠실', '석촌', '송파', '가락시장', '문정'], lines: ['2', '8'] },
  '마포구': { stations: ['홍대입구', '합정', '상수', '마포', '공덕'], lines: ['2', '5', '6'] },
  '영등포구': { stations: ['여의도', '영등포구청', '당산', '신길'], lines: ['5', '9'] },
  '용산구': { stations: ['용산', '이태원', '삼각지', '녹사평'], lines: ['1', '6'] },
  '종로구': { stations: ['종로3가', '광화문', '안국', '종각', '을지로입구'], lines: ['1', '3', '5'] },
  '중구': { stations: ['명동', '을지로', '서울역', '시청', '동대문'], lines: ['1', '2', '4'] },
  '성동구': { stations: ['왕십리', '성수', '뚝섬', '한양대'], lines: ['2', '5'] },
  '광진구': { stations: ['건대입구', '구의', '강변', '아차산'], lines: ['2', '5', '7'] },
  '동대문구': { stations: ['청량리', '회기', '외대앞', '신설동'], lines: ['1', '2'] },
  '성북구': { stations: ['성신여대입구', '한성대입구', '길음', '돈암'], lines: ['4'] },
  '강북구': { stations: ['수유', '미아', '미아사거리'], lines: ['4'] },
  '노원구': { stations: ['노원', '상계', '중계', '마들'], lines: ['4', '7'] },
  '도봉구': { stations: ['도봉산', '방학', '창동'], lines: ['1', '4'] },
  '은평구': { stations: ['연신내', '불광', '녹번', '응암'], lines: ['3', '6'] },
  '서대문구': { stations: ['신촌', '이대', '아현', '충정로'], lines: ['2', '5'] },
  '관악구': { stations: ['서울대입구', '낙성대', '신림'], lines: ['2'] },
  '동작구': { stations: ['사당', '이수', '노량진', '신대방'], lines: ['2', '4', '7'] },
  '금천구': { stations: ['가산디지털단지', '독산', '금천구청'], lines: ['1', '7'] },
  '구로구': { stations: ['구로디지털단지', '신도림', '대림'], lines: ['1', '2', '7'] },
  '양천구': { stations: ['목동', '오목교', '양천구청'], lines: ['5'] },
  '강서구': { stations: ['발산', '마곡', '김포공항', '가양'], lines: ['5', '9'] },
  '강동구': { stations: ['천호', '강동', '길동', '명일'], lines: ['5', '8'] },
  // 경기도 주요 지역
  '수원시': { stations: ['수원', '화서', '영통'], lines: ['1'] },
  '성남시': { stations: ['모란', '수진', '판교', '야탑'], lines: ['8'] },
  '부천시': { stations: ['부천', '중동', '상동', '소사'], lines: ['1', '7'] },
  '고양시': { stations: ['화정', '백석', '마두', '정발산'], lines: ['3'] },
  '인천시': { stations: ['부평', '인천', '주안', '송도'], lines: ['1', '7'] },
};

// 업종별 추천 역 특성
const businessTypeStationMap: Record<string, { preferHighTraffic: boolean; keywords: string[] }> = {
  '의료/병원': { preferHighTraffic: false, keywords: ['대학병원', '의료'] },
  '학원/교육': { preferHighTraffic: true, keywords: ['대학', '학교', '학원가'] },
  '부동산': { preferHighTraffic: true, keywords: [] },
  '음식점/카페': { preferHighTraffic: true, keywords: ['상권', '번화가'] },
  '소매/유통': { preferHighTraffic: true, keywords: ['쇼핑', '백화점', '시장'] },
  '금융/보험': { preferHighTraffic: true, keywords: ['오피스', '비즈니스'] },
  '뷰티/미용': { preferHighTraffic: true, keywords: ['쇼핑', '상권'] },
  '법률/세무': { preferHighTraffic: false, keywords: ['오피스', '법원'] },
  '기타': { preferHighTraffic: true, keywords: [] },
};

// 주소에서 구/시 추출
function extractDistrict(address: string): string | null {
  for (const district of Object.keys(districtStationMap)) {
    if (address.includes(district)) {
      return district;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProposalRequest = await request.json();
    const supabase = await createClient();

    // 1. 주소 기반 가장 가까운 역 찾기
    const district = extractDistrict(body.address || '');
    const nearbyInfo = district ? districtStationMap[district] : null;

    // 가까운 역 기반 추천 노선 결정
    let recommendedLines: string[] = nearbyInfo?.lines || ['2', '5', '7'];
    let nearestStations: string[] = nearbyInfo?.stations || [];

    // 2. 예산에 따른 노선 필터링
    const budgetLineMap: Record<string, string[]> = {
      '100만원 미만': ['8', '7'],
      '100만원 ~ 500만원': ['7', '8', '5'],
      '500만원 ~ 1,000만원': ['5', '7', '8', '2'],
      '1,000만원 ~ 5,000만원': ['2', '5', '7', '1'],
      '5,000만원 이상': ['1', '2', '5'],
      '미정': ['2', '5', '7'],
    };

    const budgetLines = budgetLineMap[body.budget] || ['2', '5', '7'];

    // 가까운 역의 노선과 예산 노선의 교집합
    if (nearbyInfo) {
      recommendedLines = recommendedLines.filter(line => budgetLines.includes(line));
      if (recommendedLines.length === 0) {
        recommendedLines = nearbyInfo.lines.slice(0, 2);
      }
    } else {
      recommendedLines = budgetLines;
    }

    // 3. 광고 유형에 따른 매체 유형 결정
    const adTypeMediaMap: Record<string, string[]> = {
      '역사 내 포스터': ['조명광고', '포스터'],
      '스크린도어 광고': ['스크린도어'],
      '전동차 내부 광고': ['전동차내광고'],
      '디지털 사이니지': ['디지털사이니지', 'DID'],
      '역사 래핑': ['래핑광고', '역사래핑'],
      '기타': ['조명광고', '포스터', '스크린도어'],
    };

    const mediaTypes = adTypeMediaMap[body.adType] || ['조명광고', '포스터'];

    // 4. 업종별 추천 로직
    const businessPref = businessTypeStationMap[body.businessType] || { preferHighTraffic: true, keywords: [] };

    // 5. 추천 인벤토리 조회 (가까운 역 우선 + 노선 기준)
    let inventoryQuery = supabase
      .from('ad_inventory')
      .select('*')
      .in('line_number', recommendedLines);

    // 가까운 역이 있으면 해당 역 우선 조회
    if (nearestStations.length > 0) {
      inventoryQuery = inventoryQuery.in('station_name', nearestStations);
    }

    const { data: nearbyInventory, error: nearbyError } = await inventoryQuery.limit(10);

    // 가까운 역 인벤토리가 부족하면 노선 전체에서 추가 조회
    let inventoryData = nearbyInventory || [];
    if (inventoryData.length < 5) {
      const { data: additionalInventory } = await supabase
        .from('ad_inventory')
        .select('*')
        .in('line_number', recommendedLines)
        .limit(10 - inventoryData.length);

      if (additionalInventory) {
        // 중복 제거 후 병합
        const existingIds = new Set(inventoryData.map((item: any) => item.id));
        inventoryData = [
          ...inventoryData,
          ...additionalInventory.filter((item: any) => !existingIds.has(item.id))
        ];
      }
    }

    const invError = nearbyError;

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

    // 추천 이유 생성
    const recommendationReason = district
      ? `${district} 지역 인근 역사를 중심으로 ${body.businessType || '고객'} 업종에 적합한 광고 위치를 추천드립니다.`
      : `${body.businessType || '고객'} 업종과 ${body.budget || '예산'} 기준으로 효과적인 광고 위치를 추천드립니다.`;

    // 제안서 데이터 생성
    const proposal = {
      id: `PROP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      client: {
        name: body.name,
        company: body.company,
        phone: body.phone,
        email: body.email,
        address: body.address,
        businessType: body.businessType,
      },
      request: {
        adType: body.adType || '미지정',
        budget: body.budget || '미정',
        message: body.message,
      },
      recommendation: {
        reason: recommendationReason,
        nearestDistrict: district,
        nearestStations: nearestStations.slice(0, 5),
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
