-- 20260326_bulk_delete_users.sql
-- 최고관리자(kwpark0047@gmail.com)를 제외한 모든 사용자 및 관련 데이터 일괄 삭제 스크립트
-- 주의: 이 작업은 복구가 불가능하며 모든 리드, 제안서, 업무 데이터가 함께 삭제됩니다.

DO $$
DECLARE
    target_email TEXT := 'kwpark0047@gmail.com';
    admin_id UUID;
BEGIN
    -- 1. 최고관리자 ID 확인 (보호 대상)
    SELECT id INTO admin_id FROM auth.users WHERE email = target_email;
    
    IF admin_id IS NULL THEN
        RAISE EXCEPTION '최고관리자 계정을 찾을 수 없습니다. 삭제를 중단합니다.';
    END IF;

    -- 2. 하위 데이터 삭제 (외래 키 종속성 해결)
    -- 2-1. 제안서 로그 및 리마인더
    DELETE FROM public.proposal_logs WHERE user_id != admin_id;
    DELETE FROM public.proposal_reminders WHERE user_id != admin_id;
    
    -- 2-2. 업무(Tasks) 삭제
    DELETE FROM public.tasks WHERE lead_id IN (SELECT id FROM public.leads WHERE user_id != admin_id);
    
    -- 2-3. 제안서(Proposals) 삭제
    DELETE FROM public.proposals WHERE lead_id IN (SELECT id FROM public.leads WHERE user_id != admin_id);
    
    -- 2-4. 리드(Leads) 삭제
    DELETE FROM public.leads WHERE user_id != admin_id;

    -- 2-5. 멤버십(Organization Members) 삭제
    DELETE FROM public.organization_members WHERE user_id != admin_id;

    -- 2-6. 사용자가 없는 빈 조직(Organizations) 삭제
    DELETE FROM public.organizations 
    WHERE id NOT IN (SELECT organization_id FROM public.organization_members);

    -- 2-7. 프로필(Profiles) 삭제 (ON DELETE CASCADE가 설정되어 있으나 명시적 처리)
    DELETE FROM public.profiles WHERE id != admin_id;

    -- 3. Auth 계정 삭제 (최종)
    DELETE FROM auth.users WHERE id != admin_id;

    RAISE NOTICE '최고관리자(%)를 제외한 모든 계정과 데이터가 성공적으로 삭제되었습니다.', target_email;
END $$;
