
-- leads 테이블에 LocalData 관리번호 및 영업상태 필드 추가
ALTER TABLE IF EXISTS leads 
ADD COLUMN IF NOT EXISTS mgt_no TEXT,
ADD COLUMN IF NOT EXISTS operating_status TEXT,
ADD COLUMN IF NOT EXISTS detailed_status TEXT;

-- 주석 추가
COMMENT ON COLUMN leads.mgt_no IS '지방행정인허가 데이터 관리번호';
COMMENT ON COLUMN leads.operating_status IS '영업상태명 (영업중, 폐업 등)';
COMMENT ON COLUMN leads.detailed_status IS '상세영업상태명';
