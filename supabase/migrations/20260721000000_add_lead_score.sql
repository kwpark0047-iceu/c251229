-- Add lead_score and lead_grade columns to leads table

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_grade TEXT DEFAULT 'D';

-- Add index for efficient filtering by grade
CREATE INDEX IF NOT EXISTS idx_leads_grade ON leads(lead_grade);
