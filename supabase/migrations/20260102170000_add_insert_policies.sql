-- =====================================================
-- 회원가입 시 조직 생성을 위한 INSERT 정책 추가
-- =====================================================

-- 1. organizations INSERT 정책 (인증된 사용자는 조직 생성 가능)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 2. organization_members INSERT 정책 (자신의 멤버십만 생성 가능)
DROP POLICY IF EXISTS "Users can create their own membership" ON organization_members;
CREATE POLICY "Users can create their own membership" ON organization_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- 3. organizations DELETE 정책 (owner만 삭제 가능)
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
CREATE POLICY "Owners can delete organizations" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND organization_id = organizations.id
        AND role = 'owner'
    )
  );
