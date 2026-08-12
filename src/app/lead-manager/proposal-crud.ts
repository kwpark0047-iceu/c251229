/** 서울 지하철 광고 영업 시스템 - 제안서 CRUD 서비스 / 제안서 생성, 조회, 업데이트, 발송 처리, 외부 파일 업로드 */
import { getSupabase } from '@/lib/supabase/utils';
import { Proposal, ProposalStatus, AdInventory } from './types';
import { getOrganizationId, getCurrentUser } from './auth-service';
import { mapProposalFromDB } from './utils/mapping-utils';
import { updateLeadStatus } from './lead-service';
import { ActivityService } from './activity-service';
import { getDefaultGreeting } from './proposal-greeting';export async function createProposal(
  leadId: string,
  inventoryIds: string[],
  options?: {
    title?: string;
    greetingMessage?: string;
    discountRate?: number;
    emailRecipient?: string;
  }
): Promise<{ success: boolean; proposal?: Proposal; message: string }> {
  try {
      const user = await getCurrentUser();
      const orgId = user?.organizationId || null;
      const supabase = getSupabase();

      // 리드 정보 조회
      const { data: leadData } = await supabase
        .from('leads')
        .select('biz_name, nearest_station, email')
        .eq('id', leadId)
        .single();

      // 인벤토리 정보 조회
      const { data: inventoryData } = await supabase
        .from('ad_inventory')
        .select('*')
        .in('id', inventoryIds);

      // 총 금액 계산
      const totalPrice = (inventoryData || []).reduce(
        (sum: number, item: any) => sum + (item.price_monthly || 0),
        0
      );

      const discountRate = options?.discountRate || 0;
      const finalPrice = totalPrice * (1 - discountRate / 100);

      // 기본 제목 생성
      const title = options?.title ||
        `${leadData?.biz_name || '고객'}님을 위한 ${leadData?.nearest_station || '지하철'}역 광고 제안서`;

      // 기본 인사말 생성
      const greetingMessage = options?.greetingMessage ||
        getDefaultGreeting(leadData?.biz_name, leadData?.nearest_station);

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          lead_id: leadId,
          title,
          greeting_message: greetingMessage,
          inventory_ids: inventoryIds,
          total_price: totalPrice,
          discount_rate: discountRate,
          final_price: finalPrice,
          status: 'DRAFT',
          organization_id: orgId, // 최고관리자는 null일 수 있음
          email_recipient: options?.emailRecipient || leadData?.email || null,
        })
        .select()
        .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // 리드 상태를 '제안 발송'으로 변경
    await updateLeadStatus(leadId, 'PROPOSAL_SENT');

    // 활동 로그 기록
    ActivityService.trackProposalCreate(data.id, leadId, leadData?.biz_name || '리드', title);

    return {
      success: true,
      proposal: mapProposalFromDB(data),
      message: '제안서가 생성되었습니다.',
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function getProposals(options?: {
  leadId?: string;
  status?: ProposalStatus;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; proposals: Proposal[]; message: string }> {
  try {
    const supabase = getSupabase();
    const user = await getCurrentUser();
    const isSuperAdmin = user?.isSuperAdmin || false;
    const orgId = user?.organizationId || null;

    if (!isSuperAdmin && !orgId) {
      return { success: false, proposals: [], message: '조직 정보를 찾을 수 없습니다.' };
    }

    let query = supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    // 최고관리자가 아니면 자기 조직 데이터만 필터링
    if (!isSuperAdmin) {
      query = query.eq('organization_id', orgId);
    }

    if (options?.leadId) {
      query = query.eq('lead_id', options.leadId);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.limit) {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      proposals: (data || []).map(mapProposalFromDB),
      message: '제안서 목록을 불러왔습니다.',
    };
  } catch (error) {
    console.error('제안서 조회 오류:', error);
    return { success: false, proposals: [], message: `조회 실패: ${(error as Error).message}` };
  }
}

export async function getProposalWithInventory(
  proposalId: string
): Promise<{ proposal?: Proposal; inventory: AdInventory[] } | null> {
  const supabase = getSupabase();

  const { data: proposalData } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (!proposalData) {
    return null;
  }

  const inventoryIds = proposalData.inventory_ids || [];
  let inventory: AdInventory[] = [];

  if (inventoryIds.length > 0) {
    const { data: inventoryData } = await supabase
      .from('ad_inventory')
      .select('*')
      .in('id', inventoryIds);

    inventory = (inventoryData || []).map((row: any) => ({
      id: row.id,
      stationName: row.station_name,
      locationCode: row.location_code,
      adType: row.ad_type,
      adSize: row.ad_size,
      priceMonthly: row.price_monthly,
      priceWeekly: row.price_weekly,
      availabilityStatus: row.availability_status,
      floorPlanUrl: row.floor_plan_url,
      spotPositionX: row.spot_position_x,
      spotPositionY: row.spot_position_y,
      description: row.description,
      trafficDaily: row.traffic_daily,
    }));
  }

  return {
    proposal: mapProposalFromDB(proposalData),
    inventory,
  };
}

export async function updateProposal(
  proposalId: string,
  updates: Partial<Proposal>
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.greetingMessage !== undefined) dbUpdates.greeting_message = updates.greetingMessage;
    if (updates.inventoryIds) dbUpdates.inventory_ids = updates.inventoryIds;
    if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
    if (updates.discountRate !== undefined) dbUpdates.discount_rate = updates.discountRate;
    if (updates.finalPrice !== undefined) dbUpdates.final_price = updates.finalPrice;
    if (updates.effectAnalysis) dbUpdates.effect_analysis = updates.effectAnalysis;
    if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.isExternal !== undefined) dbUpdates.is_external = updates.isExternal;
    if (updates.originalFilename !== undefined) dbUpdates.original_filename = updates.originalFilename;
    if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;

    const { error } = await supabase
      .from('proposals')
      .update(dbUpdates)
      .eq('id', proposalId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '제안서가 업데이트되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function markProposalSent(
  proposalId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('proposals')
    .update({
      status: 'SENT',
      sent_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (error) {
    return { success: false, message: error.message };
  }

  // 활동 로그 기록
  ActivityService.trackProposalSent(proposalId, 'unknown', 'unknown', 'unknown');

  return { success: true, message: '발송 완료 처리되었습니다.' };
}

export async function uploadProposalFile(
  file: File,
  leadId: string | null,
  title: string,
  status: ProposalStatus = 'SENT'
): Promise<{ success: boolean; proposal?: Proposal; message: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, message: '매체사 권한이 필요합니다. 로그인 상태를 확인해주세요.' };
    }

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    // 1. 고유 ID 생성 및 경로 설정
    const proposalId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    // 파일명에 한글/공백이 포함될 경우 Storage 키 오류가 발생하므로 영문 고정명 사용
    const filePath = `${orgId}/${proposalId}/proposal.${fileExt}`;

    // 2. Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from('proposals')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`파일 업로드 실패: ${uploadError.message}`);
    }

    // 3. 공용 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('proposals')
      .getPublicUrl(filePath);

    // 4. DB 저장
    const { data, error: dbError } = await supabase
      .from('proposals')
      .insert({
        id: proposalId,
        lead_id: leadId,
        title: title || file.name.split('.')[0],
        pdf_url: publicUrl,
        is_external: true,
        original_filename: file.name,
        file_type: fileExt,
        organization_id: orgId,
        status: status,
        sent_at: status === 'SENT' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      throw dbError;
    }

    // 5. 활동 로그 기록 (ActivityService로 교체)
    ActivityService.trackProposalCreate(proposalId, leadId || 'unbound', '리드', title);

    // 6. 리드 상태 변경 (상태가 발송이고 리드 ID가 있는 경우에만)
    if (status === 'SENT' && leadId) {
      await updateLeadStatus(leadId, 'PROPOSAL_SENT');
    }

    return {
      success: true,
      proposal: mapProposalFromDB(data),
      message: '제안서 파일이 성공적으로 업로드되었습니다.',
    };
  } catch (error) {
    console.error('uploadProposalFile error:', error);
    return { success: false, message: (error as Error).message };
  }
}

