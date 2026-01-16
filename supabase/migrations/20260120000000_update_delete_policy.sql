-- =====================================================
-- 20260120000000_update_delete_policy.sql
-- 리드 삭제 정책 강화 (Owner/Admin만 삭제 가능)
-- =====================================================

-- 1. 헬퍼 함수: 현재 사용자의 조직 내 역할 조회
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = org_id
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. leads 테이블 DELETE 정책 수정
DROP POLICY IF EXISTS "Users can delete org leads" ON leads;
CREATE POLICY "Owners and Admins can delete org leads" ON leads
  FOR DELETE USING (
    organization_id IS NOT NULL 
    AND (
      EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
          AND organization_id = leads.organization_id 
          AND role IN ('owner', 'admin')
      )
    )
  );

-- 3. 다른 주요 테이블에도 동일한 정책 적용 고려 (선택 사항)
-- ad_inventory
DROP POLICY IF EXISTS "Users can delete org inventory" ON ad_inventory;
CREATE POLICY "Owners and Admins can delete org inventory" ON ad_inventory
  FOR DELETE USING (
    organization_id IS NOT NULL 
    AND (
      EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
          AND organization_id = ad_inventory.organization_id 
          AND role IN ('owner', 'admin')
      )
    )
  );
