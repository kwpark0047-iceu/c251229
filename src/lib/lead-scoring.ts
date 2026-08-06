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
 * 리드 스코어링 로직 (휴리스틱 기반)
 * @param input 평가 요소 (거리, 업종, 데이터 완전성)
 * @returns 점수와 등급
 */
export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  let score = 0;

  // 1. 역세권 거리 가점 (Max 40점)
  // 초역세권(0~300m): 40점
  // 역세권(300~700m): 30점
  // 도보권(700~1500m): 20점
  // 기타(1500m 초과): 10점
  // 미정: 0점
  if (typeof input.distance === 'number') {
    if (input.distance <= 300) score += 40;
    else if (input.distance <= 700) score += 30;
    else if (input.distance <= 1500) score += 20;
    else score += 10;
  }

  // 2. 업종별 가점 (Max 30점)
  // 병원/의원(HEALTH): 객단가가 높고 광고 수요가 많음 -> 30점
  // 약국, 한의원(동물병원 포함 ANIMAL): 20점
  // 요식업, 미용(FOOD, LIVING): 10점
  // 기타: 5점
  if (input.category) {
    if (input.category === 'HEALTH') score += 30;
    else if (input.category === 'ANIMAL' || input.category === 'CULTURE') score += 20;
    else if (input.category === 'FOOD' || input.category === 'LIVING') score += 10;
    else score += 5;
  }

  // 3. 데이터 완전성 가점 (Max 30점)
  // 전화번호 있음: 15점
  // 상세 주소 있음: 10점
  // 상호명 명확함: 5점
  if (input.phone && input.phone.trim().length > 5) score += 15;
  if (input.address && input.address.trim().length > 5) score += 10;
  if (input.bizName && input.bizName.trim().length > 1) score += 5;

  // 점수 상한 및 등급 산정
  score = Math.min(Math.max(score, 0), 100);

  let grade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else grade = 'D';

  return { score, grade };
}
