import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendProposalReminder } from '@/lib/email-service';

/**
 * Automated Sales Sequence CRON Job
 */

export const dynamic = 'force-dynamic';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
}

export async function GET(request: NextRequest) {
    try {
        // 1. 보안 검증 (CRON_SECRET)
        const authHeader = request.headers.get('authorization');
        const isTest = request.nextUrl.searchParams.get('test') === 'true';

        if (!isTest && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabase = getSupabase();

        // 2. 대상 추출 (3일 이상 미열람)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const query = supabase
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
            .lt('reminder_count', 1);

        // 테스트 모드가 아닐 때만 3일 기한 체크
        if (!isTest) {
            query.lt('sent_at', threeDaysAgo.toISOString());
        }

        const { data: targets, error } = await query;

        if (error) throw error;
        if (!targets || targets.length === 0) {
            return NextResponse.json({ success: true, message: 'No targets found', count: 0 });
        }

        let successCount = 0;
        const errors = [];

        // 3. 리마인더 발송
        for (const proposal of targets) {
            const lead = proposal.leads as unknown as { biz_name: string; contact_person?: string };
            const recipientName = lead?.contact_person || lead?.biz_name || '대표님';
            const email = proposal.email_recipient;

            if (!email) continue;

            try {
                // 프리미엄 템플릿 사용
                const result = await sendProposalReminder(email, recipientName, proposal.title);

                if (!result.success) throw result.error;

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
            errors,
            mode: isTest ? 'test' : 'production'
        });

    } catch (error) {
        console.error('CRON Job Error:', error);
        return NextResponse.json(
            { success: false, message: (error as Error).message },
            { status: 500 }
        );
    }
}
