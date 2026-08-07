import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '../../sync-utils';

// 발신자 고정: 커스텀 도메인 인증 후 환경변수로 지정 가능
// 기본값은 Resend 테스트 발신자 (스팸 벡터 차단을 위해 클라이언트 제공 from 금지)
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const SENDER_NAME = process.env.RESEND_FROM_NAME || 'Lead Manager';

export async function POST(request: Request) {
    try {
        // 로그인 인증 필수
        const supabase = await createClient();
        const authError = await requireUser(supabase);
        if (authError) return authError;

        const checkResendKey = process.env.RESEND_API_KEY;

        // API 키가 없는 경우 에러 처리
        if (!checkResendKey) {
            return NextResponse.json(
                { success: false, message: 'Resend API Key가 설정되지 않았습니다.' },
                { status: 500 }
            );
        }

        const resend = new Resend(checkResendKey);
        const body = await request.json();
        const { to, subject, html, attachments } = body;

        // 필수 필드 확인
        if (!to || !subject) {
            return NextResponse.json(
                { success: false, message: '수신자와 제목은 필수입니다.' },
                { status: 400 }
            );
        }

        // 수신자 수 제한 (스팸 방지)
        const recipients = (typeof to === 'string' ? [to] : to) as string[];
        if (recipients.length > 10) {
            return NextResponse.json(
                { success: false, message: '한 번에 최대 10명에게만 발송할 수 있습니다.' },
                { status: 400 }
            );
        }

        const { data, error } = await resend.emails.send({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: recipients,
            subject: subject,
            html: html || '<p>제안서를 첨부해드립니다.</p>',
            attachments: attachments || [],
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Email Send Error:', error);
        return NextResponse.json(
            { success: false, message: '이메일 전송 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
