import { NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email-service';
import { memberStatusFailure } from '@/lib/member-status-error';

type Context = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

async function authorize(request: Request, context: Context) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return { response: reply('다른 사이트에서 보낸 요청은 허용되지 않습니다.', 403) };
  const { id } = await context.params;
  if (!uuid.test(id)) return { response: reply('회원 식별자가 올바르지 않습니다.', 400) };
  const client = await createSessionClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { response: reply('로그인이 필요합니다.', 401) };
  const { data: actor, error: actorError } = await client.from('profiles').select('is_super_admin, account_status').eq('id', user.id).maybeSingle();
  if (actorError || !actor?.is_super_admin || actor.account_status !== 'ACTIVE') return { response: reply('이용 중인 최고관리자만 처리할 수 있습니다.', 403) };
  if (id === user.id) return { response: reply('현재 로그인한 본인 계정은 변경하거나 삭제할 수 없습니다.', 409) };
  const { data: target, error: targetError } = await client.from('profiles')
    .select('id, email, is_approved, is_super_admin, updated_at, account_status').eq('id', id).maybeSingle();
  if (targetError) return { response: reply('회원 정보를 조회하지 못했습니다.', 500) };
  if (!target) return { response: reply('회원을 찾을 수 없습니다. 목록을 새로고침해주세요.', 404) };
  if (target.is_super_admin) return { response: reply('최고관리자 계정은 보호되어 있습니다.', 409) };
  return { client, user, target, id };
}

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await authorize(request, context);
    if (auth.response) return auth.response;
    const { client, user, target, id } = auth;
    const body = await request.json().catch(() => null);
    if (body?.restore === true && Object.keys(body).length === 1) {
      return transitionArchive(client, id, false, null);
    }
    if (target.account_status === 'ARCHIVED') return reply('보관된 회원입니다. 복구 후 별도로 승인해주세요.', 409);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['isApproved', 'tier'].includes(key)) ||
      (body.isApproved === undefined && body.tier === undefined) ||
      (body.isApproved !== undefined && typeof body.isApproved !== 'boolean') ||
      (body.tier !== undefined && !['FREE', 'DEMO', 'MEDIA', 'SALES'].includes(body.tier))) {
      return reply('승인 상태 또는 서비스 등급 입력을 확인해주세요.', 400);
    }
    if (body.isApproved === target.is_approved && body.tier === undefined) {
      return NextResponse.json({ success: true, message: body.isApproved ? '이미 승인된 회원입니다.' : '이미 승인 대기 상태입니다.' });
    }
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { updated_at: now };
    if (body.tier !== undefined) payload.tier = body.tier;
    if (body.isApproved !== undefined) {
      Object.assign(payload, {
        is_approved: body.isApproved,
        approved_at: body.isApproved ? now : null,
        approved_by: body.isApproved ? user.id : null,
        rejected_at: body.isApproved ? null : now,
        reject_reason: body.isApproved ? null : '최고관리자가 승인을 취소했습니다.',
      });
    }
    let mutation = client.from('profiles').update(payload)
      .eq('id', id).eq('is_approved', target.is_approved).eq('is_super_admin', false);
    if (target.updated_at) mutation = mutation.eq('updated_at', target.updated_at);
    const { data, error } = await mutation.select('id').maybeSingle();
    if (error) return memberStatusFailure(error, 'save');
    if (!data) return reply('다른 관리자가 상태를 변경했습니다. 목록을 새로고침해주세요.', 409);
    const warnings: string[] = [];
    try {
      if (body.isApproved !== undefined) {
        const { data: membership, error: membershipError } = await client.from('organization_members')
          .select('organization_id').eq('user_id', id).limit(1).maybeSingle();
        if (membershipError) warnings.push('상태는 저장됐으나 조직별 승인 이력을 확인하지 못했습니다.');
        if (membership?.organization_id) {
          const { error: historyError } = await client.from('approval_history').insert({
            user_id: id, user_email: target.email, organization_id: membership.organization_id,
            action_type: body.isApproved ? 'APPROVED' : 'REJECTED',
            reject_reason: body.isApproved ? null : '최고관리자가 승인을 취소했습니다.',
          });
          if (historyError) warnings.push('상태는 저장됐으나 조직별 승인 이력을 기록하지 못했습니다.');
        }
      }
      const { error: auditError } = await client.from('activity_logs').insert({
        user_id: user.id, user_email: user.email, organization_id: null, entity_id: id,
        action_type: body.isApproved === undefined ? 'ADMIN_TIER_CHANGE' : body.isApproved ? 'USER_APPROVED' : 'USER_APPROVAL_REVOKED',
        details: { target_email: target.email, message: `${target.email} 회원 ${body.isApproved === undefined ? '등급 변경' : body.isApproved ? '가입 승인' : '승인 취소'}` },
      });
      if (auditError) warnings.push('상태는 저장됐으나 활동 이력을 기록하지 못했습니다.');
      if (body.isApproved === true && !target.is_approved && target.email) {
        const email = await sendEmail({ to: target.email, subject: '[지하철 광고 영업 시스템] 회원가입이 승인되었습니다',
          html: '<p>회원가입 승인이 완료되었습니다. 로그인 후 서비스를 이용하실 수 있습니다.</p>' });
        if (!email.success) warnings.push('승인은 완료됐으나 안내 이메일을 보내지 못했습니다.');
      }
    } catch { warnings.push('상태는 저장됐으나 이력 또는 안내 처리 중 오류가 발생했습니다.'); }
    return NextResponse.json({ success: true, message: body.isApproved === undefined ? '서비스 등급이 변경되었습니다.' : body.isApproved ? '회원가입을 승인했습니다.' : '승인을 취소했습니다.', warnings });
  } catch (error) {
    return memberStatusFailure(error, 'unexpected');
  }
}

async function transitionArchive(client: Awaited<ReturnType<typeof createSessionClient>>, id: string, archive: boolean, reason: string | null) {
  const { data, error } = await client.rpc('transition_member_archive', {
    p_user_id: id, p_archive: archive, p_reason: reason,
  });
  if (error) {
    if (error.code === '42501') return reply('회원 보관 처리 권한이 없습니다.', 403);
    if (error.code === 'P0002') return reply('회원을 찾을 수 없습니다.', 404);
    if (error.code === '23514') return reply('회원 상태·조직 소유권·담당 자료 때문에 처리할 수 없습니다. 상태를 확인하고 필요한 소유권·담당자 이전을 완료해주세요.', 409);
    return reply('회원 보관 설정 또는 감사 이력을 확인하지 못해 처리를 중단했습니다.', 503);
  }
  if (!data || data.user_id !== id || data.archived !== archive) return reply('처리 결과를 확인하지 못했습니다. 목록을 새로고침해주세요.', 503);
  // 외부 Auth ban/unban을 비동기로 덧붙이면 늦은 응답이 최신 복구를 뒤집을 수 있다.
  // 권한 차단은 RPC와 RLS의 현재 상태로 원자적으로 적용한다.
  return NextResponse.json({ success: true,
    message: archive ? '회원이 삭제·보관되었습니다. 서비스 접근 권한은 차단되고 자료는 보존됩니다.' : '이용 중지 상태로 복구되었습니다. 별도 승인 후 조직과 권한을 다시 지정해주세요.', warnings: [] });
}

export async function DELETE(request: Request, context: Context) {
  try {
    const auth = await authorize(request, context);
    if (auth.response) return auth.response;
    const body = await request.json().catch(() => null);
    if (typeof body?.confirmationEmail !== 'string' || body.confirmationEmail.trim().toLowerCase() !== auth.target.email?.toLowerCase()) {
      return reply('보관할 회원의 이메일을 정확하게 입력해주세요.', 400);
    }
    if (body.archiveReason !== undefined && (typeof body.archiveReason !== 'string' || body.archiveReason.length > 500)) {
      return reply('보관 사유는 500자 이내로 입력해주세요.', 400);
    }
    return transitionArchive(auth.client, auth.id, true, body.archiveReason?.trim() || null);
  } catch {
    return reply('보관 처리 결과를 확인하지 못했습니다. 재시도 전 목록을 새로고침해주세요.', 500);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const auth = await authorize(request, context);
    if (auth.response) return auth.response;
    if (!auth.target.is_approved || auth.target.account_status !== 'ACTIVE') return reply('이용 중인 승인 회원에게만 안내 이메일을 보낼 수 있습니다.', 409);
    const result = await sendEmail({ to: auth.target.email,
      subject: '[지하철 광고 영업 시스템] 회원가입 승인 안내',
      html: '<p>회원가입 승인이 완료되었습니다. 로그인 후 서비스를 이용하실 수 있습니다.</p>' });
    if (!result.success) {
      if (result.errorCode === 'EMAIL_CONFIGURATION') {
        return reply('회원 승인은 유지됩니다. 서버의 메일 API 키와 인증된 발신 주소 설정을 확인해주세요.', 503);
      }
      return reply('회원 승인은 유지됩니다. 이메일 제공기관에서 발송을 완료하지 못했습니다. 발신 도메인 인증과 발송 제한을 확인해주세요.', 502);
    }
    return NextResponse.json({ success: true, message: '승인 안내 이메일을 다시 보냈습니다.' });
  } catch {
    return reply('이메일 재전송 중 오류가 발생했습니다.', 500);
  }
}
