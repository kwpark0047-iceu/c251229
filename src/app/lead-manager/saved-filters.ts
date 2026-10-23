import { CATEGORY_LABELS, type BusinessCategory, type LeadStatus, type ViewMode } from './types';

export interface FilterConditions {
  category: BusinessCategory;
  regions: readonly string[];
  status: LeadStatus | 'ALL';
  view: ViewMode;
  uncontacted: boolean;
  score: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterConditions;
}

export function filterStorageKey(userId: string, organizationId: string | null): string {
  return 'lead-manager:filters:v1:' + JSON.stringify([userId, organizationId]);
}

function conditions(value: unknown): FilterConditions {
  if (!value || typeof value !== 'object') throw Error('저장할 조건을 확인해주세요.');
  const v = value as Record<string, unknown>;
  if (typeof v.category !== 'string' || !Object.hasOwn(CATEGORY_LABELS, v.category)
    || typeof v.status !== 'string' || !['ALL', 'NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'].includes(v.status)
    || typeof v.view !== 'string' || !['grid', 'list', 'map'].includes(v.view)
    || !Array.isArray(v.regions) || !v.regions.length || v.regions.length > 2
    || v.regions.some(r => r !== '6110000' && r !== '6410000')
    || new Set(v.regions).size !== v.regions.length
    || typeof v.uncontacted !== 'boolean' || typeof v.score !== 'boolean') {
    throw Error('저장할 조건을 확인해주세요.');
  }
  // 검색어와 연락처 등 임의 속성은 저장 대상에 포함하지 않는다.
  return { category: v.category as BusinessCategory, regions: [...v.regions], status: v.status as FilterConditions['status'], view: v.view as ViewMode, uncontacted: v.uncontacted, score: v.score };
}

export function parseFilters(raw: string | null): SavedFilter[] {
  try {
    if (!raw || raw.length > 64000) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 10) return [];
    const ids = new Set<string>(), names = new Set<string>();
    return parsed.map(item => {
      if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 80
        || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 24
        || ids.has(item.id) || names.has(item.name.trim())) throw Error('Invalid saved filter');
      ids.add(item.id); names.add(item.name.trim());
      return { id: item.id, name: item.name.trim(), conditions: conditions(item.conditions) };
    });
  } catch { return []; }
}

export function addFilter(list: SavedFilter[], name: string, value: unknown, id: string): SavedFilter[] {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 24) throw Error('필터 이름을 1~24자로 입력해주세요.');
  if (list.length >= 10) throw Error('필터는 최대 10개까지 저장할 수 있습니다.');
  if (list.some(f => f.name === trimmed)) throw Error('이미 사용 중인 필터 이름입니다.');
  if (!id || id.length > 80 || list.some(f => f.id === id)) throw Error('필터 식별자를 확인해주세요.');
  return [...list, { id, name: trimmed, conditions: conditions(value) }];
}
