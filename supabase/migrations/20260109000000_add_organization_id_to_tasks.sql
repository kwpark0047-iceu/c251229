-- =============================================
-- tasks 테이블에 organization_id 컬럼 추가
-- 조직 기반 데이터 격리를 위한 마이그레이션
-- =============================================

-- organization_id 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);

-- 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Allow select on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow insert on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow update on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow delete on tasks" ON tasks;

-- 조직 기반 RLS 정책 재생성
CREATE POLICY "Users can view org tasks" ON tasks
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

CREATE POLICY "Users can insert org tasks" ON tasks
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

CREATE POLICY "Users can update org tasks" ON tasks
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

CREATE POLICY "Users can delete org tasks" ON tasks
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

SELECT 'Organization ID added to tasks table successfully!' AS message;
