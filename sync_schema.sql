-- =====================================================
-- 서울 지하철 광고 영업 시스템 (Antigravity) 스키마 동기화 및 권한 설정 v4
-- 1. floor_plans 테이블 누락 컬럼 추가
-- 2. floor_plan_ad_positions 테이블 생성
-- 3. 전역 권한 재설정 (anon, authenticated, service_role)
-- =====================================================

-- 1. floor_plans 테이블 누락 컬럼 추가
-- =====================================================
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS line_number VARCHAR(10);
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'station_layout';
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 기존 unique 제약 제거 후 새로 추가 (중복 에러 방지용)
ALTER TABLE floor_plans DROP CONSTRAINT IF EXISTS floor_plans_station_name_key;
ALTER TABLE floor_plans DROP CONSTRAINT IF EXISTS floor_plans_unique;
ALTER TABLE floor_plans ADD CONSTRAINT floor_plans_unique
    UNIQUE(station_name, line_number, plan_type, floor_name);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_floor_plans_line ON floor_plans(line_number);
CREATE INDEX IF NOT EXISTS idx_floor_plans_type ON floor_plans(plan_type);

-- 2. floor_plan_ad_positions 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS floor_plan_ad_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES ad_inventory(id) ON DELETE SET NULL,
    position_x DECIMAL(5, 2) NOT NULL,
    position_y DECIMAL(5, 2) NOT NULL,
    label VARCHAR(100),
    ad_code VARCHAR(50),
    marker_color VARCHAR(20) DEFAULT '#3CB54A',
    marker_size INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_positions_floor_plan ON floor_plan_ad_positions(floor_plan_id);

-- updated_at 트리거 (함수가 이미 존재한다고 가정)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_floor_plan_ad_positions_updated_at') THEN
        CREATE TRIGGER update_floor_plan_ad_positions_updated_at
            BEFORE UPDATE ON floor_plan_ad_positions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. 권한 부여 (anon, authenticated, service_role)
-- =====================================================
-- 모든 테이블에 대한 권한 부여
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 향후 생성될 객체에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 4. RLS 설정
-- =====================================================
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plan_ad_positions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Early dev access flows" ON floor_plans;
    CREATE POLICY "Early dev access flows" ON floor_plans FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Allow select on floor_plan_ad_positions" ON floor_plan_ad_positions;
    CREATE POLICY "Allow select on floor_plan_ad_positions" ON floor_plan_ad_positions FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Allow all for dev" ON floor_plan_ad_positions;
    CREATE POLICY "Allow all for dev" ON floor_plan_ad_positions FOR ALL USING (true);
END $$;

SELECT 'Neo-Seoul Schema Sync and Permissions Applied Successfully!' AS message;
