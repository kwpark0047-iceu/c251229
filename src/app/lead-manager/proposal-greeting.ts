/** 서울 지하철 광고 영업 시스템 - 제안서 인사말 템플릿 서비스 */
import { Lead, AdInventory } from './types';export function getDefaultGreeting(
  bizName?: string,
  stationName?: string
): string {
  const name = bizName || '원장님';
  const station = stationName || '인근';

  return `${name} 원장님께,

안녕하세요. 서울 지하철 광고 영업팀입니다.

${station}역 인근에서 새로 개원하신 것을 진심으로 축하드립니다.

병원에서 도보 거리에 위치한 ${station}역에 현재 광고 가능한 최적의 위치가 있어 제안드립니다.

지하철역 광고는 매일 수만 명의 유동인구에게 자연스럽게 노출되어, 신규 개원 병원의 인지도 향상에 매우 효과적입니다.

첨부된 제안서를 검토해 주시고, 궁금하신 점이 있으시면 언제든 연락 주세요.

감사합니다.`;
}

export function generateCustomGreeting(
  lead: Lead,
  inventory: AdInventory[]
): string {
  const stationNames = [...new Set(inventory.map(i => i.stationName))];
  const stationText = stationNames.length > 1
    ? `${stationNames[0]} 외 ${stationNames.length - 1}개 역`
    : stationNames[0] || '인근역';

  const distance = lead.stationDistance
    ? `도보 ${Math.ceil(lead.stationDistance / 80)}분`
    : '도보 거리';

  const availableCount = inventory.filter(i => i.availabilityStatus === 'AVAILABLE').length;

  return `${lead.bizName} 원장님께,

안녕하세요. 서울 지하철 광고 영업팀입니다.

개원을 진심으로 축하드립니다!

병원에서 ${distance} 거리에 있는 ${stationText}에 현재 ${availableCount}개의 광고 가능 위치가 있어 특별히 제안드립니다.

해당 위치들은 출퇴근 시간대 유동인구가 집중되는 최적의 광고 위치로, 신규 개원 병원 홍보에 탁월한 효과를 보이고 있습니다.

첨부된 제안서에서 각 위치별 상세 정보와 가격을 확인하실 수 있습니다.

궁금하신 점이 있으시면 언제든 연락 주세요.

감사합니다.`;
}

