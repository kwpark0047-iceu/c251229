/**
  * 지하철 광고 효과 및 ROI / 예상 노출수 연산 엔진
  */

import { AdInventory, Lead } from '@/app/lead-manager/types';

export interface AdRoiAnalysis {
  inventoryId: string;
  stationName: string;
  locationCode: string;
  adType: string;
  priceMonthly: number;
  monthlyImpressions: number; // 예상 월간 노출수 (명)
  dailyImpressions: number;   // 예상 일간 노출수 (명)
  cpm: number;                 // 1,000회 노출당 비용 (원)
  estimatedNewClients: number; // 예상 신규 고객 유입수 (명/월)
  roiScore: number;            // ROI 지수 (1~100)
  recommendationReason: string; // 추천 사유
}

/**
 * 역 등급 및 광고 유형에 따른 기본 월간 예상 노출수 (명/월)
 */
function getEstimatedMonthlyImpressions(gradeStr?: string, adType?: string): number {
  let base = 700000; // 기본 A등급 70만회

  if (gradeStr?.includes('SSA')) base = 1500000;
  else if (gradeStr?.includes('SA')) base = 1200000;
  else if (gradeStr?.includes('S')) base = 900000;
  else if (gradeStr?.includes('A')) base = 700000;
  else if (gradeStr?.includes('B')) base = 450000;
  else if (gradeStr?.includes('C')) base = 300000;

  // 조명광고는 시인성이 높아 노출 유효율 +20%
  if (adType?.includes('조명')) base *= 1.2;
  // 포스터광고는 동선 집중도가 높아 +10%
  else if (adType?.includes('포스터')) base *= 1.1;

  return Math.round(base);
}

/**
 * 특정 리드와 광고 매체에 대한 ROI 및 노출 효과 분석
 */
export function calculateAdRoi(lead: Lead, item: AdInventory, distanceMeters?: number): AdRoiAnalysis {
  const gradeMatch = item.description?.match(/(SSA|SA|S|A|B|C)등급/);
  const grade = gradeMatch ? gradeMatch[1] : 'A';

  const monthlyImpressions = getEstimatedMonthlyImpressions(grade, item.adType);
  const dailyImpressions = Math.round(monthlyImpressions / 30);
  const price = item.priceMonthly || 300000;

  // CPM = (월비용 / 월노출수) * 1000
  const cpm = Math.round((price / monthlyImpressions) * 1000);

  // 전환율 추정: 업종별 평균 타겟 반응율 (0.01% ~ 0.05%)
  let conversionRate = 0.0003; // 기본 0.03%
  if (lead.category === 'HEALTH') conversionRate = 0.0004;
  else if (lead.category === 'SPORTS' || lead.category === 'LIVING') conversionRate = 0.0005;

  const estimatedNewClients = Math.round(monthlyImpressions * conversionRate);

  // ROI Score (100점 만점)
  // 1) 거리 점수 (max 40)
  const dist = distanceMeters ?? item.spotPositionX ?? 300;
  const distScore = dist <= 200 ? 40 : dist <= 500 ? 30 : dist <= 800 ? 20 : 10;

  // 2) CPM 효율 점수 (max 40): CPM이 낮을수록 높음 (200원~800원 기준)
  const cpmScore = cpm <= 250 ? 40 : cpm <= 400 ? 32 : cpm <= 600 ? 24 : 15;

  // 3) 가용성 점수 (max 20): 즉시 가용 시 20점
  const availScore = item.availabilityStatus === 'AVAILABLE' ? 20 : 10;

  const roiScore = Math.min(100, distScore + cpmScore + availScore);

  let recommendationReason = '역세권 접근성과 합리적인 노출 단가를 갖춘 매체입니다.';
  if (dist <= 300 && item.availabilityStatus === 'AVAILABLE') {
    recommendationReason = '초역세권 위치에 즉시 게첨 가능한 최적의 프리미엄 매체입니다.';
  } else if (cpm <= 300) {
    recommendationReason = '1,000회 노출당 비용(CPM)이 매우 저렴하여 높은 ROI를 기대할 수 있습니다.';
  } else if (grade.includes('SA')) {
    recommendationReason = 'SA등급 주요 이동 동선에 위치하여 유동인구 집계 및 시인성이 뛰어납니다.';
  }

  return {
    inventoryId: item.id,
    stationName: item.stationName,
    locationCode: item.locationCode,
    adType: item.adType,
    priceMonthly: price,
    monthlyImpressions,
    dailyImpressions,
    cpm,
    estimatedNewClients,
    roiScore,
    recommendationReason,
  };
}
