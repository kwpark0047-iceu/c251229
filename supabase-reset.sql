-- 기존 테이블 및 타입 삭제 후 재생성
-- 주의: 기존 데이터가 모두 삭제됩니다!

-- 기존 테이블 삭제
DROP TABLE IF EXISTS lead_status_history CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- 기존 타입 삭제
DROP TYPE IF EXISTS lead_status CASCADE;

-- 리드 상태 ENUM 타입 생성
CREATE TYPE lead_status AS ENUM ('NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED');

-- 리드(병원) 테이블
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    biz_name VARCHAR(255) NOT NULL,
    biz_id VARCHAR(100),
    license_date DATE,
    road_address TEXT,
    lot_address TEXT,
    coord_x DOUBLE PRECISION,
    coord_y DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone VARCHAR(50),
    medical_subject TEXT,
    nearest_station VARCHAR(100),
    station_distance INTEGER,
    station_lines TEXT[],
    status lead_status DEFAULT 'NEW',
    notes TEXT,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(biz_id)
);

-- 상태 변경 이력 테이블
CREATE TABLE lead_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    old_status lead_status,
    new_status lead_status NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

-- 설정 테이블
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    api_key TEXT,
    cors_proxy TEXT DEFAULT 'https://corsproxy.io/?',
    search_type VARCHAR(20) DEFAULT 'license_date',
    region_code VARCHAR(20) DEFAULT '6110000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all on history" ON lead_status_history FOR ALL USING (true);
CREATE POLICY "Allow all on settings" ON user_settings FOR ALL USING (true);

-- 인덱스
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_license_date ON leads(license_date);
CREATE INDEX idx_leads_nearest_station ON leads(nearest_station);
