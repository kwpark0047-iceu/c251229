/**
 * 서울 지하철 광고 영업 시스템 - CRM 서비스
 * 통화 기록, 진행 상황 관리, 이메일 연동
 */

import { getSupabase } from '@/lib/supabase/utils';
import {
  CallLog,
  CallOutcome,
  SalesProgress,
  ProgressStep,
  LeadWithCRM,
  Lead,
  Proposal,
} from './types';
import { getOrganizationId } from './auth-service';

// ============================================
// 통화 기록
// ============================================

/**
 * 통화 기록 저장
 */
export async function logCall(
  leadId: string,
  outcome: CallOutcome,
  options?: {
    durationSeconds?: number;
    contactPerson?: string;
    notes?: string;
    nextAction?: string;
    nextContactDate?: string;
  }
): Promise<{ success: boolean; callLog?: CallLog; message: string }> {
  try {
    const supabase = getSupabase();
    const orgId = await getOrganizationId();

    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        lead_id: leadId,
        outcome,
        duration_seconds: options?.durationSeconds || null,
        contact_person: options?.contactPerson || null,
        notes: options?.notes || null,
        next_action: options?.nextAction || null,
        next_contact_date: options?.nextContactDate || null,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // 통화 결과에 따라 리드 상태 업데이트
    if (outcome === 'INTERESTED' || outcome === 'MEETING_SCHEDULED') {
      await supabase
        .from('leads')
        .update({ status: 'CONTACTED' })
        .eq('id', leadId);
    }

    return {
      success: true,
      callLog: mapCallLogFromDB(data),
      message: '통화 기록이 저장되었습니다.',
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드의 통화 기록 조회
 */
export async function getCallLogs(leadId: string): Promise<CallLog[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('call_logs')
    .select('*')
    .eq('lead_id', leadId)
    .order('called_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapCallLogFromDB);
}

/**
 * 오늘 콜백 예정 리드 조회
 */
export async function getTodayCallbacks(): Promise<Array<{
  callLog: CallLog;
  lead: Lead;
}>> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      *,
      leads (
        id,
        biz_name,
        phone,
        road_address,
        nearest_station,
        status
      )
    `)
    .eq('next_contact_date', today)
    .not('next_contact_date', 'is', null)
    .order('next_contact_date', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .filter(row => row.leads) // leads가 있는 것만
    .map(row => {
      const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      return {
        callLog: mapCallLogFromDB(row),
        lead: {
          id: lead.id as string,
          bizName: lead.biz_name as string,
          phone: lead.phone as string | undefined,
          roadAddress: lead.road_address as string | undefined,
          nearestStation: lead.nearest_station as string | undefined,
          status: lead.status as Lead['status'],
        },
      };
    });
}

/**
 * 이번 주 콜백 예정 리드 조회
 */
export async function getWeekCallbacks(): Promise<Array<{
  callLog: CallLog;
  lead: Lead;
}>> {
  const supabase = getSupabase();
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startDate = startOfWeek.toISOString().split('T')[0];
  const endDate = endOfWeek.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      *,
      leads (
        id,
        biz_name,
        phone,
        road_address,
        nearest_station,
        status
      )
    `)
    .gte('next_contact_date', startDate)
    .lte('next_contact_date', endDate)
    .not('next_contact_date', 'is', null)
    .order('next_contact_date', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .filter(row => row.leads)
    .map(row => {
      const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      return {
        callLog: mapCallLogFromDB(row),
        lead: {
          id: lead.id as string,
          bizName: lead.biz_name as string,
          phone: lead.phone as string | undefined,
          roadAddress: lead.road_address as string | undefined,
          nearestStation: lead.nearest_station as string | undefined,
          status: lead.status as Lead['status'],
        },
      };
    });
}

/**
 * 오늘 콜백 예정 리드 조회 (리드 정보 포함)
 */
export async function getTodayCallbacks(): Promise<Array<{
  callLog: CallLog;
  lead: Lead;
}>> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      *,
      leads (
        id,
        biz_name,
        phone,
        road_address,
        nearest_station,
        status
      )
    `)
    .eq('next_contact_date', today)
    .not('next_contact_date', 'is', null)
    .order('next_contact_date', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .filter(row => row.leads) // leads가 있는 것만
    .map(row => {
      const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      return {
        callLog: mapCallLogFromDB(row),
        lead: {
          id: lead.id as string,
          bizName: lead.biz_name as string,
          phone: lead.phone as string | undefined,
          roadAddress: lead.road_address as string | undefined,
          nearestStation: lead.nearest_station as string | undefined,
          status: lead.status as Lead['status'],
        },
      };
    });
}

// ============================================
// 진행 상황 관리
// ============================================

/**
 * 진행 단계 업데이트
 */
export async function updateProgress(
  leadId: string,
  step: ProgressStep,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const orgId = await getOrganizationId();

    const { error } = await supabase
      .from('sales_progress')
      .upsert({
        lead_id: leadId,
        step,
        completed_at: new Date().toISOString(),
        notes: notes || null,
        organization_id: orgId,
      }, { onConflict: 'lead_id,step' });

    if (error) {
      return { success: false, message: error.message };
    }

    // 마지막 단계면 리드 상태를 계약성사로 변경
    if (step === 'CONTRACT_SIGNED') {
      await supabase
        .from('leads')
        .update({ status: 'CONTRACTED' })
        .eq('id', leadId);
    }

    return { success: true, message: '진행 상황이 업데이트되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 진행 단계 제거 (체크 해제)
 */
export async function removeProgress(
  leadId: string,
  step: ProgressStep
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('sales_progress')
      .delete()
      .eq('lead_id', leadId)
      .eq('step', step);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '진행 상황이 업데이트되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드의 진행 상황 조회
 */
export async function getProgress(leadId: string): Promise<SalesProgress[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('sales_progress')
    .select('*')
    .eq('lead_id', leadId);

  if (error || !data) {
    return [];
  }

  return data.map(row => ({
    id: row.id,
    leadId: row.lead_id,
    step: row.step as ProgressStep,
    completedAt: row.completed_at,
    notes: row.notes,
  }));
}

/**
 * 여러 리드의 진행 상황 일괄 조회 (API 호출 최적화)
 */
export async function getProgressBatch(leadIds: string[]): Promise<Map<string, SalesProgress[]>> {
  const result = new Map<string, SalesProgress[]>();

  if (leadIds.length === 0) {
    return result;
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('sales_progress')
    .select('*')
    .in('lead_id', leadIds);

  if (error || \!data) {
    leadIds.forEach(id => result.set(id, []));
    return result;
  }

  // leadId별로 그룹화
  leadIds.forEach(id => result.set(id, []));

  data.forEach(row => {
    const progress: SalesProgress = {
      id: row.id,
      leadId: row.lead_id,
      step: row.step as ProgressStep,
      completedAt: row.completed_at,
      notes: row.notes,
    };
    const existing = result.get(row.lead_id) || [];
    existing.push(progress);
    result.set(row.lead_id, existing);
  });

  return result;
}

/**
 * 진행 단계 완료 여부 확인
 */
export async function isStepCompleted(
  leadId: string,
  step: ProgressStep
): Promise<boolean> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('sales_progress')
    .select('id')
    .eq('lead_id', leadId)
    .eq('step', step)
    .single();

  return !!data;
}

// ============================================
// 이메일 연동
// ============================================

/**
 * mailto: 링크 생성
 */
export function generateMailtoLink(
  lead: Lead | LeadWithCRM,
  proposal?: Proposal
): string {
  const email = (lead as LeadWithCRM).email || '';

  const subject = encodeURIComponent(
    `[광고 제안] ${lead.bizName}님을 위한 지하철 광고 제안서`
  );

  let body = `${lead.bizName} 담당자님께,\n\n`;
  body += `안녕하세요. 서울 지하철 광고 영업 담당입니다.\n\n`;

  if (lead.nearestStation) {
    const stationName = lead.nearestStation.endsWith('역') ? lead.nearestStation : lead.nearestStation + '역';
    body += `${stationName} 인근에서 새로 개원하신 것을 축하드립니다.\n`;
    body += `역세권 최고의 광고 위치를 제안드리고자 연락드립니다.\n\n`;
  }

  if (proposal) {
    if (proposal.pdfUrl) {
      body += `첨부된 제안서를 검토해 주시기 바랍니다.\n`;
      body += `제안서 링크: ${proposal.pdfUrl}\n\n`;
    }
    if (proposal.finalPrice) {
      body += `제안 금액: ${proposal.finalPrice.toLocaleString()}원/월\n\n`;
    }
  }

  body += `궁금하신 점이 있으시면 언제든 연락 주세요.\n`;
  body += `감사합니다.\n\n`;
  body += `---\n`;
  body += `서울 지하철 광고 영업팀`;

  const encodedBody = encodeURIComponent(body);

  return `mailto:${email}?subject=${subject}&body=${encodedBody}`;
}

/**
 * 전화 링크 생성
 */
export function generateTelLink(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `tel:${cleanPhone}`;
}

// ============================================
// 리드 CRM 데이터 통합 조회
// ============================================

/**
 * CRM 데이터가 포함된 리드 조회
 */
export async function getLeadWithCRM(leadId: string): Promise<LeadWithCRM | null> {
  const supabase = getSupabase();

  // 리드 기본 정보
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !leadData) {
    return null;
  }

  // 통화 기록
  const callLogs = await getCallLogs(leadId);

  // 진행 상황
  const salesProgress = await getProgress(leadId);

  // 제안서
  const { data: proposalsData } = await supabase
    .from('proposals')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  const proposals = (proposalsData || []).map(row => ({
    id: row.id,
    leadId: row.lead_id,
    title: row.title,
    greetingMessage: row.greeting_message,
    inventoryIds: row.inventory_ids || [],
    totalPrice: row.total_price,
    discountRate: row.discount_rate,
    finalPrice: row.final_price,
    effectAnalysis: row.effect_analysis,
    pdfUrl: row.pdf_url,
    status: row.status,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    id: leadData.id,
    bizName: leadData.biz_name,
    bizId: leadData.biz_id,
    licenseDate: leadData.license_date,
    roadAddress: leadData.road_address,
    lotAddress: leadData.lot_address,
    coordX: leadData.coord_x,
    coordY: leadData.coord_y,
    latitude: leadData.latitude,
    longitude: leadData.longitude,
    phone: leadData.phone,
    medicalSubject: leadData.medical_subject,
    nearestStation: leadData.nearest_station,
    stationDistance: leadData.station_distance,
    stationLines: leadData.station_lines,
    status: leadData.status,
    notes: leadData.notes,
    createdAt: leadData.created_at,
    updatedAt: leadData.updated_at,
    email: leadData.email,
    contactPerson: leadData.contact_person,
    preferredContactTime: leadData.preferred_contact_time,
    budgetRange: leadData.budget_range,
    callLogs,
    proposals,
    salesProgress,
  };
}

/**
 * 리드 CRM 필드 업데이트
 */
export async function updateLeadCRM(
  leadId: string,
  updates: {
    email?: string;
    contactPerson?: string;
    preferredContactTime?: string;
    budgetRange?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const dbUpdates: Record<string, unknown> = {};
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.preferredContactTime !== undefined) dbUpdates.preferred_contact_time = updates.preferredContactTime;
    if (updates.budgetRange !== undefined) dbUpdates.budget_range = updates.budgetRange;

    const { error } = await supabase
      .from('leads')
      .update(dbUpdates)
      .eq('id', leadId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '리드 정보가 업데이트되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ============================================
// 통계
// ============================================

/**
 * CRM 통계 조회
 */
export async function getCRMStats(): Promise<{
  totalCalls: number;
  callsByOutcome: Record<CallOutcome, number>;
  progressCounts: Record<ProgressStep, number>;
  conversionRate: number;
}> {
  const supabase = getSupabase();

  // 전체 통화 수
  const { count: totalCalls } = await supabase
    .from('call_logs')
    .select('*', { count: 'exact', head: true });

  // 결과별 통화 수
  const callsByOutcome: Record<CallOutcome, number> = {
    NO_ANSWER: 0,
    REJECTED: 0,
    INTERESTED: 0,
    CALLBACK_REQUESTED: 0,
    MEETING_SCHEDULED: 0,
    OTHER: 0,
  };

  for (const outcome of Object.keys(callsByOutcome) as CallOutcome[]) {
    const { count } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('outcome', outcome);
    callsByOutcome[outcome] = count || 0;
  }

  // 진행 단계별 수
  const progressCounts: Record<ProgressStep, number> = {
    PROPOSAL_SENT: 0,
    FIRST_CALL: 0,
    MEETING_SCHEDULED: 0,
    CONTRACT_SIGNED: 0,
  };

  for (const step of Object.keys(progressCounts) as ProgressStep[]) {
    const { count } = await supabase
      .from('sales_progress')
      .select('*', { count: 'exact', head: true })
      .eq('step', step);
    progressCounts[step] = count || 0;
  }

  // 전환율 (계약성사 / 전체 리드)
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const conversionRate = totalLeads && totalLeads > 0
    ? (progressCounts.CONTRACT_SIGNED / totalLeads) * 100
    : 0;

  return {
    totalCalls: totalCalls || 0,
    callsByOutcome,
    progressCounts,
    conversionRate,
  };
}

// ============================================
// 헬퍼 함수
// ============================================

function mapCallLogFromDB(row: Record<string, unknown>): CallLog {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    calledAt: String(row.called_at),
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
    outcome: row.outcome as CallOutcome,
    contactPerson: row.contact_person ? String(row.contact_person) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    nextAction: row.next_action ? String(row.next_action) : undefined,
    nextContactDate: row.next_contact_date ? String(row.next_contact_date) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}
