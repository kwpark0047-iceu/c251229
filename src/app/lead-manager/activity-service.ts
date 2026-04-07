import { logActivity } from './auth-service';
import { LeadStatus, ProposalStatus } from './types';

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
