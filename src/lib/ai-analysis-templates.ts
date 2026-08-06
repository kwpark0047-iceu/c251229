/**
 * AI 상권분석 템플릿 기반 폴백
 *
 * OpenAI 등 AI 제공사 호출이 실패(billing 미등록, 네트워크 오류, 타임아웃 등)할 때
 * 업종별 분석 템플릿과 역별 유동인구 데이터로 AIAnalysis JSON을 생성합니다.
 * - @/ alias import 없음(순수 모듈) → 로컬 스크립트에서 직접 검증 가능
 * - AIAnalysis 스키마는 /api/ai-proposal/generate/route.ts와 동일
 */

/** 업종별 광고 분석 템플릿 (ai-proposal/route.ts businessAnalysisTemplates와 동일 구조) */
export const businessAnalysisTemplates: Record<
  string,
  {
    purpose: string[];
    targetAudience: string;
    keyPoints: string[];
    recommendedMedia: string[];
    expectedEffects: string[];
  }
> = {
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

/** 역별 유동인구·상권특성 맵 (서울 주요 역사) */
export const stationTrafficMap: Record<
  string,
  { dailyTraffic: number; characteristics: string }
> = {
  강남: { dailyTraffic: 180000, characteristics: '일 평균 유동인구 최상위, 직장인·유동층 혼합' },
  역삼: { dailyTraffic: 85000, characteristics: '의원·병원 밀집, 근거리 내원 가능성 높음' },
  삼성: { dailyTraffic: 120000, characteristics: '코엑스 인접, 비즈니스·쇼핑 복합지역' },
  선릉: { dailyTraffic: 95000, characteristics: '환승역 + 직장인 집중 지역' },
  논현: { dailyTraffic: 45000, characteristics: '고급 주거지역 + 상권 혼합' },
  서초: { dailyTraffic: 55000, characteristics: '법조타운 인근, 전문직 비중 높음' },
  교대: { dailyTraffic: 75000, characteristics: '환승역, 학원가 밀집' },
  고속터미널: { dailyTraffic: 150000, characteristics: '환승역 + 쇼핑몰, 유동인구 매우 높음' },
  양재: { dailyTraffic: 65000, characteristics: 'IT기업 밀집, 직장인 타겟 적합' },
  방배: { dailyTraffic: 35000, characteristics: '주거지역, 생활밀착 광고 효과적' },
  잠실: { dailyTraffic: 160000, characteristics: '롯데월드·잠실경기장, 가족·젊은층 혼합' },
  석촌: { dailyTraffic: 55000, characteristics: '호수공원 인근, 주말 유동인구 높음' },
  송파: { dailyTraffic: 40000, characteristics: '주거지역, 가족 단위 타겟' },
  문정: { dailyTraffic: 50000, characteristics: '법조단지, 전문직 비중 높음' },
  홍대입구: { dailyTraffic: 140000, characteristics: '20~30대 젊은층 집중, 상권 활성화' },
  합정: { dailyTraffic: 85000, characteristics: '환승역, 카페·맛집 밀집' },
  공덕: { dailyTraffic: 95000, characteristics: '환승역, 오피스·주거 복합' },
  상수: { dailyTraffic: 35000, characteristics: '감성 상권, 젊은 여성층 많음' },
  여의도: { dailyTraffic: 110000, characteristics: '금융·방송 중심지, 고소득 직장인' },
  영등포구청: { dailyTraffic: 65000, characteristics: '환승역, 상업지역' },
  당산: { dailyTraffic: 55000, characteristics: '환승역, 주거·상업 혼합' },
  신길: { dailyTraffic: 40000, characteristics: '주거지역, 생활권 광고 효과적' },
  용산: { dailyTraffic: 85000, characteristics: 'KTX역, 쇼핑몰 인접' },
  이태원: { dailyTraffic: 55000, characteristics: '외국인·젊은층, 글로벌 타겟' },
  삼각지: { dailyTraffic: 45000, characteristics: '환승역, 오피스 밀집' },
  종로3가: { dailyTraffic: 90000, characteristics: '환승역, 관광·상업 복합' },
  광화문: { dailyTraffic: 75000, characteristics: '관공서 밀집, 중장년층 비중 높음' },
  종각: { dailyTraffic: 85000, characteristics: '젊은 직장인, 회식·모임 문화' },
  안국: { dailyTraffic: 55000, characteristics: '관광지 인근, 문화예술 관심층' },
  명동: { dailyTraffic: 130000, characteristics: '관광·쇼핑 중심, 외국인 비중 높음' },
  서울역: { dailyTraffic: 170000, characteristics: 'KTX환승, 전국 단위 노출' },
  시청: { dailyTraffic: 80000, characteristics: '환승역, 관공서·오피스 밀집' },
  을지로입구: { dailyTraffic: 70000, characteristics: '금융가, 직장인 타겟' },
  왕십리: { dailyTraffic: 100000, characteristics: '환승역, 주거·상업 복합' },
  성수: { dailyTraffic: 75000, characteristics: '카페·스타트업 밀집, 2030 타겟' },
  뚝섬: { dailyTraffic: 45000, characteristics: '한강공원 인근, 레저 활동층' },
  건대입구: { dailyTraffic: 95000, characteristics: '환승역, 대학가·상권 활성화' },
  구의: { dailyTraffic: 35000, characteristics: '주거지역, 생활권 광고' },
  강변: { dailyTraffic: 65000, characteristics: '터미널 인근, 이동객 많음' },
  발산: { dailyTraffic: 55000, characteristics: '주거지역, 가족 타겟' },
  마곡: { dailyTraffic: 70000, characteristics: 'R&D단지, 젊은 직장인' },
  김포공항: { dailyTraffic: 85000, characteristics: '공항 이용객, 출장자' },
  가양: { dailyTraffic: 45000, characteristics: '주거지역 + 이마트 인근' },
  천호: { dailyTraffic: 80000, characteristics: '환승역, 동부권 중심' },
  강동: { dailyTraffic: 45000, characteristics: '주거지역, 생활권' },
  길동: { dailyTraffic: 30000, characteristics: '조용한 주거지역' },
  노원: { dailyTraffic: 85000, characteristics: '환승역, 학원가 밀집' },
  상계: { dailyTraffic: 45000, characteristics: '주거지역, 가족 타겟' },
  중계: { dailyTraffic: 35000, characteristics: '학원가, 학부모·학생 타겟' },
  수원: { dailyTraffic: 95000, characteristics: '환승역, 경기남부 중심' },
  모란: { dailyTraffic: 55000, characteristics: '환승역, 상업지역' },
  판교: { dailyTraffic: 75000, characteristics: 'IT기업 밀집, 고소득 직장인' },
  부천: { dailyTraffic: 50000, characteristics: '부천 중심가, 상업지역' },
  정발산: { dailyTraffic: 45000, characteristics: '일산 신도시, 가족 타겟' },
  화정: { dailyTraffic: 40000, characteristics: '주거지역, 생활권' },
};

/** BusinessCategory(영문) → 템플릿 키 매핑 */
const CATEGORY_TEMPLATE_KEY: Record<string, string> = {
  HEALTH: '의료/병원',
  EDUCATION: '학원/교육',
  FOOD: '음식점/카페',
  LIVING: '소매/유통',
  DISTRIBUTION: '소매/유통',
  CONSTRUCTION: '부동산',
  ANIMAL: '기타',
  CULTURE: '기타',
  SPORTS: '기타',
  TOURISM: '기타',
  ENVIRONMENT: '기타',
  OTHER: '기타',
  ALL: '기타',
};

/** medicalSubject 키워드로 템플릿 키 보정 */
function inferTemplateKeyFromMedicalSubject(medicalSubject?: string): string | null {
  if (!medicalSubject) return null;
  const s = medicalSubject;
  if (/(피부|성형|미용|두피)/.test(s)) return '뷰티/미용';
  if (/(치과|치의)/.test(s)) return '의료/병원';
  if (/(한의|정형|내과|외과|산부인|안과|이비인후)/.test(s)) return '의료/병원';
  if (/(학원|교육|입시|어학|요가|필라테스)/.test(s)) return '학원/교육';
  if (/(카페|커피|음식|식당|요리|베이커리)/.test(s)) return '음식점/카페';
  if (/(부동산|공인중개|임대)/.test(s)) return '부동산';
  if (/(세무|법률|변호사|회계)/.test(s)) return '법률/세무';
  if (/(보험|금융|대출)/.test(s)) return '금융/보험';
  return null;
}

/** 리드의 category/medicalSubject로 업종 템플릿 키 결정 */
export function resolveTemplateKey(lead: {
  category?: string;
  medicalSubject?: string;
}): string {
  const fromMedical = inferTemplateKeyFromMedicalSubject(lead.medicalSubject);
  if (fromMedical) return fromMedical;

  const fromCategory = lead.category ? CATEGORY_TEMPLATE_KEY[lead.category] : undefined;
  if (fromCategory) return fromCategory;

  return '기타';
}

/** AIAnalysis 타입 (generate/route.ts와 동일 스키마) */
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

/** 리드 정보 → 템플릿 기반 AIAnalysis 생성 (OpenAI 실패 시 폴백) */
export function buildTemplateAnalysis(lead: {
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
}): AIAnalysis {
  const template = businessAnalysisTemplates[resolveTemplateKey(lead)];
  const station = lead.nearestStation || '미정';
  const stationInfo = stationTrafficMap[station] || {
    dailyTraffic: 50000,
    characteristics: '역세권 상권, 유동인구 지속 발생',
  };
  const distance = lead.stationDistance
    ? lead.stationDistance < 1000
      ? `${lead.stationDistance}m`
      : `${(lead.stationDistance / 1000).toFixed(1)}km`
    : '미정';
  const lines = lead.stationLines?.length ? lead.stationLines : ['2'];
  const address = lead.roadAddress || lead.lotAddress || '미정';
  const bizName = lead.bizName || '업체';
  const type = lead.medicalSubject || lead.category || '일반 업종';

  return {
    businessOverview: {
      name: bizName,
      type,
      address,
      phone: lead.phone || '미정',
      summary: `${bizName}은(는) ${type} 업종으로, ${station}역 인근(${distance})에 위치합니다. ${template.targetAudience}를 주요 고객층으로 하며, 지하철 광고를 통한 반복 노출로 지역 내 인지도를 높이는 것이 효과적입니다.`,
    },
    stationAnalysis: {
      station,
      lines,
      trafficEstimate: `일 평균 유동인구 약 ${stationInfo.dailyTraffic.toLocaleString()}명 (서울 지하철 주요 역사 기준)`,
      characteristics: stationInfo.characteristics,
      distance: `사업장에서 ${station}역까지 약 ${distance} (출구: ${lead.nearestExitNo ? lead.nearestExitNo + '번' : '정보 없음'})`,
      recommendation: `${station}역은 유동인구가 높고 ${stationInfo.characteristics} 특성을 보여, ${type} 업종 광고 노출에 적합합니다. 생활권 반복 노출을 통해 자연스러운 인지도 상승을 기대할 수 있습니다.`,
    },
    marketAnalysis: {
      competitors: [
        `인근 ${type} 유사 업종 2~3곳`,
        '역세권 대형 브랜드',
        '온라인 중심 광고 경쟁 업체',
      ],
      demandLevel: `${station}역 주변 유동인구 약 ${stationInfo.dailyTraffic.toLocaleString()}명/일 기준 수요가 지속적으로 발생하는 상권입니다.`,
      targetCustomers: template.targetAudience,
      seasonality:
        '봄·가을 환절기 및 연말 시즌에 문의가 증가하며, 주말보다 평일 출퇴근 시간대 노출 효과가 높습니다.',
      strengths: [
        ...template.purpose,
        ...template.keyPoints,
      ],
      opportunities: [
        '역세권 경쟁 업체 대비 저렴한 CPM',
        '지역 밀착형 반복 노출 가능',
        '디지털사이니지 등 신규 매체 활용 가능',
        '계절·이벤트 연계 캠페인 가능',
      ],
    },
    recommendation: {
      mediaTypes: template.recommendedMedia,
      suggestedStations: [station],
      budgetPlan:
        '월 100만원 미만: 포스터광고 1~2면 / 월 100~500만원: 조명광고 1면 + 스크린도어 1면 / 월 500만원 이상: 프리미엄 조명광고 + 스크린도어 다면 구성',
      contractTip: '6개월 이상 계약 시 할인 협의 가능하며, 3개월 이상 계약 시 비용 효율이 증가합니다.',
    },
    expectedEffects: template.expectedEffects,
    summary: `${bizName}은(는) ${station}역 인근 ${type} 업종으로, 일 평균 ${stationInfo.dailyTraffic.toLocaleString()}명의 유동인구를 대상으로 ${template.recommendedMedia.join('·')}를 활용한 반복 노출 광고가 적합합니다. ${template.expectedEffects[0]}, ${template.expectedEffects[1]}의 효과를 기대할 수 있으며, 장기 계약 시 비용 효율이 극대화됩니다.`,
  };
}
