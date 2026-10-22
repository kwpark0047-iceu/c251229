import { NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getOwnedProposalFile } from '@/lib/proposal-storage';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return fail('다른 사이트에서 보낸 요청은 허용되지 않습니다.', 403);
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return fail('제안서 식별자가 올바르지 않습니다.', 400);
    const session = await createSessionClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return fail('로그인이 필요합니다.', 401);
    const { data: profile, error: profileError } = await session.from('profiles').select('is_super_admin').eq('id', user.id).maybeSingle();
    if (profileError || profile?.is_super_admin !== true) return fail('최고관리자만 제안서를 삭제할 수 있습니다.', 403);
    const body = await request.json().catch(() => null);
    if (typeof body?.confirmationTitle !== 'string' ||
      (body.expectedUpdatedAt !== undefined && typeof body.expectedUpdatedAt !== 'string')) {
      return fail('삭제할 제안서 제목을 입력해주세요.', 400);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail('서버의 제안서 삭제 설정이 필요합니다. 관리자에게 문의해주세요.', 503);
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: proposal, error: readError } = await admin.from('proposals')
      .select('id, title, status, organization_id, pdf_url, is_external, updated_at').eq('id', id).maybeSingle();
    if (readError) return fail('제안서 정보를 조회하지 못했습니다.', 500);
    if (!proposal) return fail('이미 삭제됐거나 찾을 수 없는 제안서입니다. 목록을 새로고침해주세요.', 404);
    if (body.confirmationTitle.trim() !== (proposal.title || '제목 없는 제안서').trim()) return fail('제안서 제목이 일치하지 않습니다.', 409);
    if (body.expectedUpdatedAt && body.expectedUpdatedAt !== proposal.updated_at) return fail('제안서가 수정되었습니다. 목록을 새로고침한 뒤 확인해주세요.', 409);
    let query = admin.from('proposals').delete().eq('id', id).eq('title', proposal.title).eq('status', proposal.status);
    query = proposal.updated_at ? query.eq('updated_at', proposal.updated_at) : query.is('updated_at', null);
    const { data: deleted, error: deleteError } = await query.select('id').maybeSingle();
    if (deleteError) return fail('제안서를 삭제하지 못했습니다. 연결된 자료나 삭제 권한을 확인해주세요.', 409);
    if (!deleted) return fail('다른 작업에서 제안서가 변경됐습니다. 목록을 새로고침해주세요.', 409);

    const warnings: string[] = [];
    const ownedFile = proposal.is_external ? getOwnedProposalFile(proposal.pdf_url, url, proposal.organization_id, id) : null;
    if (ownedFile) {
      try {
        const { data: references, error } = await admin.from('proposals').select('id').eq('pdf_url', proposal.pdf_url).limit(1);
        if (error) warnings.push('제안서는 삭제됐으나 첨부파일 참조를 확인하지 못해 파일을 유지했습니다.');
        else if (!references?.length) {
          const { error: storageError } = await admin.storage.from('proposals').remove([ownedFile]);
          if (storageError) warnings.push('제안서는 삭제됐으나 첨부파일을 정리하지 못했습니다.');
        } else warnings.push('다른 제안서가 사용하는 첨부파일은 유지했습니다.');
      } catch { warnings.push('제안서는 삭제됐으나 첨부파일 정리 결과를 확인하지 못했습니다.'); }
    }
    try {
      const { error } = await admin.from('activity_logs').insert({
        user_id: user.id, user_email: user.email, organization_id: proposal.organization_id,
        action_type: 'PROPOSAL_DELETE', entity_id: id,
        details: { message: `최고관리자가 제안서 '${proposal.title}'를 삭제했습니다.`, proposalId: id, title: proposal.title, status: proposal.status },
      });
      if (error) warnings.push('삭제는 완료됐으나 활동 이력을 기록하지 못했습니다.');
    } catch { warnings.push('삭제는 완료됐으나 활동 이력을 기록하지 못했습니다.'); }
    return NextResponse.json({ success: true, message: '제안서가 삭제되었습니다.', warnings });
  } catch {
    return fail('삭제 처리 결과를 확인하지 못했습니다. 재시도 전 목록을 새로고침해주세요.', 500);
  }
}
