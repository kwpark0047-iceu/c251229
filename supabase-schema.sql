-- 서울 지하철 광고 영업 시스템 (Lead Manager) 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 리드 상태 ENUM 타입
CREATE TYPE lead_status AS ENUM ('NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED');

-- 리드(병원) 테이블
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 병원 기본 정보 (API에서 수집)
    biz_name VARCHAR(255) NOT NULL,           -- 사업장명 (병원명)
    biz_id VARCHAR(100),                      -- 사업자등록번호
    license_date DATE,                        -- 인허가일자

    -- 주소 정보
    road_address TEXT,                        -- 도로명 주소
    lot_address TEXT,                         -- 지번 주소

    -- 좌표 정보
    coord_x DOUBLE PRECISION,                 -- 원본 X 좌표 (GRS80)
    coord_y DOUBLE PRECISION,                 -- 원본 Y 좌표 (GRS80)
    latitude DOUBLE PRECISION,                -- 위도 (WGS84)
    longitude DOUBLE PRECISION,               -- 경도 (WGS84)

    -- 연락처 정보
    phone VARCHAR(50),                        -- 전화번호

    -- 진료 정보
    medical_subject TEXT,                     -- 진료과목

    -- 인근 지하철역 정보
    nearest_station VARCHAR(100),             -- 가장 가까운 역 이름
    station_distance INTEGER,                 -- 역까지 거리 (미터)
    station_lines TEXT[],                     -- 해당 역 노선들

    -- 영업 관리
    status lead_status DEFAULT 'NEW',         -- 리드 상태
    notes TEXT,                               -- 메모
    assigned_to UUID,                         -- 담당자 (auth.users 참조)

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 중복 방지
    UNIQUE(biz_id)
);

-- 상태 변경 이력 테이블
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    old_status lead_status,
    new_status lead_status NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

-- 설정 테이블 (사용자별 설정 저장)
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    api_key TEXT,
    cors_proxy TEXT DEFAULT 'https://corsproxy.io/?',
    search_type VARCHAR(20) DEFAULT 'license_date',  -- license_date 또는 modified_date
    region_code VARCHAR(20) DEFAULT '6110000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 상태 변경 시 이력 자동 기록 트리거
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO lead_status_history (lead_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_lead_status_change
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- RLS (Row Level Security) 정책
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 리드를 조회/수정할 수 있도록 설정 (실제 환경에서는 조정 필요)
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all operations on lead_status_history" ON lead_status_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_settings" ON user_settings FOR ALL USING (true);

-- 인덱스 생성
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_license_date ON leads(license_date);
CREATE INDEX idx_leads_nearest_station ON leads(nearest_station);
CREATE INDEX idx_leads_created_at ON leads(created_at);
