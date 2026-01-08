-- =============================================
-- proposals 테이블에 email_recipient 컬럼 추가
-- =============================================

-- email_recipient 컬럼 추가
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS email_recipient VARCHAR(255);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_proposals_email_recipient ON proposals(email_recipient);

SELECT 'email_recipient column added to proposals table!' AS message;
