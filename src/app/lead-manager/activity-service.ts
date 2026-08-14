import { logActivity } from './auth-service';
import { getSupabase } from '@/lib/supabase/utils';
import { LeadStatus, ProposalStatus, CallOutcome, CALL_OUTCOME_LABELS } from './types';

/**
 * 활동 로그 엔트리 (activity_logs 행)
 */
export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  organization_id: string | null;
  action_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

/**
 * 전역 활동 추적 서비스 (Antigravity Analytics)
 */
export const ActivityService = {
  // --- 리드 관련 액션 ---
  trackLeadImport: async (count: number, category: string) => {
    await logActivity('LEAD_IMPORT', { 
      message: `신규 리드 ${count}건 유입 (${category})`,
      count, 
      category 
    });
  },

  trackLeadStatusChange: async (leadId: string, bizName: string, oldStatus: LeadStatus | undefined, newStatus: LeadStatus) => {
    await logActivity('LEAD_STATUS_UPDATE', { 
      message: `'${bizName}' 상태 변경: ${oldStatus || 'NEW'} -> ${newStatus}`,
      leadId, 
      bizName, 
      oldStatus, 
      newStatus 
    }, leadId);
  },

  trackLeadNoteUpdate: async (leadId: string, bizName: string) => {
    await logActivity('LEAD_NOTE_UPDATE', { 
      message: `'${bizName}' 리드 메모 수정`,
      leadId, 
      bizName 
    }, leadId);
  },

  trackCallLog: async (leadId: string, outcome: CallOutcome, notes?: string) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('leads')
      .select('biz_name')
      .eq('id', leadId)
      .single();

    await logActivity('CALL_LOG', {
      message: `'${data?.biz_name || '리드'}' 통화 기록 저장 (${CALL_OUTCOME_LABELS[outcome] || outcome})`,
      leadId,
      outcome,
      notes: notes || null,
    }, leadId);
  },

  // --- 제안서 관련 액션 ---
  trackProposalCreate: async (proposalId: string, leadId: string, bizName: string, title: string) => {
    await logActivity('PROPOSAL_CREATE', { 
      message: `'${bizName}' 대상 신규 제안서 생성: ${title}`,
      proposalId, 
      leadId, 
      bizName, 
      title 
    }, proposalId);
  },

  trackProposalSent: async (proposalId: string, leadId: string, bizName: string, recipient: string) => {
    await logActivity('PROPOSAL_SENT', { 
      message: `'${bizName}' 대상 제안서 발송 완료 (${recipient})`,
      proposalId, 
      leadId, 
      bizName, 
      recipient 
    }, proposalId);
  },

  trackProposalDownload: async (proposalId: string, bizName: string, title: string) => {
    await logActivity('PROPOSAL_DOWNLOAD', { 
      message: `'${bizName}' 제안서 PDF 다운로드: ${title}`,
      proposalId, 
      bizName, 
      title 
    }, proposalId);
  },

  // --- 시스템 관련 액션 ---
  trackSettingsUpdate: async (userId: string) => {
    await logActivity('SETTINGS_UPDATE', { 
      message: `시스템 개인 설정 변경`,
      userId 
    });
  }
};

/**
 * 특정 리드의 활동 타임라인 조회 (entity_id = leadId 또는 details.leadId)
 * 제안서 이벤트(PROPOSAL_*)는 entity_id가 proposalId이므로 details.leadId로 함께 조회
 */
export async function getLeadActivities(
  leadId: string,
  limit = 50
): Promise<ActivityLog[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .or(`entity_id.eq.${leadId},details->>leadId.eq.${leadId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ActivityLog[];
  } catch (error) {
    console.error('Failed to fetch lead activities:', error);
    return [];
  }
}
