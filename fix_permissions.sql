-- =====================================================
-- Supabase Schema Public 권한 수정 스크립트
-- =====================================================

-- 1. Schema Usage 권한 부여
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. 현재 모든 테이블/시퀀스/함수에 대한 권한 부여
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3. 향후 생성될 객체에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 4. 확인 메시지
SELECT 'Database permissions fixed successfully!' AS message;
