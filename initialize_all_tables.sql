-- =====================================================
-- 서울 지하철 광고 영업 시스템 (Antigravity) 통합 초기화 스크립트 v3
-- 모든 테이블 생성, ENUM 타입 정의, RLS 정책 설정을 포함합니다.
-- Supabase SQL Editor에서 실행하세요.
-- =====================================================

-- 0. 사전 준비 (권한 설정)
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- 1. ENUM 타입 생성
-- =====================================================
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE call_outcome AS ENUM ('NO_ANSWER', 'REJECTED', 'INTERESTED', 'CALLBACK_REQUESTED', 'MEETING_SCHEDULED', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE progress_step AS ENUM ('PROPOSAL_SENT', 'FIRST_CALL', 'MEETING_SCHEDULED', 'CONTRACT_SIGNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('CALL', 'MEETING', 'PROPOSAL', 'FOLLOW_UP', 'CONTRACT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. 핵심 테이블 생성 (Idempotent)
-- =====================================================

-- 조직(Organization) 테이블
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 조직 멤버 테이블
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  permissions JSONB DEFAULT '{"can_export": true, "can_delete_lead": false, "can_view_sensitive": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 리드(leads) 테이블
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_name VARCHAR(255) NOT NULL,
  biz_id VARCHAR(50),
  license_date VARCHAR(20),
  road_address TEXT,
  lot_address TEXT,
  coord_x DECIMAL(15, 6),
  coord_y DECIMAL(15, 6),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  phone VARCHAR(50),
  medical_subject TEXT,
  category VARCHAR(50) DEFAULT 'HEALTH',
  service_id VARCHAR(50),
  service_name VARCHAR(100),
  nearest_station VARCHAR(100),
  station_distance INTEGER,
  station_lines TEXT[],
  status lead_status DEFAULT 'NEW',
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 광고매체 인벤토리(ad_inventory)
CREATE TABLE IF NOT EXISTS ad_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name VARCHAR(100) NOT NULL,
  location_code VARCHAR(50) NOT NULL,
  ad_type VARCHAR(50) NOT NULL,
  ad_size VARCHAR(50),
  price_monthly DECIMAL(12, 0),
  price_weekly DECIMAL(12, 0),
  availability_status availability_status DEFAULT 'AVAILABLE',
  available_from DATE,
  available_to DATE,
  floor_plan_url TEXT,
  spot_position_x INTEGER,
  spot_position_y INTEGER,
  description TEXT,
  traffic_daily INTEGER,
  demographics TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_name, location_code)
);

-- 역사 배치도(floor_plans)
CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name VARCHAR(100) NOT NULL UNIQUE,
  floor_name VARCHAR(50) DEFAULT 'B1',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 제안서(proposals)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  greeting_message TEXT,
  inventory_ids UUID[],
  total_price DECIMAL(12, 0),
  discount_rate DECIMAL(5, 2),
  final_price DECIMAL(12, 0),
  effect_analysis JSONB,
  pdf_url TEXT,
  status proposal_status DEFAULT 'DRAFT',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 통화 기록(call_logs)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER,
  outcome call_outcome NOT NULL,
  contact_person VARCHAR(100),
  notes TEXT,
  next_action TEXT,
  next_contact_date DATE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 영업 진행 상황(sales_progress)
CREATE TABLE IF NOT EXISTS sales_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step progress_step NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  UNIQUE(lead_id, step)
);

-- 업무/스케줄(tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  task_type task_type NOT NULL DEFAULT 'OTHER',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  status task_status NOT NULL DEFAULT 'PENDING',
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  assignee VARCHAR(100),
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 설정(user_settings)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT,
  cors_proxy TEXT,
  search_type VARCHAR(50) DEFAULT 'modified_date',
  region_code VARCHAR(20) DEFAULT '6110000',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 활동 로그(activity_logs)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 엑셀 업로드 기록(excel_uploads)
CREATE TABLE IF NOT EXISTS excel_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  row_count INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  errors JSONB,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 트리거 설정
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND column_name = 'updated_at' 
           AND table_name IN ('leads', 'ad_inventory', 'floor_plans', 'proposals', 'user_settings', 'organizations', 'tasks')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trigger_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- 4. RLS 정책 설정 (Fail-safe)
-- =====================================================

-- RLS 활성화
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS excel_uploads ENABLE ROW LEVEL SECURITY;

-- 정책 생성 함수 (중복 에러 방지용)
DO $$ 
BEGIN
    -- Leads Policies
    DROP POLICY IF EXISTS "Users can view org leads" ON leads;
    CREATE POLICY "Users can view org leads" ON leads FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Users can manage org leads" ON leads;
    CREATE POLICY "Users can manage org leads" ON leads FOR ALL USING (true);

    -- Other development access policies
    DROP POLICY IF EXISTS "Early dev access" ON organization_members;
    CREATE POLICY "Early dev access" ON organization_members FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access org" ON organizations;
    CREATE POLICY "Early dev access org" ON organizations FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access call" ON call_logs;
    CREATE POLICY "Early dev access call" ON call_logs FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access sales" ON sales_progress;
    CREATE POLICY "Early dev access sales" ON sales_progress FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access tasks" ON tasks;
    CREATE POLICY "Early dev access tasks" ON tasks FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access proposals" ON proposals;
    CREATE POLICY "Early dev access proposals" ON proposals FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access flows" ON floor_plans;
    CREATE POLICY "Early dev access flows" ON floor_plans FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access excel" ON excel_uploads;
    CREATE POLICY "Early dev access excel" ON excel_uploads FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Early dev access logs" ON activity_logs;
    CREATE POLICY "Early dev access logs" ON activity_logs FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow all for ad_inventory" ON ad_inventory;
    CREATE POLICY "Allow all for ad_inventory" ON ad_inventory FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
    CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (true);
END $$;

-- 5. 권한 부여 (최종 확인)
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 6. 완료
-- =====================================================
SELECT 'Neo-Seoul Antigravity Database Initialized Successfully!' AS message;
