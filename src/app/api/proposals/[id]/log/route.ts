import { NextRequest, NextResponse } from 'next/server';
import { logProposalAccess } from '@/app/lead-manager/proposal-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, email } = body;

    if (!id || !action || !['VIEW', 'DOWNLOAD'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '잘못된 요청입니다.' },
        { status: 400 }
      );
    }

    await logProposalAccess(id, action as 'VIEW' | 'DOWNLOAD', { email });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging proposal access:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
