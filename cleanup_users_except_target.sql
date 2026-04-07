-- =========================================================================
-- [주의] kwpark0047@gmail.com을 제외한 모든 계정 및 관련 데이터 삭제 스크립트
-- 이 코드를 Supabase Dashboard -> SQL Editor에 붙여넣고 실행(Run) 하세요.
-- =========================================================================

DO $$
DECLARE
    target_user_id UUID;
    deleted_count INTEGER;
BEGIN
    -- 1. 유지할 사용자의 ID 확인 (kwpark0047@gmail.com)
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'kwpark0047@gmail.com';

    -- 만약 해당 사용자가 없다면 경고 메시지 출력하고 중단
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION '유지할 계정(kwpark0047@gmail.com)을 찾을 수 없습니다. 삭제를 중단합니다.';
    ELSE
        -- 2. 외래 키 제약 조건 없는 관련 데이터 수동 삭제
        -- user_settings 테이블에서 타사 사용자 설정 삭제
        DELETE FROM public.user_settings 
        WHERE user_id != target_user_id OR user_id IS NULL;
        
        -- 3. auth.users에서 타겟 제외 모든 유저 삭제
        -- (organization_members 등 CASCADE 설정된 테이블은 자동 삭제됨)
        DELETE FROM auth.users 
        WHERE id != target_user_id;

        -- 4. 삭제 결과 확인
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'kwpark0047@gmail.com을 제외한 모든 계정 정리가 완료되었습니다. (삭제된 유저 수: %)', deleted_count;
    END IF;
END $$;
