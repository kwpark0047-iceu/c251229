/**
 * AI 자동추천 제안서 생성 API
 * POST /api/ai-proposal
 *
 * 📌 AI 광고 추천 제안서 생성
 * ① 광고주 정보 요약
 * ② 광고 목적 분석 (업종별)
 * ③ 추천 매체
 * ④ AI 추천 역 TOP 2
 * ⑤ 예산 기반 구성안
 * ⑥ 기대 효과
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

// 서울 구별 주요 지하철역 매핑 (유동인구 순위 포함)
const districtStationMap: Record<string, {
  stations: { name: string; dailyTraffic: number; characteristics: string }[];
  lines: string[];
}> = {
  '강남구': {
    stations: [
      { name: '강남', dailyTraffic: 180000, characteristics: '일 평균 유동인구 최상위, 직장인·유동층 혼합' },
      { name: '역삼', dailyTraffic: 85000, characteristics: '의원·병원 밀집, 근거리 내원 가능성 높음' },
      { name: '삼성', dailyTraffic: 120000, characteristics: '코엑스 인접, 비즈니스·쇼핑 복합지역' },
      { name: '선릉', dailyTraffic: 95000, characteristics: '환승역 + 직장인 집중 지역' },
      { name: '논현', dailyTraffic: 45000, characteristics: '고급 주거지역 + 상권 혼합' },
    ],
    lines: ['2', '7', '9']
  },
  '서초구': {
    stations: [
      { name: '서초', dailyTraffic: 55000, characteristics: '법조타운 인근, 전문직 비중 높음' },
      { name: '교대', dailyTraffic: 75000, characteristics: '환승역, 학원가 밀집' },
      { name: '고속터미널', dailyTraffic: 150000, characteristics: '환승역 + 쇼핑몰, 유동인구 매우 높음' },
      { name: '양재', dailyTraffic: 65000, characteristics: 'IT기업 밀집, 직장인 타겟 적합' },
      { name: '방배', dailyTraffic: 35000, characteristics: '주거지역, 생활밀착 광고 효과적' },
    ],
    lines: ['2', '3']
  },
  '송파구': {
    stations: [
      { name: '잠실', dailyTraffic: 160000, characteristics: '롯데월드·잠실경기장, 가족·젊은층 혼합' },
      { name: '석촌', dailyTraffic: 55000, characteristics: '호수공원 인근, 주말 유동인구 높음' },
      { name: '송파', dailyTraffic: 40000, characteristics: '주거지역, 가족 단위 타겟' },
      { name: '문정', dailyTraffic: 50000, characteristics: '법조단지, 전문직 비중 높음' },
    ],
    lines: ['2', '8', '9']
  },
  '마포구': {
    stations: [
      { name: '홍대입구', dailyTraffic: 140000, characteristics: '20~30대 젊은층 집중, 상권 활성화' },
      { name: '합정', dailyTraffic: 85000, characteristics: '환승역, 카페·맛집 밀집' },
      { name: '공덕', dailyTraffic: 95000, characteristics: '환승역, 오피스·주거 복합' },
      { name: '상수', dailyTraffic: 35000, characteristics: '감성 상권, 젊은 여성층 많음' },
    ],
    lines: ['2', '5', '6']
  },
  '영등포구': {
    stations: [
      { name: '여의도', dailyTraffic: 110000, characteristics: '금융·방송 중심지, 고소득 직장인' },
      { name: '영등포구청', dailyTraffic: 65000, characteristics: '환승역, 상업지역' },
      { name: '당산', dailyTraffic: 55000, characteristics: '환승역, 주거·상업 혼합' },
      { name: '신길', dailyTraffic: 40000, characteristics: '주거지역, 생활권 광고 효과적' },
    ],
    lines: ['5', '9']
  },
  '용산구': {
    stations: [
      { name: '용산', dailyTraffic: 85000, characteristics: 'KTX역, 쇼핑몰 인접' },
      { name: '이태원', dailyTraffic: 55000, characteristics: '외국인·젊은층, 글로벌 타겟' },
      { name: '삼각지', dailyTraffic: 45000, characteristics: '환승역, 오피스 밀집' },
    ],
    lines: ['1', '4', '6']
  },
  '종로구': {
    stations: [
      { name: '종로3가', dailyTraffic: 90000, characteristics: '환승역, 관광·상업 복합' },
      { name: '광화문', dailyTraffic: 75000, characteristics: '관공서 밀집, 중장년층 비중 높음' },
      { name: '종각', dailyTraffic: 85000, characteristics: '젊은 직장인, 회식·모임 문화' },
      { name: '안국', dailyTraffic: 55000, characteristics: '관광지 인근, 문화예술 관심층' },
    ],
    lines: ['1', '3', '5']
  },
  '중구': {
    stations: [
      { name: '명동', dailyTraffic: 130000, characteristics: '관광·쇼핑 중심, 외국인 비중 높음' },
      { name: '서울역', dailyTraffic: 170000, characteristics: 'KTX환승, 전국 단위 노출' },
      { name: '시청', dailyTraffic: 80000, characteristics: '환승역, 관공서·오피스 밀집' },
      { name: '을지로입구', dailyTraffic: 70000, characteristics: '금융가, 직장인 타겟' },
    ],
    lines: ['1', '2', '4']
  },
  '성동구': {
    stations: [
      { name: '왕십리', dailyTraffic: 100000, characteristics: '환승역, 주거·상업 복합' },
      { name: '성수', dailyTraffic: 75000, characteristics: '카페·스타트업 밀집, 2030 타겟' },
      { name: '뚝섬', dailyTraffic: 45000, characteristics: '한강공원 인근, 레저 활동층' },
    ],
    lines: ['2', '5']
  },
  '광진구': {
    stations: [
      { name: '건대입구', dailyTraffic: 95000, characteristics: '환승역, 대학가·상권 활성화' },
      { name: '구의', dailyTraffic: 35000, characteristics: '주거지역, 생활권 광고' },
      { name: '강변', dailyTraffic: 65000, characteristics: '터미널 인근, 이동객 많음' },
    ],
    lines: ['2', '5', '7']
  },
  '강서구': {
    stations: [
      { name: '발산', dailyTraffic: 55000, characteristics: '주거지역, 가족 타겟' },
      { name: '마곡', dailyTraffic: 70000, characteristics: 'R&D단지, 젊은 직장인' },
      { name: '김포공항', dailyTraffic: 85000, characteristics: '공항 이용객, 출장자' },
      { name: '가양', dailyTraffic: 45000, characteristics: '주거지역 + 이마트 인근' },
    ],
    lines: ['5', '9']
  },
  '강동구': {
    stations: [
      { name: '천호', dailyTraffic: 80000, characteristics: '환승역, 동부권 중심' },
      { name: '강동', dailyTraffic: 45000, characteristics: '주거지역, 생활권' },
      { name: '길동', dailyTraffic: 30000, characteristics: '조용한 주거지역' },
    ],
    lines: ['5', '8']
  },
  '노원구': {
    stations: [
      { name: '노원', dailyTraffic: 85000, characteristics: '환승역, 학원가 밀집' },
      { name: '상계', dailyTraffic: 45000, characteristics: '주거지역, 가족 타겟' },
      { name: '중계', dailyTraffic: 35000, characteristics: '학원가, 학부모·학생 타겟' },
    ],
    lines: ['4', '7']
  },
  // 경기도
  '수원시': {
    stations: [
      { name: '수원', dailyTraffic: 95000, characteristics: '환승역, 경기남부 중심' },
    ],
    lines: ['1']
  },
  '성남시': {
    stations: [
      { name: '모란', dailyTraffic: 55000, characteristics: '환승역, 상업지역' },
      { name: '판교', dailyTraffic: 75000, characteristics: 'IT기업 밀집, 고소득 직장인' },
    ],
    lines: ['8', '신분당']
  },
  '부천시': {
    stations: [
      { name: '부천', dailyTraffic: 50000, characteristics: '부천 중심가, 상업지역' },
    ],
    lines: ['1', '7']
  },
  '고양시': {
    stations: [
      { name: '정발산', dailyTraffic: 45000, characteristics: '일산 신도시, 가족 타겟' },
      { name: '화정', dailyTraffic: 40000, characteristics: '주거지역, 생활권' },
    ],
    lines: ['3']
  },
};

// 업종별 광고 분석 템플릿
const businessAnalysisTemplates: Record<string, {
  purpose: string[];
  targetAudience: string;
  keyPoints: string[];
  recommendedMedia: string[];
  expectedEffects: string[];
}> = {
  '의료/병원': {
    purpose: [
      '생활권·근거리 반복 노출이 중요',
      '신규 환자 유입 + 브랜드 신뢰도 확보',
      '전문 진료과목 인지도 향상',
    ],
    targetAudience: '지역 주민, 직장인, 건강 관심층',
    keyPoints: [
      '보행 시 시선 높이에 위치',
      '반복 노출로 인지 효과 우수',
      '의료 업종 높은 적합도',
    ],
    recommendedMedia: ['조명광고', '스크린도어', '포스터광고'],
    expectedEffects: [
      '지역 내 병원 인지도 상승',
      '병원명 반복 각인',
      '검색·전화 문의 증가',
      '신규 환자 내원 유도',
    ],
  },
  '학원/교육': {
    purpose: [
      '학부모·학생 대상 집중 노출',
      '시즌별 모집 광고 효과 극대화',
      '교육 브랜드 신뢰도 구축',
    ],
    targetAudience: '학부모, 초중고 학생, 취업준비생',
    keyPoints: [
      '등하교 시간대 노출 극대화',
      '학원가 인근역 집중 배치',
      '시즌별 탄력 운영 가능',
    ],
    recommendedMedia: ['스크린도어', '조명광고', '디지털사이니지'],
    expectedEffects: [
      '학원 브랜드 인지도 상승',
      '수강 문의 증가',
      '시즌별 모집 성과 향상',
    ],
  },
  '부동산': {
    purpose: [
      '매물 정보 지역 타겟 노출',
      '부동산 브랜드 신뢰도 확보',
      '잠재 고객 관심 유도',
    ],
    targetAudience: '주거 이전 예정자, 신혼부부, 투자자',
    keyPoints: [
      '역세권 매물 연계 효과',
      '지역 밀착형 광고 효율',
      '고급 이미지 연출 가능',
    ],
    recommendedMedia: ['조명광고', '포스터광고', '래핑광고'],
    expectedEffects: [
      '매물 문의 증가',
      '브랜드 신뢰도 향상',
      '지역 내 인지도 상승',
    ],
  },
  '음식점/카페': {
    purpose: [
      '점포 인근 유동인구 유입',
      '신메뉴·이벤트 홍보',
      '브랜드 인지도 확대',
    ],
    targetAudience: '직장인, 젊은층, 가족 단위',
    keyPoints: [
      '점심·저녁 시간대 효과적',
      '역 출구 인근 매장 연계',
      '시즌 메뉴 홍보 적합',
    ],
    recommendedMedia: ['스크린도어', '디지털사이니지', '포스터광고'],
    expectedEffects: [
      '매장 방문객 증가',
      '신메뉴 인지도 상승',
      'SNS 바이럴 효과',
    ],
  },
  '소매/유통': {
    purpose: [
      '매장 방문 유도',
      '할인·이벤트 정보 전달',
      '브랜드 상기도 유지',
    ],
    targetAudience: '쇼핑 관심층, 주부, 젊은 여성',
    keyPoints: [
      '쇼핑 동선 상 노출',
      '세일 시즌 효과 극대화',
      '충동구매 유도',
    ],
    recommendedMedia: ['디지털사이니지', '스크린도어', '래핑광고'],
    expectedEffects: [
      '매장 유입 증가',
      '매출 상승',
      '브랜드 로열티 강화',
    ],
  },
  '금융/보험': {
    purpose: [
      '서비스 인지도 확보',
      '신뢰도 있는 이미지 구축',
      '상담 문의 유도',
    ],
    targetAudience: '직장인, 중장년층, 자산관리 관심층',
    keyPoints: [
      '비즈니스 지역 집중 배치',
      '고급스러운 광고 연출',
      '반복 노출로 신뢰 구축',
    ],
    recommendedMedia: ['조명광고', '디지털사이니지', '포스터광고'],
    expectedEffects: [
      '브랜드 신뢰도 상승',
      '상담 예약 증가',
      '고객 확보',
    ],
  },
  '뷰티/미용': {
    purpose: [
      '젊은 여성층 타겟 노출',
      '시술·서비스 인지도 확대',
      '예약 문의 유도',
    ],
    targetAudience: '20~40대 여성, 뷰티 관심층',
    keyPoints: [
      '쇼핑·상권 지역 효과적',
      '비포/애프터 시각적 효과',
      '시즌 이벤트 연계',
    ],
    recommendedMedia: ['디지털사이니지', '스크린도어', '조명광고'],
    expectedEffects: [
      '예약 문의 증가',
      '인스타그램 팔로워 증가',
      '신규 고객 확보',
    ],
  },
  '법률/세무': {
    purpose: [
      '전문성 및 신뢰도 어필',
      '상담 문의 유도',
      '지역 내 인지도 확보',
    ],
    targetAudience: '기업체, 자영업자, 법률 서비스 필요자',
    keyPoints: [
      '오피스·법조타운 지역 효과적',
      '전문적이고 신뢰감 있는 디자인',
      '장기 노출로 브랜드 각인',
    ],
    recommendedMedia: ['조명광고', '포스터광고'],
    expectedEffects: [
      '상담 문의 증가',
      '전문성 인지도 상승',
      '고객 신뢰도 확보',
    ],
  },
  '기타': {
    purpose: [
      '브랜드 인지도 확대',
      '타겟 고객층 노출',
      '광고 효과 극대화',
    ],
    targetAudience: '일반 대중',
    keyPoints: [
      '유동인구 높은 역사 선정',
      '시각적 임팩트 있는 디자인',
      '반복 노출 효과',
    ],
    recommendedMedia: ['조명광고', '스크린도어', '포스터광고'],
    expectedEffects: [
      '브랜드 인지도 상승',
      '고객 문의 증가',
      '매출 향상',
    ],
  },
};

// 예산별 추천 구성
const budgetPackages: Record<string, {
  monthlyBudget: string;
  recommendation: string[];
  contractTip: string;
}> = {
  '100만원 미만': {
    monthlyBudget: '약 50~100만원',
    recommendation: ['포스터광고 1~2면', '8호선/7호선 추천'],
    contractTip: '6개월 이상 계약 시 10% 할인',
  },
  '100만원 ~ 500만원': {
    monthlyBudget: '약 200~400만원',
    recommendation: ['조명광고 1~2면', '스크린도어 1~2면'],
    contractTip: '3개월 이상 계약 시 비용 효율 증가',
  },
  '500만원 ~ 1,000만원': {
    monthlyBudget: '약 500~800만원',
    recommendation: ['조명광고 2~3면', '스크린도어 2~4면', '포스터 추가 가능'],
    contractTip: '패키지 할인 적용 가능',
  },
  '1,000만원 ~ 5,000만원': {
    monthlyBudget: '약 1,500~3,000만원',
    recommendation: ['프리미엄 조명광고', '스크린도어 다면 구성', '디지털사이니지'],
    contractTip: '역사 독점 패키지 협의 가능',
  },
  '5,000만원 이상': {
    monthlyBudget: '5,000만원 이상',
    recommendation: ['역사 래핑', '전용 디지털존', '통합 미디어 믹스'],
    contractTip: '맞춤형 프리미엄 패키지 설계',
  },
  '미정': {
    monthlyBudget: '협의 필요',
    recommendation: ['조명광고 1면', '스크린도어 2면 (기본 구성)'],
    contractTip: '예산에 맞춘 최적 구성 제안',
  },
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

// 모든 역 목록
const allStationNames: string[] = Object.values(districtStationMap)
  .flatMap(d => d.stations.map(s => s.name));

// 메시지에서 역명 추출
function extractStationFromMessage(message: string): string | null {
  if (!message) return null;

  const stationMatch = message.match(/([가-힣]+)역/);
  if (stationMatch) {
    const stationName = stationMatch[1];
    if (allStationNames.includes(stationName)) {
      return stationName;
    }
  }

  for (const station of allStationNames) {
    if (message.includes(station)) {
      return station;
    }
  }

  return null;
}

// 메시지에서 지역 추출
function extractDistrictFromMessage(message: string): string | null {
  if (!message) return null;

  for (const district of Object.keys(districtStationMap)) {
    if (message.includes(district)) {
      return district;
    }
  }
  return null;
}

// 역명으로 노선번호 추출
function getStationLine(stationName: string): string | null {
  for (const [, info] of Object.entries(districtStationMap)) {
    const station = info.stations.find(s => s.name === stationName);
    if (station && info.lines.length > 0) {
      // 숫자 노선만 반환 (1, 2, 5, 7, 8호선)
      const numericLine = info.lines.find(l => /^\d+$/.test(l));
      return numericLine || info.lines[0];
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProposalRequest = await request.json();
    const supabase = await createClient();

    // 1. 주소/메시지에서 지역 및 역 추출
    const messageStation = extractStationFromMessage(body.message || '');
    const messageDistrict = extractDistrictFromMessage(body.message || '');
    const addressDistrict = extractDistrict(body.address || '');

    const targetDistrict = messageDistrict || addressDistrict;
    const districtInfo = targetDistrict ? districtStationMap[targetDistrict] : null;

    // 2. TOP 2 추천역 선정
    let topStations: { name: string; dailyTraffic: number; characteristics: string; rank: number }[] = [];

    if (messageStation && districtInfo) {
      // 요청한 역이 있으면 해당 역 + 인근 1개
      const requestedStation = districtInfo.stations.find(s => s.name === messageStation);
      if (requestedStation) {
        topStations.push({ ...requestedStation, rank: 1 });
      }
      const otherStations = districtInfo.stations
        .filter(s => s.name !== messageStation)
        .sort((a, b) => b.dailyTraffic - a.dailyTraffic);
      if (otherStations.length > 0) {
        topStations.push({ ...otherStations[0], rank: 2 });
      }
    } else if (districtInfo) {
      // 유동인구 순으로 TOP 2
      const sortedStations = [...districtInfo.stations]
        .sort((a, b) => b.dailyTraffic - a.dailyTraffic)
        .slice(0, 2);
      topStations = sortedStations.map((s, idx) => ({ ...s, rank: idx + 1 }));
    }

    // 3. 각 추천역의 도면 이미지 조회
    const stationFloorPlans: Record<string, { imageUrl: string; planType: string }[]> = {};

    for (const station of topStations) {
      // 역명으로 도면 검색 (노선번호 없이 역명만으로 검색)
      // 역명이 "강남"이면 "강남역", "강남" 모두 검색
      const stationNameVariants = [
        station.name,
        `${station.name}역`,
        station.name.replace('역', ''),
      ];

      let foundPlans: { imageUrl: string; planType: string }[] = [];

      for (const nameVariant of stationNameVariants) {
        if (foundPlans.length > 0) break;

        // 먼저 정확한 역명 매칭 시도
        const { data: exactMatch } = await supabase
          .from('floor_plans')
          .select('image_url, plan_type, station_name, line_number')
          .eq('station_name', nameVariant)
          .order('sort_order', { ascending: true })
          .limit(2);

        if (exactMatch && exactMatch.length > 0) {
          foundPlans = exactMatch.map(fp => ({
            imageUrl: fp.image_url,
            planType: fp.plan_type === 'psd' ? 'PSD도면' : '역구내도면',
          }));
          break;
        }

        // 정확한 매칭 실패 시 부분 매칭
        const { data: partialMatch } = await supabase
          .from('floor_plans')
          .select('image_url, plan_type, station_name, line_number')
          .ilike('station_name', `%${nameVariant}%`)
          .order('sort_order', { ascending: true })
          .limit(2);

        if (partialMatch && partialMatch.length > 0) {
          foundPlans = partialMatch.map(fp => ({
            imageUrl: fp.image_url,
            planType: fp.plan_type === 'psd' ? 'PSD도면' : '역구내도면',
          }));
        }
      }

      if (foundPlans.length > 0) {
        stationFloorPlans[station.name] = foundPlans;
      }
    }

    // 4. 업종 분석 정보
    const businessType = body.businessType || '기타';
    const businessAnalysis = businessAnalysisTemplates[businessType] || businessAnalysisTemplates['기타'];

    // 5. 예산 패키지
    const budgetKey = body.budget || '미정';
    const budgetPackage = budgetPackages[budgetKey] || budgetPackages['미정'];

    // 6. 추천 노선
    const recommendedLines = districtInfo?.lines || ['2', '5', '7'];

    // 7. 제안서 생성
    const proposal = {
      id: `PROP-${Date.now()}`,
      createdAt: new Date().toISOString(),

      // ① 광고주 정보 요약
      clientInfo: {
        company: body.company || body.name,
        businessType: body.businessType || '미지정',
        location: body.address || '미지정',
        contactPerson: body.name,
        phone: body.phone,
        email: body.email,
      },

      // ② 광고 목적 분석
      purposeAnalysis: {
        industry: body.businessType || '기타',
        purposes: businessAnalysis.purpose,
        targetAudience: businessAnalysis.targetAudience,
      },

      // ③ 추천 매체
      recommendedMedia: {
        mediaTypes: businessAnalysis.recommendedMedia,
        keyPoints: businessAnalysis.keyPoints,
        adType: body.adType || '미지정',
      },

      // ④ AI 추천 역 TOP 2
      topStations: topStations.map(station => ({
        rank: station.rank,
        stationName: station.name,
        dailyTraffic: station.dailyTraffic,
        characteristics: station.characteristics,
        lineNumbers: recommendedLines,
        floorPlans: stationFloorPlans[station.name] || [],
      })),

      // ⑤ 예산 기반 구성안
      budgetPlan: {
        inputBudget: body.budget || '미정',
        monthlyEstimate: budgetPackage.monthlyBudget,
        recommendation: budgetPackage.recommendation,
        contractTip: budgetPackage.contractTip,
      },

      // ⑥ 기대 효과
      expectedEffects: businessAnalysis.expectedEffects,

      // 추가 정보
      additionalInfo: {
        nearestDistrict: targetDistrict,
        recommendedLines: recommendedLines,
        userMessage: body.message,
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
