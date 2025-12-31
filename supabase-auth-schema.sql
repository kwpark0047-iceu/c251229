-- =====================================================
-- 인증 시스템 스키마 (Supabase Auth + 조직 기반 데이터 격리)
-- =====================================================
-- 실행 순서: 이 파일을 Supabase SQL Editor에서 실행하세요.
-- 기존 supabase-schema.sql 실행 후 이 파일을 실행해야 합니다.
-- =====================================================

-- 1. 조직(Organization) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 조직 멤버 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- 3. 기존 테이블에 organization_id 컬럼 추가
-- =====================================================
DO $$
BEGIN
  -- leads 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organization_id') THEN
    ALTER TABLE leads ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- ad_inventory 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_inventory' AND column_name = 'organization_id') THEN
    ALTER TABLE ad_inventory ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- proposals 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'organization_id') THEN
    ALTER TABLE proposals ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- call_logs 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'organization_id') THEN
    ALTER TABLE call_logs ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- sales_progress 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_progress' AND column_name = 'organization_id') THEN
    ALTER TABLE sales_progress ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- floor_plans 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'floor_plans' AND column_name = 'organization_id') THEN
    ALTER TABLE floor_plans ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- excel_uploads 테이블
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'excel_uploads' AND column_name = 'organization_id') THEN
    ALTER TABLE excel_uploads ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_inventory_org ON ad_inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_org ON call_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_progress_org ON sales_progress(organization_id);

-- 4. user_settings 테이블 수정 (user_id를 auth.users 참조로)
-- =====================================================
DO $$
BEGIN
  -- organization_id 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'organization_id') THEN
    ALTER TABLE user_settings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. RLS 정책 업데이트
-- =====================================================

-- 헬퍼 함수: 현재 사용자의 조직 ID 조회
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 헬퍼 함수: 사용자가 조직에 속해 있는지 확인
CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = org_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- organizations 테이블 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- organization_members 테이블 RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their org members" ON organization_members;
CREATE POLICY "Users can view their org members" ON organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can join organizations" ON organization_members;
CREATE POLICY "Users can join organizations" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage members" ON organization_members;
CREATE POLICY "Owners can manage members" ON organization_members
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR user_id = auth.uid()
  );

-- leads 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for leads" ON leads;
DROP POLICY IF EXISTS "Users can view org leads" ON leads;
CREATE POLICY "Users can view org leads" ON leads
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org leads" ON leads;
CREATE POLICY "Users can insert org leads" ON leads
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org leads" ON leads;
CREATE POLICY "Users can update org leads" ON leads
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org leads" ON leads;
CREATE POLICY "Users can delete org leads" ON leads
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- ad_inventory 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for ad_inventory" ON ad_inventory;
DROP POLICY IF EXISTS "Users can view org inventory" ON ad_inventory;
CREATE POLICY "Users can view org inventory" ON ad_inventory
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org inventory" ON ad_inventory;
CREATE POLICY "Users can insert org inventory" ON ad_inventory
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org inventory" ON ad_inventory;
CREATE POLICY "Users can update org inventory" ON ad_inventory
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org inventory" ON ad_inventory;
CREATE POLICY "Users can delete org inventory" ON ad_inventory
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- proposals 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for proposals" ON proposals;
DROP POLICY IF EXISTS "Users can view org proposals" ON proposals;
CREATE POLICY "Users can view org proposals" ON proposals
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org proposals" ON proposals;
CREATE POLICY "Users can insert org proposals" ON proposals
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org proposals" ON proposals;
CREATE POLICY "Users can update org proposals" ON proposals
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org proposals" ON proposals;
CREATE POLICY "Users can delete org proposals" ON proposals
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- call_logs 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for call_logs" ON call_logs;
DROP POLICY IF EXISTS "Users can view org call_logs" ON call_logs;
CREATE POLICY "Users can view org call_logs" ON call_logs
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org call_logs" ON call_logs;
CREATE POLICY "Users can insert org call_logs" ON call_logs
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org call_logs" ON call_logs;
CREATE POLICY "Users can update org call_logs" ON call_logs
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org call_logs" ON call_logs;
CREATE POLICY "Users can delete org call_logs" ON call_logs
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- sales_progress 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for sales_progress" ON sales_progress;
DROP POLICY IF EXISTS "Users can view org sales_progress" ON sales_progress;
CREATE POLICY "Users can view org sales_progress" ON sales_progress
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org sales_progress" ON sales_progress;
CREATE POLICY "Users can insert org sales_progress" ON sales_progress
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org sales_progress" ON sales_progress;
CREATE POLICY "Users can update org sales_progress" ON sales_progress
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org sales_progress" ON sales_progress;
CREATE POLICY "Users can delete org sales_progress" ON sales_progress
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- floor_plans 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for floor_plans" ON floor_plans;
DROP POLICY IF EXISTS "Users can view org floor_plans" ON floor_plans;
CREATE POLICY "Users can view org floor_plans" ON floor_plans
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org floor_plans" ON floor_plans;
CREATE POLICY "Users can insert org floor_plans" ON floor_plans
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can update org floor_plans" ON floor_plans;
CREATE POLICY "Users can update org floor_plans" ON floor_plans
  FOR UPDATE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can delete org floor_plans" ON floor_plans;
CREATE POLICY "Users can delete org floor_plans" ON floor_plans
  FOR DELETE USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- user_settings 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- excel_uploads 테이블 RLS 업데이트
DROP POLICY IF EXISTS "Allow all for excel_uploads" ON excel_uploads;
DROP POLICY IF EXISTS "Users can view org excel_uploads" ON excel_uploads;
CREATE POLICY "Users can view org excel_uploads" ON excel_uploads
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS "Users can insert org excel_uploads" ON excel_uploads;
CREATE POLICY "Users can insert org excel_uploads" ON excel_uploads
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR user_belongs_to_organization(organization_id)
  );

-- 6. updated_at 트리거 추가
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_organizations_updated_at ON organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 완료! 이제 앱에서 인증 시스템을 사용할 수 있습니다.
-- =====================================================
