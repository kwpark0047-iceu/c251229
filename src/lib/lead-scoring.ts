export interface LeadScoreInput {
  distance?: number | null;        // 지하철역과의 거리 (미터)
  category?: string | null;        // 업종 카테고리
  phone?: string | null;           // 전화번호
  address?: string | null;         // 주소
  bizName?: string | null;         // 상호명
}

export interface LeadScoreResult {
  score: number; // 0 ~ 100
  grade: 'A' | 'B' | 'C' | 'D';
}

/**
 * 리드 스코어링 가중치 설정 (조직별 커스터마이징 가능)
 * 각 섹션의 max는 최대 배점, 상세 항목은 max에 비례해 자동 스케일링된다.
 */
export interface ScoreConfig {
  distance: {
    max: number;       // 역세권 거리 최대 배점 (기본 40)
    within300: number; // 0~300m (초역세권)
    within700: number; // 300~700m (역세권)
    within1500: number; // 700~1500m (도보권)
    over1500: number;  // 1500m 초과
  };
  category: {
    max: number;       // 업종별 최대 배점 (기본 30)
    health: number;    // 병원/의원
    animalCulture: number; // 약국·한의원·동물병원, 문화
    foodLiving: number; // 요식업·미용
    other: number;     // 기타
  };
  completeness: {
    max: number;       // 데이터 완전성 최대 배점 (기본 30)
    phone: number;     // 전화번호 있음
    address: number;   // 상세 주소 있음
    businessName: number; // 상호명 명확함
  };
}

/** 기본 스코어링 가중치 (기존 하드코딩 값과 동일) */
export const DEFAULT_SCORING_CONFIG: ScoreConfig = {
  distance: { max: 40, within300: 40, within700: 30, within1500: 20, over1500: 10 },
  category: { max: 30, health: 30, animalCulture: 20, foodLiving: 10, other: 5 },
  completeness: { max: 30, phone: 15, address: 10, businessName: 5 },
};

/**
 * 부분 config를 완전한 ScoreConfig로 정규화한다.
 * max만 지정하면 상세 항목 점수는 max에 비례해 자동 계산된다.
 * (org DB에 {distance:{max}, category:{max}, completeness:{max}} 형태로 저장해도 동작하도록)
 */
export function normalizeScoreConfig(config?: Partial<ScoreConfig> | null): ScoreConfig {
  if (!config) return DEFAULT_SCORING_CONFIG;

  const d: ScoreConfig['distance'] = config.distance ?? DEFAULT_SCORING_CONFIG.distance;
  const dMax = typeof d.max === 'number' && d.max > 0 ? d.max : DEFAULT_SCORING_CONFIG.distance.max;
  const c: ScoreConfig['category'] = config.category ?? DEFAULT_SCORING_CONFIG.category;
  const cMax = typeof c.max === 'number' && c.max > 0 ? c.max : DEFAULT_SCORING_CONFIG.category.max;
  const p: ScoreConfig['completeness'] = config.completeness ?? DEFAULT_SCORING_CONFIG.completeness;
  const pMax =
    typeof p.max === 'number' && p.max > 0 ? p.max : DEFAULT_SCORING_CONFIG.completeness.max;

  return {
    distance: {
      max: dMax,
      within300: typeof d.within300 === 'number' ? d.within300 : Math.round(dMax),
      within700: typeof d.within700 === 'number' ? d.within700 : Math.round(dMax * 0.75),
      within1500: typeof d.within1500 === 'number' ? d.within1500 : Math.round(dMax * 0.5),
      over1500: typeof d.over1500 === 'number' ? d.over1500 : Math.round(dMax * 0.25),
    },
    category: {
      max: cMax,
      health: typeof c.health === 'number' ? c.health : Math.round(cMax),
      animalCulture:
        typeof c.animalCulture === 'number' ? c.animalCulture : Math.round(cMax * 0.67),
      foodLiving: typeof c.foodLiving === 'number' ? c.foodLiving : Math.round(cMax * 0.33),
      other: typeof c.other === 'number' ? c.other : Math.max(1, Math.round(cMax * 0.17)),
    },
    completeness: {
      max: pMax,
      phone: typeof p.phone === 'number' ? p.phone : Math.max(1, Math.round(pMax * 0.5)),
      address: typeof p.address === 'number' ? p.address : Math.max(1, Math.round(pMax * 0.33)),
      businessName:
        typeof p.businessName === 'number'
          ? p.businessName
          : Math.max(1, Math.round(pMax * 0.17)),
    },
  };
}

/**
 * 리드 스코어링 로직 (휴리스틱 기반)
 * @param input 평가 요소 (거리, 업종, 데이터 완전성)
 * @param config 가중치 설정 (생략 시 DEFAULT_SCORING_CONFIG)
 * @returns 점수와 등급
 */
export function calculateLeadScore(
  input: LeadScoreInput,
  config: Partial<ScoreConfig> | null = null,
): LeadScoreResult {
  const w = normalizeScoreConfig(config);
  let score = 0;

  // 1. 역세권 거리 가점
  // 초역세권(0~300m), 역세권(300~700m), 도보권(700~1500m), 기타(1500m 초과), 미정: 0점
  if (typeof input.distance === 'number') {
    if (input.distance <= 300) score += w.distance.within300;
    else if (input.distance <= 700) score += w.distance.within700;
    else if (input.distance <= 1500) score += w.distance.within1500;
    else score += w.distance.over1500;
  }

  // 2. 업종별 가점
  // 병원/의원(HEALTH): 객단가 높고 광고 수요 많음
  // 약국·한의원·동물병원(ANIMAL), 문화(CULTURE)
  // 요식업·미용(FOOD, LIVING)
  // 기타
  if (input.category) {
    if (input.category === 'HEALTH') score += w.category.health;
    else if (input.category === 'ANIMAL' || input.category === 'CULTURE') {
      score += w.category.animalCulture;
    } else if (input.category === 'FOOD' || input.category === 'LIVING') {
      score += w.category.foodLiving;
    } else score += w.category.other;
  }

  // 3. 데이터 완전성 가점
  if (input.phone && input.phone.trim().length > 5) score += w.completeness.phone;
  if (input.address && input.address.trim().length > 5) score += w.completeness.address;
  if (input.bizName && input.bizName.trim().length > 1) score += w.completeness.businessName;

  // 점수 상한 및 등급 산정
  score = Math.min(Math.max(score, 0), 100);

  let grade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else grade = 'D';

  return { score, grade };
}