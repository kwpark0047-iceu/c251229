-- =====================================================
-- tasks 테이블 RLS 정책 수정
-- get_user_organization_ids() 함수를 사용하여 다른 테이블과 일관성 유지
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view org tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert org tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update org tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete org tasks" ON tasks;
DROP POLICY IF EXISTS "Allow select on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow insert on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow update on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow delete on tasks" ON tasks;

-- 조직 기반 RLS 정책 재생성 (get_user_organization_ids() 함수 사용)
CREATE POLICY "Users can view their org tasks" ON tasks
  FOR SELECT USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert their org tasks" ON tasks
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update their org tasks" ON tasks
  FOR UPDATE USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

CREATE POLICY "Users can delete their org tasks" ON tasks
  FOR DELETE USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

SELECT 'Tasks RLS policies updated successfully!' AS message;
