import { getSupabase } from '@/lib/supabase/utils';
import { toLeadDbRow } from './lead-db-mapper';
import type { Lead } from './types';

// SOPO 보강 정보만 수정하여 동시 편집 중인 영업 상태와 담당자를 보존합니다.
export async function saveSopoLead(lead: Lead): Promise<void> {
  if (!lead.organizationId || !lead.sopoBizesId) throw new Error('저장할 리드의 조직 또는 상가정보가 없습니다.');
  const updates = Object.fromEntries(Object.entries(toLeadDbRow(lead, lead.organizationId))
    .filter(([key]) => key.startsWith('sopo_')));
  const { data, error } = await getSupabase().from('leads').update(updates)
    .eq('id', lead.id).eq('organization_id', lead.organizationId).select('id').single();
  if (error || !data) throw new Error('상가정보를 저장하지 못했습니다. 권한과 데이터베이스 구성을 확인해 주세요.');
}
