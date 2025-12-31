-- =============================================
-- 서울 지하철 광고 영업 시스템 - Supabase 스키마
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ENUM 타입 생성 (이미 존재하면 스킵)
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

-- =============================================
-- 1. leads 테이블 (리드/사업장 정보)
-- =============================================
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
  -- CRM 확장 필드
  email VARCHAR(255),
  contact_person VARCHAR(100),
  preferred_contact_time VARCHAR(100),
  budget_range VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_nearest_station ON leads(nearest_station);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- =============================================
-- 2. ad_inventory 테이블 (광고매체 인벤토리)
-- =============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_name, location_code)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_station ON ad_inventory(station_name);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON ad_inventory(availability_status);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON ad_inventory(ad_type);

-- =============================================
-- 3. floor_plans 테이블 (역사 배치도)
-- =============================================
CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name VARCHAR(100) NOT NULL UNIQUE,
  floor_name VARCHAR(50) DEFAULT 'B1',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. proposals 테이블 (제안서)
-- =============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- =============================================
-- 5. call_logs 테이블 (통화 기록)
-- =============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_called_at ON call_logs(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_next_contact ON call_logs(next_contact_date);

-- =============================================
-- 6. sales_progress 테이블 (영업 진행 상황)
-- =============================================
CREATE TABLE IF NOT EXISTS sales_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step progress_step NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(lead_id, step)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_progress_lead ON sales_progress(lead_id);

-- =============================================
-- 7. user_settings 테이블 (사용자 설정)
-- =============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  api_key TEXT,
  cors_proxy TEXT,
  search_type VARCHAR(50) DEFAULT 'modified_date',
  region_code VARCHAR(20) DEFAULT '6110000',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. excel_uploads 테이블 (엑셀 업로드 기록)
-- =============================================
CREATE TABLE IF NOT EXISTS excel_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  row_count INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  errors JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- leads
DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ad_inventory
DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON ad_inventory;
CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON ad_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- floor_plans
DROP TRIGGER IF EXISTS trigger_floor_plans_updated_at ON floor_plans;
CREATE TRIGGER trigger_floor_plans_updated_at
  BEFORE UPDATE ON floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- proposals
DROP TRIGGER IF EXISTS trigger_proposals_updated_at ON proposals;
CREATE TRIGGER trigger_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- user_settings
DROP TRIGGER IF EXISTS trigger_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS (Row Level Security) 활성화
-- =============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_uploads ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 접근 허용 정책 (개발용)
DROP POLICY IF EXISTS "Allow all for leads" ON leads;
CREATE POLICY "Allow all for leads" ON leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for ad_inventory" ON ad_inventory;
CREATE POLICY "Allow all for ad_inventory" ON ad_inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for floor_plans" ON floor_plans;
CREATE POLICY "Allow all for floor_plans" ON floor_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for proposals" ON proposals;
CREATE POLICY "Allow all for proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for call_logs" ON call_logs;
CREATE POLICY "Allow all for call_logs" ON call_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for sales_progress" ON sales_progress;
CREATE POLICY "Allow all for sales_progress" ON sales_progress FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for user_settings" ON user_settings;
CREATE POLICY "Allow all for user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for excel_uploads" ON excel_uploads;
CREATE POLICY "Allow all for excel_uploads" ON excel_uploads FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 완료
-- =============================================
SELECT 'Schema created successfully! 8 tables created.' AS message;
