-- Soft delete (archive) support for leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived) WHERE archived = FALSE;

-- Comment
COMMENT ON COLUMN leads.archived IS '소프트 삭제(아카이브) 여부: true면 사용자 화면에서 숨김';
COMMENT ON COLUMN leads.archived_at IS '아카이브 처리 일시';
