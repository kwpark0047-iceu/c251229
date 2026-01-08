-- =============================================
-- 리드에 영업담당자 필드 추가
-- 컨택완료 시 담당자 자동 지정
-- =============================================

-- assigned_to: 담당자 사용자 ID
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- assigned_to_name: 담당자 이름/이메일 (조회 편의)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);

-- assigned_at: 담당자 지정 시간
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- 코멘트
COMMENT ON COLUMN leads.assigned_to IS '담당 영업사원 (컨택완료 시 자동 지정)';
COMMENT ON COLUMN leads.assigned_to_name IS '담당 영업사원 이름/이메일';
COMMENT ON COLUMN leads.assigned_at IS '담당자 지정 시간';
