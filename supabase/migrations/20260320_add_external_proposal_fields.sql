-- =============================================
-- 제안서 외부 파일 업로드 지원을 위한 스키마 확장
-- =============================================

-- 컬럼 추가
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 기존 데이터가 있을 경우 기본값 처리 (필요시)
-- UPDATE proposals SET is_external = FALSE WHERE is_external IS NULL;

-- 스토리지 정책 설정을 위한 가이드 (SQL Editor에서 실행 필요)
/*
-- 1. 버킷 생성
-- insert into storage.buckets (id, name, public) values ('proposals', 'proposals', true);

-- 2. 스토리지 RLS 정책
-- 2.1 조회 (모든 로그인 사용자)
CREATE POLICY "Anyone can view proposals" ON storage.objects
    FOR SELECT USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');

-- 2.2 업로드 (조직 멤버만 - 간소화된 버전)
CREATE POLICY "Users can upload proposals to their org folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'proposals' 
        AND auth.role() = 'authenticated'
    );
*/

COMMENT ON COLUMN proposals.is_external IS '외부 파일(PDF/PPT) 업로드 여부';
COMMENT ON COLUMN proposals.original_filename IS '업로드된 원본 파일명';
COMMENT ON COLUMN proposals.file_type IS '파일 확장자 (pdf, ppt, pptx)';
