/** 서울 지하철 광고 영업 시스템 - 제안서 이메일 발송 서비스 */
import { getSupabase } from '@/lib/supabase/utils';
import { generateProposalPDF } from './proposal-pdf';
import { markProposalSent } from './proposal-crud';
import { ActivityService } from './activity-service';export async function sendProposalEmail(
  proposalId: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  },
  additionalProposalIds?: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    
    // 1. 제안서 정보 조회
    const { data: proposal, error: pError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (pError || !proposal) throw new Error('제안서를 찾을 수 없습니다.');

    let base64Content = '';
    let filename = '';

    if (proposal.is_external && proposal.pdf_url) {
      // 2a. 외부 파일인 경우: Storage에서 다운로드
      const response = await fetch(proposal.pdf_url);
      const buffer = await response.arrayBuffer();
      base64Content = Buffer.from(buffer).toString('base64');
      filename = proposal.original_filename || '제안서';
    } else {
      // 2b. 자동 생성 제안서인 경우: PDF 생성
      const pdfResult = await generateProposalPDF(proposalId);
      if (!pdfResult.success || !pdfResult.pdfBlob) {
        return { success: false, message: pdfResult.message || 'PDF 생성 실패' };
      }
      const buffer = await pdfResult.pdfBlob.arrayBuffer();
      base64Content = Buffer.from(buffer).toString('base64');
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      filename = `${pdfResult.bizName || '제안서'}_${dateStr}.pdf`;
    }

    const attachments = [
      {
        filename: filename,
        content: base64Content,
      },
    ];

    // 3. 추가 첨부 파일 처리
    if (additionalProposalIds && additionalProposalIds.length > 0) {
      for (const id of additionalProposalIds) {
        try {
          const { data: prop } = await supabase.from('proposals').select('*').eq('id', id).single();
          if (prop && prop.pdf_url) {
            const res = await fetch(prop.pdf_url);
            const buf = await res.arrayBuffer();
            attachments.push({
              filename: prop.original_filename || '추가첨부파일',
              content: Buffer.from(buf).toString('base64'),
            });
          }
        } catch (err) {
          console.warn(`추가 첨부 파일(${id}) 로드 실패:`, err);
        }
      }
    }

    // 4. API 호출하여 이메일 발송
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.body.replace(/\n/g, '<br>'),
        attachments: attachments,
      }),
    });

    if (response.ok) {
      // 활동 로그 기록
      ActivityService.trackProposalSent(proposalId, proposal.lead_id || 'unbound', '고객', emailData.to);
    }

    const result = await response.json();
    if (!result.success) return { success: false, message: result.message };

    // 4. 발송 상태 업데이트
    await markProposalSent(proposalId);
    await supabase.from('proposals').update({
       email_recipient: emailData.to 
    }).eq('id', proposalId);

    return { success: true, message: '이메일이 발송되었습니다.' };
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return { success: false, message: `발송 실패: ${(error as Error).message}` };
  }
}

