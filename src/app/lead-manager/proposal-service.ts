/**
 * 서울 지하철 광고 영업 시스템 - 제안서 서비스
 * 제안서 생성, PDF 생성, 관리
 */

import { jsPDF } from 'jspdf';
import { createClient } from '@/lib/supabase/client';
import {
  Proposal,
  ProposalStatus,
  Lead,
  AdInventory,
  EffectAnalysis,
} from './types';
import { getOrganizationId } from './auth-service';

function getSupabase() {
  return createClient();
}

// 한글 폰트 로드 상태
let koreanFontLoaded = false;

/**
 * 한글 폰트 로드 (Noto Sans KR)
 */
async function loadKoreanFont(pdf: jsPDF): Promise<void> {
  if (koreanFontLoaded) {
    pdf.setFont('NotoSansKR');
    return;
  }

  try {
    // Google Fonts에서 Noto Sans KR 폰트 로드 (직접 폰트 파일 로드)
    const response = await fetch('https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLGC5n9iJx9M.woff2');
    const fontBuffer = await response.arrayBuffer();

    // ArrayBuffer를 Base64로 변환
    const base64Font = btoa(
      new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // jsPDF에 폰트 등록
    pdf.addFileToVFS('NotoSansKR-Regular.ttf', base64Font);
    pdf.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
    pdf.setFont('NotoSansKR');

    koreanFontLoaded = true;
  } catch (error) {
    console.warn('한글 폰트 로드 실패, 기본 폰트 사용:', error);
  }
}

// ============================================
// 제안서 CRUD
// ============================================

/**
 * 제안서 생성
 */
export async function createProposal(
  leadId: string,
  inventoryIds: string[],
  options?: {
    title?: string;
    greetingMessage?: string;
    discountRate?: number;
  }
): Promise<{ success: boolean; proposal?: Proposal; message: string }> {
  try {
    const orgId = await getOrganizationId();
    const supabase = getSupabase();

    // 리드 정보 조회
    const { data: leadData } = await supabase
      .from('leads')
      .select('biz_name, nearest_station')
      .eq('id', leadId)
      .single();

    // 인벤토리 정보 조회
    const { data: inventoryData } = await supabase
      .from('ad_inventory')
      .select('*')
      .in('id', inventoryIds);

    // 총 금액 계산
    const totalPrice = (inventoryData || []).reduce(
      (sum, item) => sum + (item.price_monthly || 0),
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
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // 리드 상태를 '제안 발송'으로 변경
    await supabase
      .from('leads')
      .update({ status: 'PROPOSAL_SENT' })
      .eq('id', leadId);

    return {
      success: true,
      proposal: mapProposalFromDB(data),
      message: '제안서가 생성되었습니다.',
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 제안서 조회
 */
export async function getProposals(
  leadId?: string,
  status?: ProposalStatus
): Promise<Proposal[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(mapProposalFromDB);
}

/**
 * 제안서 상세 조회 (인벤토리 포함)
 */
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

    inventory = (inventoryData || []).map(row => ({
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

/**
 * 제안서 업데이트
 */
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

/**
 * 제안서 발송 처리
 */
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

  return { success: true, message: '발송 완료 처리되었습니다.' };
}

// ============================================
// PDF 생성
// ============================================

/**
 * 제안서 PDF 생성
 */
export async function generateProposalPDF(
  proposalId: string
): Promise<{ success: boolean; pdfBlob?: Blob; bizName?: string; message: string }> {
  try {
    const result = await getProposalWithInventory(proposalId);
    if (!result || !result.proposal) {
      return { success: false, message: '제안서를 찾을 수 없습니다.' };
    }

    const { proposal, inventory } = result;

    // 리드 정보 조회
    const supabase = getSupabase();
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', proposal.leadId)
      .single();

    // PDF 생성
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // 한글 폰트 로드
    await loadKoreanFont(pdf);

    // === 페이지 1: 표지 ===
    let yPos = 40;

    // 제목
    pdf.setFontSize(24);
    pdf.setTextColor(30, 64, 175); // blue-700
    pdf.text('서울 지하철 광고 제안서', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text(proposal.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;

    // 고객 정보
    if (leadData) {
      pdf.setFontSize(14);
      pdf.text(`수신: ${leadData.biz_name}`, margin, yPos);
      yPos += 10;

      if (leadData.road_address) {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(leadData.road_address, margin, yPos);
        yPos += 20;
      }
    }

    // 인사말
    if (proposal.greetingMessage) {
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      const greetingLines = pdf.splitTextToSize(proposal.greetingMessage, contentWidth);
      pdf.text(greetingLines, margin, yPos);
      yPos += greetingLines.length * 6 + 20;
    }

    // === 페이지 2: 광고 위치 목록 ===
    pdf.addPage();
    yPos = 30;

    pdf.setFontSize(16);
    pdf.setTextColor(30, 64, 175);
    pdf.text('광고 위치', margin, yPos);
    yPos += 15;

    // 테이블 헤더
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('역사', margin, yPos);
    pdf.text('위치', margin + 40, yPos);
    pdf.text('유형', margin + 80, yPos);
    pdf.text('월 단가', margin + 120, yPos);
    yPos += 8;

    // 구분선
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // 광고 위치 목록
    pdf.setTextColor(0, 0, 0);
    inventory.forEach((item, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 30;
      }

      pdf.text(`${index + 1}. ${item.stationName}역`, margin, yPos);
      pdf.text(item.locationCode, margin + 40, yPos);
      pdf.text(item.adType, margin + 80, yPos);
      pdf.text(`${(item.priceMonthly || 0).toLocaleString()}원`, margin + 120, yPos);
      yPos += 8;
    });

    yPos += 15;

    // 금액 합계
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFontSize(12);
    pdf.text(`합계: ${(proposal.totalPrice || 0).toLocaleString()}원`, margin + 100, yPos);
    yPos += 8;

    if (proposal.discountRate && proposal.discountRate > 0) {
      pdf.setTextColor(220, 38, 38); // red
      pdf.text(`할인: ${proposal.discountRate}%`, margin + 100, yPos);
      yPos += 8;
    }

    pdf.setFontSize(14);
    pdf.setTextColor(30, 64, 175);
    pdf.text(`최종 금액: ${(proposal.finalPrice || 0).toLocaleString()}원/월`, margin + 80, yPos);

    // === 페이지 3: 효과 분석 ===
    if (proposal.effectAnalysis) {
      pdf.addPage();
      yPos = 30;

      pdf.setFontSize(16);
      pdf.text('예상 광고 효과', margin, yPos);
      yPos += 15;

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);

      const analysis = proposal.effectAnalysis;

      if (analysis.dailyImpressions) {
        pdf.text(`일일 노출수: ${analysis.dailyImpressions.toLocaleString()}회`, margin, yPos);
        yPos += 8;
      }
      if (analysis.monthlyReach) {
        pdf.text(`월간 도달수: ${analysis.monthlyReach.toLocaleString()}명`, margin, yPos);
        yPos += 8;
      }
      if (analysis.targetDemographics && analysis.targetDemographics.length > 0) {
        pdf.text(`타겟 고객층: ${analysis.targetDemographics.join(', ')}`, margin, yPos);
        yPos += 8;
      }
      if (analysis.expectedROI) {
        pdf.text(`예상 ROI: ${analysis.expectedROI}`, margin, yPos);
        yPos += 8;
      }
    }

    // === 마지막 페이지: 연락처 ===
    pdf.addPage();
    yPos = 100;

    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('관심 가져주셔서 감사합니다!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    pdf.setFontSize(11);
    pdf.text('서울 지하철 광고 영업팀', pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`작성일: ${new Date().toLocaleDateString('ko-KR')}`, pageWidth / 2, yPos, { align: 'center' });

    // PDF Blob 반환
    const pdfBlob = pdf.output('blob');

    return {
      success: true,
      pdfBlob,
      bizName: leadData?.biz_name,
      message: 'PDF가 생성되었습니다.',
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * PDF 다운로드
 */
export async function downloadProposalPDF(proposalId: string): Promise<boolean> {
  const result = await generateProposalPDF(proposalId);

  if (!result.success || !result.pdfBlob) {
    return false;
  }

  // 파일명: 상호명_날짜.pdf
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const bizName = result.bizName || '제안서';
  const filename = `${bizName}_${dateStr}.pdf`;

  const url = URL.createObjectURL(result.pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

// ============================================
// 효과 분석
// ============================================

/**
 * 효과 분석 데이터 생성
 */
export function generateEffectAnalysis(
  inventory: AdInventory[],
  lead?: Lead
): EffectAnalysis {
  // 일일 통행량 합계
  const dailyImpressions = inventory.reduce(
    (sum, item) => sum + (item.trafficDaily || 50000),
    0
  );

  // 월간 도달 (일일 * 30 * 0.3 중복 제거)
  const monthlyReach = Math.round(dailyImpressions * 30 * 0.3);

  // 타겟 인구통계 추정
  const targetDemographics: string[] = [];
  if (lead?.medicalSubject) {
    if (lead.medicalSubject.includes('피부') || lead.medicalSubject.includes('성형')) {
      targetDemographics.push('20-40대 여성');
    }
    if (lead.medicalSubject.includes('치과')) {
      targetDemographics.push('전 연령대');
    }
    if (lead.medicalSubject.includes('한의')) {
      targetDemographics.push('30-60대');
    }
    if (lead.medicalSubject.includes('내과') || lead.medicalSubject.includes('정형')) {
      targetDemographics.push('40-60대');
    }
  }
  if (targetDemographics.length === 0) {
    targetDemographics.push('직장인', '학생', '주부');
  }

  // 예상 ROI
  const totalMonthlyPrice = inventory.reduce(
    (sum, item) => sum + (item.priceMonthly || 0),
    0
  );
  const costPerImpression = totalMonthlyPrice / (dailyImpressions * 30);
  const expectedROI = costPerImpression < 1
    ? '높음 (CPM < 1,000원)'
    : costPerImpression < 5
    ? '보통 (CPM 1,000~5,000원)'
    : '검토 필요';

  return {
    dailyImpressions,
    monthlyReach,
    targetDemographics,
    expectedROI,
  };
}

// ============================================
// 인사말 템플릿
// ============================================

/**
 * 기본 인사말 생성
 */
export function getDefaultGreeting(
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

/**
 * 맞춤형 인사말 생성
 */
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

// ============================================
// 헬퍼 함수
// ============================================

function mapProposalFromDB(row: Record<string, unknown>): Proposal {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    title: String(row.title),
    greetingMessage: row.greeting_message ? String(row.greeting_message) : undefined,
    inventoryIds: (row.inventory_ids as string[]) || [],
    totalPrice: row.total_price ? Number(row.total_price) : undefined,
    discountRate: row.discount_rate ? Number(row.discount_rate) : undefined,
    finalPrice: row.final_price ? Number(row.final_price) : undefined,
    effectAnalysis: row.effect_analysis as EffectAnalysis | undefined,
    pdfUrl: row.pdf_url ? String(row.pdf_url) : undefined,
    status: (row.status as ProposalStatus) || 'DRAFT',
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    viewedAt: row.viewed_at ? String(row.viewed_at) : undefined,
    emailRecipient: row.email_recipient ? String(row.email_recipient) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}
