/** 서울 지하철 광고 영업 시스템 - 제안서 접근 로그 서비스 */
import { getSupabase } from '@/lib/supabase/utils';export async function logProposalAccess(
  proposalId: string,
  actionType: 'VIEW' | 'DOWNLOAD',
  userInfo?: { email?: string; userId?: string }
): Promise<void> {
  const supabase = getSupabase();
  
  try {
    // 제안서 정보에서 조직 ID 가져오기
    const { data: proposal } = await supabase
      .from('proposals')
      .select('organization_id')
      .eq('id', proposalId)
      .single();

    if (!proposal) return;

    await supabase.from('proposal_logs').insert({
      proposal_id: proposalId,
      action_type: actionType,
      user_id: userInfo?.userId || null,
      user_email: userInfo?.email || null,
      organization_id: proposal.organization_id
    });
    
    // viewed_at 업데이트 (열람 시)
    if (actionType === 'VIEW') {
      await supabase
        .from('proposals')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', proposalId);
    }
  } catch (error) {
    console.error('Failed to log proposal access:', error);
  }
}

export async function getProposalLogs(proposalId: string): Promise<{
  success: boolean;
  logs: any[];
}> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('proposal_logs')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch proposal logs:', error);
    return { success: false, logs: [] };
  }

  return { success: true, logs: data || [] };
}

// mapProposalFromDB 함수는 utils/mapping-utils.ts로 이동됨

