
-- leads 테이블에 최종수정일자 필드 추가 (서울 인허가 LASTMODTS 기반)
ALTER TABLE IF EXISTS leads 
ADD COLUMN IF NOT EXISTS last_modified_date TEXT;

-- 주석 추가
COMMENT ON COLUMN leads.last_modified_date IS '최종수정일자 (서울 인허가 LASTMODTS, YYYY-MM-DD HH:MM:SS 형식)';
