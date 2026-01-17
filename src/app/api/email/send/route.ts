import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
    try {
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
        const { to, subject, html, attachments, from = 'onboarding@resend.dev' } = body;

        // 필수 필드 확인
        if (!to || !subject) {
            return NextResponse.json(
                { success: false, message: '수신자와 제목은 필수입니다.' },
                { status: 400 }
            );
        }

        const { data, error } = await resend.emails.send({
            from: from, // 커스텀 도메인이 없는 경우 'onboarding@resend.dev' 사용
            to: typeof to === 'string' ? [to] : to,
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
