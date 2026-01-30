import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Automated Sales Sequence CRON Job
 * 
 * 실행 조건:
 * - status = 'SENT'
 * - viewed_at IS NULL (미열람)
 * - sent_at < 3일 전
 * - reminder_count < 1 (최소 1회만 발송)
 */

export const dynamic = 'force-dynamic'; // 정적 최적화 방지

// Supabase 클라이언트 (Service Role Key 필요 - CRON 작업은 권한 우회 필요할 수 있음)
// 하지만 여기서는 안전을 위해 anon key를 사용하되, RLS 정책에 주의하거나
// 필요 시 SUPABASE_SERVICE_ROLE_KEY 환경변수를 사용해야 함.
// 현재 프로젝트 설정상 Service Role Key가 없을 수 있으므로, 
// RLS 정책이 "시스템" 작업을 허용하는지 확인해야 함.
// 일반적으로 CRON 작업은 별도의 관리자 권한으로 실행되는 것이 좋음.

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
}

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY missing');
    return new Resend(apiKey);
}

export async function GET(request: NextRequest) {
    try {
        // 1. 보안 검증 (CRON_SECRET)
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabase = getSupabase();
        const resend = getResend();

        // 2. 대상 추출 (3일 이상 미열람)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: targets, error } = await supabase
            .from('proposals')
            .select(`
        id,
        title,
        email_recipient,
        reminder_count,
        leads (
          biz_name,
          contact_person
        )
      `)
            .eq('status', 'SENT')
            .is('viewed_at', null)
            .lt('sent_at', threeDaysAgo.toISOString())
            .lt('reminder_count', 1); // 최대 1회

        if (error) throw error;
        if (!targets || targets.length === 0) {
            return NextResponse.json({ success: true, message: 'No targets found', count: 0 });
        }

        let successCount = 0;
        const errors = [];

        // 3. 리마인더 발송
        for (const proposal of targets) {
            // Leads 타입 단언 또는 안전한 접근
            const lead = proposal.leads as unknown as { biz_name: string; contact_person?: string };
            const recipientName = lead?.contact_person || lead?.biz_name || '대표님';
            const email = proposal.email_recipient;

            if (!email) continue;

            try {
                await resend.emails.send({
                    from: 'Metro Ads <onboarding@resend.dev>',
                    to: email,
                    subject: `(리마인드) ${proposal.title} - 다시 한번 확인 부탁드립니다`,
                    html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>안녕하세요, ${recipientName} 담당자님.</h2>
              <p>지난번 보내드린 <strong>${proposal.title}</strong>를 검토해 보셨는지요?</p>
              <p>바쁘신 일정 중에 놓치셨을 것 같아 다시 한번 연락드립니다.</p>
              <p>귀사의 마케팅에 도움이 될 수 있는 좋은 위치들을 선점해 두었습니다.</p>
              <br/>
              <p>혹시 추가로 궁금하신 점이나 필요한 자료가 있으시다면 언제든 회신 부탁드립니다.</p>
              <br/>
              <p>감사합니다.</p>
              <p>서울 지하철 광고 영업팀 드림</p>
            </div>
          `
                });

                // 4. 상태 업데이트
                await supabase
                    .from('proposals')
                    .update({
                        last_reminded_at: new Date().toISOString(),
                        reminder_count: (proposal.reminder_count || 0) + 1
                    })
                    .eq('id', proposal.id);

                successCount++;
            } catch (err) {
                console.error(`Failed to send reminder to ${proposal.id}:`, err);
                errors.push({ id: proposal.id, error: (err as Error).message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: targets.length,
            sent: successCount,
            errors
        });

    } catch (error) {
        console.error('CRON Job Error:', error);
        return NextResponse.json(
            { success: false, message: (error as Error).message },
            { status: 500 }
        );
    }
}
