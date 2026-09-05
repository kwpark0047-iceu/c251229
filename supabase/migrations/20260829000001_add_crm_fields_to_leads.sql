-- CRM 필드 추가 (contact_person, preferred_contact_time, budget_range)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS preferred_contact_time VARCHAR(100),
ADD COLUMN IF NOT EXISTS budget_range VARCHAR(100);

-- 코멘트
COMMENT ON COLUMN leads.contact_person IS '담당자명 (CRM)';
COMMENT ON COLUMN leads.preferred_contact_time IS '선호 연락 시간 (CRM)';
COMMENT ON COLUMN leads.budget_range IS '예산 범위 (CRM)';
