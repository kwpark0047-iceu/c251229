-- =====================================================
-- user_settings 테이블 중복 데이터 정리 및 유니크 제약 조건 추가
-- 406 Not Acceptable 에러 방지 및 upsert 기능 정상화
-- =====================================================

DO $$
BEGIN
    -- 1. 중복 데이터 정리 (user_id가 같은 항목 중 가장 최신 업데이트된 것만 남기고 삭제)
    DELETE FROM user_settings
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as row_num
            FROM user_settings
            WHERE user_id IS NOT NULL
        ) t
        WHERE t.row_num = 1
    ) AND user_id IS NOT NULL;

    -- 2. user_id 컬럼에 UNIQUE 제약 조건 추가 (이미 존재하지 않는 경우에만)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'user_settings_user_id_key'
    ) THEN
        ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
    END IF;

    -- 3. RLS 정책 재확인 (필요시)
    -- 이미 'Allow all' 정책이 있으므로 추가 작업은 생략합니다.
END $$;

SELECT 'user_settings table updated with unique constraint successfully!' AS message;
