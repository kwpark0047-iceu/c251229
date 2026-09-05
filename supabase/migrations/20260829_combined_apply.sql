-- Run this in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/yreoeqmcebnosmtlyump/sql

-- ============================================================
-- 1. Soft Delete (Archive) Support
-- ============================================================
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for efficient filtering (partial index for active leads only)
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived) WHERE archived = FALSE;

-- Comments
COMMENT ON COLUMN leads.archived IS '소프트 삭제(아카이브) 여부: true면 사용자 화면에서 숨김';
COMMENT ON COLUMN leads.archived_at IS '아카이브 처리 일시';

-- ============================================================
-- 2. CRM Fields
-- ============================================================
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS preferred_contact_time VARCHAR(100),
ADD COLUMN IF NOT EXISTS budget_range VARCHAR(100);

-- Comments
COMMENT ON COLUMN leads.contact_person IS '담당자명 (CRM)';
COMMENT ON COLUMN leads.preferred_contact_time IS '선호 연락 시간 (CRM)';
COMMENT ON COLUMN leads.budget_range IS '예산 범위 (CRM)';

-- ============================================================
-- Verification Queries
-- ============================================================
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leads' 
AND column_name IN ('archived', 'archived_at', 'contact_person', 'preferred_contact_time', 'budget_range')
ORDER BY column_name;

-- Check index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' AND indexname = 'idx_leads_archived';

-- Check comments
SELECT obj_description(c.oid) as comment, a.attname as column_name
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'leads' 
AND a.attname IN ('archived', 'archived_at', 'contact_person', 'preferred_contact_time', 'budget_range')
AND a.attnum > 0;
