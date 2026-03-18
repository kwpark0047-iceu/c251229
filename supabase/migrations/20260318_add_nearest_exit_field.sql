
-- leads 테이블에 가장 가까운 지하철 출구 번호 필드 추가
ALTER TABLE IF EXISTS leads 
ADD COLUMN IF NOT EXISTS nearest_exit_no TEXT;

-- 주석 추가
COMMENT ON COLUMN leads.nearest_exit_no IS '가장 가까운 지하철 출구 번호';
