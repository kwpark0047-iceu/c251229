/**
 * 데이터 중복 방지 유틸리티
 * 더 강력한 중복 체크 로직
 */

import { Lead } from './types';
import { createLeadKey, normalizeLeadKey } from './lead-utils';

/**
 * 리드 데이터 중복 체크 결과
 */
interface DuplicateCheckResult {
  uniqueLeads: Lead[];
  duplicates: Lead[];
  duplicateCount: number;
  uniqueCount: number;
}

/**
 * 리드 데이터 중복 제거 (강화 버전)
 * - 상호명 + 주소 조합 체크
 * - 사업자 ID 체크
 * - 정규화된 문자열 비교
 * - 유사도 기반 중복 체크 (선택적)
 */
export function removeDuplicateLeads(
  leads: Lead[],
  options: {
    checkBizId?: boolean;
    checkSimilarity?: boolean;
    similarityThreshold?: number;
  } = {}
): DuplicateCheckResult {
  const {
    checkBizId = true,
    checkSimilarity = false,
    similarityThreshold = 0.8
  } = options;

  const seenKeys = new Set<string>();
  const seenBizIds = new Set<string>();
  const uniqueLeads: Lead[] = [];
  const duplicates: Lead[] = [];

  leads.forEach(lead => {
    // 기본 키 생성 (상호명 + 주소)
    const key = createLeadKey(lead.bizName, lead.roadAddress);
    
    // 사업자 ID 체크
    const hasBizId = checkBizId && lead.bizId;
    const bizIdDuplicate = hasBizId && seenBizIds.has(lead.bizId!);
    
    // 유사도 체크 (선택적)
    let isSimilar = false;
    if (checkSimilarity) {
      isSimilar = checkSimilarDuplicate(lead, uniqueLeads, similarityThreshold);
    }

    // 중복 여부 판단
    const isDuplicate = seenKeys.has(key) || bizIdDuplicate || isSimilar;

    if (isDuplicate) {
      duplicates.push(lead);
    } else {
      uniqueLeads.push(lead);
      seenKeys.add(key);
      if (hasBizId) {
        seenBizIds.add(lead.bizId!);
      }
    }
  });

  return {
    uniqueLeads,
    duplicates,
    duplicateCount: duplicates.length,
    uniqueCount: uniqueLeads.length
  };
}

/**
 * 유사도 기반 중복 체크
 * 레벤슈타인 거리 알고리즘 사용
 */
function checkSimilarDuplicate(
  lead: Lead,
  existingLeads: Lead[],
  threshold: number
): boolean {
  const leadName = normalizeLeadKey(lead.bizName);
  const leadAddress = normalizeLeadKey(lead.roadAddress);

  return existingLeads.some(existing => {
    const existingName = normalizeLeadKey(existing.bizName);
    const existingAddress = normalizeLeadKey(existing.roadAddress);

    // 이름 유사도 체크
    const nameSimilarity = calculateSimilarity(leadName, existingName);
    if (nameSimilarity >= threshold) {
      // 주소도 유사하면 중복으로 간주
      const addressSimilarity = calculateSimilarity(leadAddress, existingAddress);
      return addressSimilarity >= threshold * 0.8; // 주소는 약간 낮은 기준
    }

    return false;
  });
}

/**
 * 문자열 유사도 계산 (레벤슈타인 거리 기반)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * 리드 데이터 그룹화 (중복 그룹 찾기)
 */
export function groupDuplicateLeads(leads: Lead[]): Array<Lead[]> {
  const groups: Array<Lead[]> = [];
  const processed = new Set<string>();

  leads.forEach((lead, index) => {
    const leadKey = `${index}-${createLeadKey(lead.bizName, lead.roadAddress)}`;
    
    if (processed.has(leadKey)) return;

    const duplicateGroup = [lead];
    processed.add(leadKey);

    // 같은 그룹의 다른 리드 찾기
    leads.forEach((otherLead, otherIndex) => {
      if (index === otherIndex) return;

      const otherKey = `${otherIndex}-${createLeadKey(otherLead.bizName, otherLead.roadAddress)}`;
      
      if (processed.has(otherKey)) return;

      // 중복 체크
      const key = createLeadKey(lead.bizName, lead.roadAddress);
      const otherKeyNormalized = createLeadKey(otherLead.bizName, otherLead.roadAddress);
      
      if (key === otherKeyNormalized || 
          (lead.bizId && lead.bizId === otherLead.bizId)) {
        duplicateGroup.push(otherLead);
        processed.add(otherKey);
      }
    });

    if (duplicateGroup.length > 1) {
      groups.push(duplicateGroup);
    }
  });

  return groups;
}

/**
 * 중복 리드 병합 (가장 최신/정확한 데이터 유지)
 */
export function mergeDuplicateLeads(duplicateGroup: Lead[]): Lead {
  if (duplicateGroup.length === 1) {
    return duplicateGroup[0];
  }

  // 가장 정보가 많은 리드를 기준으로 선택
  const sortedLeads = duplicateGroup.sort((a, b) => {
    const scoreA = calculateDataScore(a);
    const scoreB = calculateDataScore(b);
    return scoreB - scoreA;
  });

  const baseLead = sortedLeads[0];
  const mergedLead = { ...baseLead };

  // 다른 리드에서 더 좋은 정보가 있으면 병합
  duplicateGroup.slice(1).forEach(lead => {
    // 좌표 정보 병합
    if (!mergedLead.latitude && lead.latitude) {
      mergedLead.latitude = lead.latitude;
      mergedLead.longitude = lead.longitude;
    }
    if (!mergedLead.coordX && lead.coordX) {
      mergedLead.coordX = lead.coordX;
      mergedLead.coordY = lead.coordY;
    }

    // 주소 정보 병합
    if (!mergedLead.roadAddress && lead.roadAddress) {
      mergedLead.roadAddress = lead.roadAddress;
    }
    if (!mergedLead.lotAddress && lead.lotAddress) {
      mergedLead.lotAddress = lead.lotAddress;
    }

    // 전화번호 병합
    if (!mergedLead.phone && lead.phone) {
      mergedLead.phone = lead.phone;
    }

    // 사업자 ID 병합
    if (!mergedLead.bizId && lead.bizId) {
      mergedLead.bizId = lead.bizId;
    }

    // 인허가일 병합
    if (!mergedLead.licenseDate && lead.licenseDate) {
      mergedLead.licenseDate = lead.licenseDate;
    }
  });

  return mergedLead;
}

/**
 * 리드 데이터 품질 점수 계산
 */
function calculateDataScore(lead: Lead): number {
  let score = 0;

  // 필수 정보
  if (lead.bizName) score += 10;
  if (lead.roadAddress) score += 8;
  if (lead.lotAddress) score += 5;

  // 위치 정보
  if (lead.latitude && lead.longitude) score += 8;
  if (lead.coordX && lead.coordY) score += 6;
  if (lead.nearestStation) score += 4;

  // 연락 정보
  if (lead.phone) score += 6;
  if (lead.bizId) score += 4;

  // 기타 정보
  if (lead.medicalSubject) score += 3;
  if (lead.licenseDate) score += 2;

  return score;
}

/**
 * 중복 통계 생성
 */
export function generateDuplicateStats(leads: Lead[]): {
  total: number;
  unique: number;
  duplicates: number;
  duplicateRate: number;
  duplicateGroups: Array<{
    leads: Lead[];
    count: number;
    representative: string;
  }>;
} {
  const result = removeDuplicateLeads(leads, { checkSimilarity: true });
  const groups = groupDuplicateLeads(leads);

  return {
    total: leads.length,
    unique: result.uniqueCount,
    duplicates: result.duplicateCount,
    duplicateRate: result.duplicateCount / leads.length,
    duplicateGroups: groups.map(group => ({
      leads: group,
      count: group.length,
      representative: group[0].bizName || '알 수 없음'
    }))
  };
}
