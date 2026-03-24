import { getSupabase } from '@/lib/supabase/utils';
import { LeadStatus } from './types';

/**
 * 리드 상태 업데이트
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) throw error;
    
    return { success: true, message: `리드 상태가 ${status}로 변경되었습니다.` };
  } catch (error) {
    console.error('Lead status update failed:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드 메모 업데이트
 */
export async function updateLeadNotes(
  leadId: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true, message: '메모가 저장되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
