/** 서울 지하철 광고 영업 시스템 - 제안서 PDF 생성 서비스 */
import jsPDF from 'jspdf';
import { getSupabase } from '@/lib/supabase/utils';
import { Proposal, Lead, AdInventory, EffectAnalysis } from './types';
import { getCurrentUser, logActivity, UserInfo } from './auth-service';
import { mapProposalFromDB } from './utils/mapping-utils';
import { getProposalWithInventory } from './proposal-crud';
import { ActivityService } from './activity-service';
let koreanFontLoaded = false;

/**
 * 한글 폰트 로드 (Noto Sans KR)
 */
async function loadKoreanFont(pdf: jsPDF): Promise<void> {
  if (koreanFontLoaded) {
    pdf.setFont('NanumGothic');
    return;
  }

  try {
    // Google Fonts에서 NanumGothic 폰트 로드 (TTF)
    const response = await fetch('https://fonts.gstatic.com/s/nanumgothic/v26/PN_3Rfi-oW3hYwmKDpxS7F_z_g.ttf');
    if (!response.ok) throw new Error('폰트 다운로드 실패');
    const fontBuffer = await response.arrayBuffer();

    // ArrayBuffer를 Base64로 변환
    const bytes = new Uint8Array(fontBuffer);
      const binary = String.fromCharCode(...bytes);
      const base64Font = btoa(binary);

    // jsPDF에 폰트 등록
    pdf.addFileToVFS('NanumGothic.ttf', base64Font);
    pdf.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    pdf.setFont('NanumGothic');

    koreanFontLoaded = true;
    console.log('✅ 한글 폰트 로드 성공');
  } catch (error) {
    console.error('❌ 한글 폰트 로드 실패:', error);
    // 실패 시 기본 폰트로 폴백되지만 한글은 깨질 수 있음
  }
}

/**
 * 이미지 URL을 Base64로 변환
 */
async function fetchImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 환경에 따른 Base64 변환
    let base64: string;
    if (typeof btoa === 'function') {
      // 브라우저 환경
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    } else {
      // Node.js 환경
      base64 = Buffer.from(arrayBuffer).toString('base64');
    }

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn('이미지 로드 실패:', url, error);
    return null;
  }
}

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

    // === 페이지 3~: 도면 첨부 (선택된 모든 도면) ===
    const itemsWithPlans = inventory.filter(item => item.floorPlanUrl);

    if (itemsWithPlans.length > 0) {
      for (const planItem of itemsWithPlans) {
        if (!planItem.floorPlanUrl) continue;

        pdf.addPage();
        yPos = 30;

        pdf.setFontSize(16);
        pdf.setTextColor(30, 64, 175);
        pdf.text(`${planItem.stationName}역 상세 도면`, margin, yPos);
        yPos += 10;

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`위치: ${planItem.locationCode} (${planItem.adType})`, margin, yPos);
        yPos += 15;

        // 이미지 로드 및 추가
        const imgData = await fetchImage(planItem.floorPlanUrl);
        if (imgData) {
          try {
            let imgFormat = 'JPEG';
            if (imgData.startsWith('data:image/png')) {
              imgFormat = 'PNG';
            } else if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) {
              imgFormat = 'JPEG';
            }

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pageWidth - margin * 2;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            const pageHeight = pdf.internal.pageSize.getHeight();
            const maxHeight = pageHeight - yPos - margin;

            let finalWidth = pdfWidth;
            let finalHeight = pdfHeight;

            if (pdfHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = (imgProps.width * finalHeight) / imgProps.height;
            }

            pdf.addImage(imgData, imgFormat, margin, yPos, finalWidth, finalHeight);
          } catch (err) {
            console.error('도면 추가 중 오류:', err);
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text('도면 이미지를 불러올 수 없습니다.', margin, yPos);
          }
        } else {
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.text('도면 이미지를 로드하는데 실패했습니다.', margin, yPos);
        }
      }
    } else {
      // 도면이 없는 경우
      pdf.addPage();
      yPos = 30;
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text('등록된 도면 정보가 없습니다.', margin, yPos);
    }

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
  // 활동 로그 기록
  ActivityService.trackProposalDownload(proposalId, bizName, '제안서 PDF');

  return true;
}

export interface AIAnalysis {
  businessOverview: {
    name: string;
    type: string;
    address: string;
    phone: string;
    summary: string;
  };
  stationAnalysis: {
    station: string;
    lines: string[];
    trafficEstimate: string;
    characteristics: string;
    distance: string;
    recommendation: string;
  };
  marketAnalysis: {
    competitors: string[];
    demandLevel: string;
    targetCustomers: string;
    seasonality: string;
    strengths: string[];
    opportunities: string[];
  };
  recommendation: {
    mediaTypes: string[];
    suggestedStations: string[];
    budgetPlan: string;
    contractTip: string;
  };
  expectedEffects: string[];
  summary: string;
}

function startAIPage(
  pdf: jsPDF,
  pageNo: number,
  sectionTitle: string,
  header: string
): void {
  if (pageNo > 1) pdf.addPage();
  pdf.setFontSize(14);
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122); // indigo-800
  pdf.text(sectionTitle, 20, 22);

  pdf.setFontSize(9);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(130, 130, 130);
  pdf.text(header, 20, 28);

  // 구분선
  pdf.setDrawColor(31, 55, 122);
  pdf.setLineWidth(0.6);
  pdf.line(20, 31, 190, 31);

  // 페이지 번호
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`${pageNo}`, 190, 292, { align: 'right' });
}

export async function generateAIProposalPDF(
  lead: Lead,
  analysis: AIAnalysis,
  generatedAt: Date = new Date()
): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadKoreanFont(pdf);

  const dateStr = `${generatedAt.getFullYear()}. ${String(generatedAt.getMonth() + 1).padStart(2, '0')}. ${String(
    generatedAt.getDate()
  ).padStart(2, '0')}`;
  const bizName = analysis.businessOverview?.name || lead.bizName || '사업장';
  const headerBase = `${bizName}  |  ${dateStr}  |  서울 지하철 광고 상권분석`;

  let pageNo = 1;

  // ============ 1. 표지 ============
  pdf.setFillColor(31, 55, 122); // indigo-800
  pdf.rect(0, 0, 210, 90, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(26);
  pdf.setFont('NanumGothic', 'bold');
  pdf.text('AI 상권분석 자료', 20, 40);

  pdf.setFontSize(14);
  pdf.setFont('NanumGothic', 'normal');
  pdf.text(`서울 지하철 광고 제안을 위한 맞춤 분석`, 20, 52);

  pdf.setFontSize(16);
  pdf.setFont('NanumGothic', 'bold');
  pdf.text(bizName, 20, 78);

  pdf.setFontSize(11);
  pdf.setFont('NanumGothic', 'normal');
  pdf.text(analysis.businessOverview?.type || lead.medicalSubject || '', 20, 86);

  // 표지 하단 정보
  pdf.setTextColor(31, 55, 122);
  pdf.setFontSize(10);
  pdf.text('작성일', 20, 130);
  pdf.text(dateStr, 45, 130);

  pdf.text('작성 근거', 20, 140);
  pdf.text('경기도/서울시 공공데이터 연계 리드 정보', 45, 140);

  pdf.text('인근 역', 20, 150);
  pdf.text(lead.nearestStation || analysis.stationAnalysis?.station || '미정', 45, 150);

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('본 자료는 공공데이터 기반 AI 분석 결과로, 실제 유동인구 수치는 공식 자료와 다를 수 있습니다.', 20, 285);
  pdf.text('본 자료는 영업 제안을 위한 참고용입니다.', 20, 289);

  // ============ 2. 사업장 개요 ============
  pageNo = 2;
  startAIPage(pdf, pageNo, '1. 사업장 개요', headerBase);

  const overview = analysis.businessOverview || {};
  let y = 42;
  pdf.setFontSize(10.5);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);

  const infoRows: [string, string][] = [
    ['업체명', overview.name || lead.bizName || '-'],
    ['업종', overview.type || lead.medicalSubject || lead.category || '-'],
    ['주소', overview.address || lead.roadAddress || lead.lotAddress || '-'],
    ['전화번호', overview.phone || lead.phone || '-'],
    ['인근 역', `${lead.nearestStation || '-'}${lead.stationDistance ? ` (${lead.stationDistance}m)` : ''}`],
  ];
  for (const [label, value] of infoRows) {
    pdf.setFont('NanumGothic', 'bold');
    pdf.setTextColor(31, 55, 122);
    pdf.text(label, 20, y);
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(value || '-', 135);
    pdf.text(lines, 55, y);
    y += Math.max(6, lines.length * 5) + 4;
  }

  // 개요 요약
  y += 4;
  pdf.setFontSize(11);
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('사업장 요약', 20, y);
  y += 7;

  pdf.setFontSize(10.5);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const summaryLines = pdf.splitTextToSize(overview.summary || '-', 170);
  pdf.text(summaryLines, 20, y);
  y += summaryLines.length * 5.5 + 6;

  // ============ 3. 인근 역 분석 ============
  pageNo = 3;
  startAIPage(pdf, pageNo, '2. 인근 역 및 유동인구 분석', headerBase);

  const station = analysis.stationAnalysis || {};
  y = 42;
  const stationRows: [string, string][] = [
    ['추천 역', station.station || lead.nearestStation || '-'],
    ['노선', Array.isArray(station.lines) ? station.lines.join(', ') : '-'],
    ['유동인구 추정', station.trafficEstimate || '-'],
    ['상권 특성', station.characteristics || '-'],
    ['접근성', station.distance || '-'],
  ];
  for (const [label, value] of stationRows) {
    pdf.setFont('NanumGothic', 'bold');
    pdf.setTextColor(31, 55, 122);
    pdf.text(label, 20, y);
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(value || '-', 135);
    pdf.text(lines, 55, y);
    y += Math.max(6, lines.length * 5) + 4;
  }

  y += 4;
  pdf.setFontSize(11);
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('광고 추천 근거', 20, y);
  y += 7;
  pdf.setFontSize(10.5);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const recLines = pdf.splitTextToSize(station.recommendation || '-', 170);
  pdf.text(recLines, 20, y);

  // ============ 4. 상권 분석 ============
  pageNo = 4;
  startAIPage(pdf, pageNo, '3. 상권 및 시장 분석', headerBase);

  const market = analysis.marketAnalysis || {};
  y = 42;

  // 수요 수준
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('수요 수준', 20, y);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text(market.demandLevel || '-', 55, y);
  y += 10;

  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('타겟 고객', 20, y);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text(market.targetCustomers || '-', 55, y);
  y += 10;

  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('시기별 분석', 20, y);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const seasonLines = pdf.splitTextToSize(market.seasonality || '-', 135);
  pdf.text(seasonLines, 55, y);
  y += Math.max(6, seasonLines.length * 5) + 6;

  // 경쟁 업체
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('경쟁 업체 유형', 20, y);
  y += 6;
  const competitors = Array.isArray(market.competitors) ? market.competitors : [];
  for (const c of competitors) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• ${c}`, 24, y);
    y += 6;
  }
  y += 4;

  // 강점
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('광고 강점', 20, y);
  y += 6;
  const strengths = Array.isArray(market.strengths) ? market.strengths : [];
  for (const s of strengths) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• ${s}`, 24, y);
    y += 6;
  }
  y += 4;

  // 기회
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('광고 기회', 20, y);
  y += 6;
  const opportunities = Array.isArray(market.opportunities) ? market.opportunities : [];
  for (const o of opportunities) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• ${o}`, 24, y);
    y += 6;
  }

  // ============ 5. 추천 광고 구성 ============
  pageNo = 5;
  startAIPage(pdf, pageNo, '4. 추천 광고 구성안', headerBase);

  const rec = analysis.recommendation || {};
  y = 42;

  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('추천 광고 매체', 20, y);
  y += 6;
  const mediaTypes = Array.isArray(rec.mediaTypes) ? rec.mediaTypes : [];
  for (const m of mediaTypes) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• ${m}`, 24, y);
    y += 6;
  }
  y += 4;

  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('추천 역', 20, y);
  y += 6;
  const suggestedStations = Array.isArray(rec.suggestedStations) ? rec.suggestedStations : [];
  for (const s of suggestedStations) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• ${s}`, 24, y);
    y += 6;
  }
  y += 4;

  // 예산 구성안 (박스)
  pdf.setFillColor(238, 242, 255); // indigo-50
  pdf.rect(20, y - 4, 170, 40, 'F');
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('예산별 추천 구성', 26, y + 2);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const budgetLines = pdf.splitTextToSize(rec.budgetPlan || '-', 155);
  pdf.text(budgetLines, 26, y + 10);
  y += 46;

  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('계약 팁', 20, y);
  y += 6;
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const tipLines = pdf.splitTextToSize(rec.contractTip || '-', 170);
  pdf.text(tipLines, 20, y);

  // ============ 6. 기대 효과 ============
  pageNo = 6;
  startAIPage(pdf, pageNo, '5. 기대 효과', headerBase);

  const effects = Array.isArray(analysis.expectedEffects) ? analysis.expectedEffects : [];
  y = 42;
  for (const e of effects) {
    pdf.setFont('NanumGothic', 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(`• ${e}`, 170);
    pdf.text(lines, 20, y);
    y += Math.max(6, lines.length * 5.5) + 3;
  }

  // 요약 박스
  y += 10;
  pdf.setFillColor(238, 242, 255); // indigo-50
  pdf.rect(20, y - 4, 170, 6, 'F');
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('전체 요약', 26, y + 2);
  y += 12;
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  const sumLines = pdf.splitTextToSize(analysis.summary || '-', 170);
  pdf.text(sumLines, 20, y);

  // ============ 7. 마무리 ============
  pageNo = 7;
  startAIPage(pdf, pageNo, '6. 문의 및 상담', headerBase);

  pdf.setFontSize(12);
  pdf.setFont('NanumGothic', 'bold');
  pdf.setTextColor(31, 55, 122);
  pdf.text('서울 지하철 광고에 대한 상담을 환영합니다.', 20, 50);

  pdf.setFontSize(10.5);
  pdf.setFont('NanumGothic', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text('• 역별 유동인구 및 상권 데이터 기반 맞춤 광고 제안', 20, 62);
  pdf.text('• 조명광고 / 스크린도어 / 포스터광고 / 디지털사이니지 등 다양한 매체', 20, 70);
  pdf.text('• 예산에 맞춘 유연한 구성안 설계', 20, 78);
  pdf.text('• 계약 및 할인 정책 안내', 20, 86);

  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text('본 자료는 AI 상권분석을 기반으로 생성되었으며, 실제 계약 조건과 다를 수 있습니다.', 20, 280);

  return pdf.output('blob');
}

export async function downloadAIProposalPDF(
  lead: Lead,
  analysis: AIAnalysis,
  generatedAt: Date = new Date()
): Promise<void> {
  const blob = await generateAIProposalPDF(lead, analysis, generatedAt);
  const bizName = (analysis.businessOverview?.name || lead.bizName || '사업장').replace(/[\/\\:*?"<>|]/g, '');
  const yyyy = generatedAt.getFullYear();
  const mm = String(generatedAt.getMonth() + 1).padStart(2, '0');
  const dd = String(generatedAt.getDate()).padStart(2, '0');
  const fileName = `[${bizName}]AI_상권분석_자료_${yyyy}${mm}${dd}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
