/** 서울 지하철 광고 영업 시스템 - 제안서 효과 분석 서비스 */
import { AdInventory, Lead, EffectAnalysis } from './types';export function generateEffectAnalysis(
  inventory: AdInventory[],
  lead?: Lead
): EffectAnalysis {
  // 일일 통행량 합계
  const dailyImpressions = inventory.reduce(
    (sum, item) => sum + (item.trafficDaily || 50000),
    0
  );

  // 월간 도달 (일일 * 30 * 0.3 중복 제거)
  const monthlyReach = Math.round(dailyImpressions * 30 * 0.3);

  // 타겟 인구통계 추정
  const targetDemographics: string[] = [];
  if (lead?.medicalSubject) {
    if (lead.medicalSubject.includes('피부') || lead.medicalSubject.includes('성형')) {
      targetDemographics.push('20-40대 여성');
    }
    if (lead.medicalSubject.includes('치과')) {
      targetDemographics.push('전 연령대');
    }
    if (lead.medicalSubject.includes('한의')) {
      targetDemographics.push('30-60대');
    }
    if (lead.medicalSubject.includes('내과') || lead.medicalSubject.includes('정형')) {
      targetDemographics.push('40-60대');
    }
  }
  if (targetDemographics.length === 0) {
    targetDemographics.push('직장인', '학생', '주부');
  }

  // 예상 ROI
  const totalMonthlyPrice = inventory.reduce(
    (sum, item) => sum + (item.priceMonthly || 0),
    0
  );
  const costPerImpression = totalMonthlyPrice / (dailyImpressions * 30);
  const expectedROI = costPerImpression < 1
    ? '높음 (CPM < 1,000원)'
    : costPerImpression < 5
      ? '보통 (CPM 1,000~5,000원)'
      : '검토 필요';

  return {
    dailyImpressions,
    monthlyReach,
    targetDemographics,
    expectedROI,
  };
}

