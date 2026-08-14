import { getSupabase } from '@/lib/supabase/utils';
import { LeadStatus } from './types';
import { ActivityService } from './activity-service';

/**
 * 리드 상태 업데이트 (+ 활동 로그 기록)
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    // 변경 전 상태 조회 (활동 로그용)
    const { data: current } = await supabase
      .from('leads')
      .select('status, biz_name')
      .eq('id', leadId)
      .single();

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) throw error;

    // 활동 로그 기록 (변경 전 상태와 다를 때만)
    if (current && current.status !== status) {
      await ActivityService.trackLeadStatusChange(
        leadId,
        current.biz_name || '리드',
        current.status as LeadStatus | undefined,
        status
      );
    }

    return { success: true, message: `리드 상태가 ${status}로 변경되었습니다.` };
  } catch (error) {
    console.error('Lead status update failed:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드 메모 업데이트 (+ 활동 로그 기록)
 */
export async function updateLeadNotes(
  leadId: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    // 리드명 조회 (활동 로그용)
    const { data: current } = await supabase
      .from('leads')
      .select('biz_name')
      .eq('id', leadId)
      .single();

    const { error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', leadId);

    if (error) throw error;

    await ActivityService.trackLeadNoteUpdate(leadId, current?.biz_name || '리드');

    return { success: true, message: '메모가 저장되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
