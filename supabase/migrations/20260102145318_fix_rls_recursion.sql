-- =====================================================
-- organization_members RLS 무한 재귀 문제 수정
-- =====================================================

-- 1. 헬퍼 함수 생성 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. organization_members SELECT 정책 수정
DROP POLICY IF EXISTS "Users can view their org members" ON organization_members;
CREATE POLICY "Users can view their org members" ON organization_members
  FOR SELECT USING (
    -- 자신의 멤버십 레코드이거나
    user_id = auth.uid()
    OR
    -- SECURITY DEFINER 함수를 통해 같은 조직인지 확인
    organization_id IN (SELECT get_user_organization_ids())
  );

-- 3. organization_members DELETE 정책 수정
DROP POLICY IF EXISTS "Owners can manage members" ON organization_members;
CREATE POLICY "Owners can manage members" ON organization_members
  FOR DELETE USING (
    -- 자신의 멤버십은 삭제 가능
    user_id = auth.uid()
    OR
    -- owner/admin은 조직 멤버 관리 가능 (SECURITY DEFINER 함수 사용)
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() 
        AND om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- 4. organizations SELECT 정책도 수정
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT get_user_organization_ids())
  );

-- 5. organizations UPDATE 정책 수정
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
        AND organization_id = organizations.id 
        AND role = 'owner'
    )
  );
