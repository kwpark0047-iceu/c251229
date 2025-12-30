-- 서울 지하철 광고 영업 시스템 (Lead Manager) V2 스키마 확장
-- 광고 인벤토리, 제안서, CRM 기능 추가
-- Supabase SQL Editor에서 실행하세요

-- ============================================
-- 1. ENUM 타입 추가
-- ============================================

-- 광고매체 가용 상태
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');

-- 통화 결과
CREATE TYPE call_outcome AS ENUM (
    'NO_ANSWER',           -- 부재중
    'REJECTED',            -- 거절
    'INTERESTED',          -- 관심
    'CALLBACK_REQUESTED',  -- 콜백 요청
    'MEETING_SCHEDULED',   -- 미팅 잡힘
    'OTHER'                -- 기타
);

-- 제안서 상태
CREATE TYPE proposal_status AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED');

-- 영업 진행 단계
CREATE TYPE progress_step AS ENUM (
    'PROPOSAL_SENT',       -- 제안서 발송
    'FIRST_CALL',          -- 1차 통화
    'MEETING_SCHEDULED',   -- 미팅 잡힘
    'CONTRACT_SIGNED'      -- 계약 성사
);

-- ============================================
-- 2. leads 테이블 확장 (CRM 필드 추가)
-- ============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_contact_time VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_range VARCHAR(50);

-- ============================================
-- 3. 광고매체 재고 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS ad_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 위치 정보
    station_name VARCHAR(100) NOT NULL,          -- 역 이름
    location_code VARCHAR(50) NOT NULL,          -- 위치 코드 (예: 2F-A01)

    -- 광고 정보
    ad_type VARCHAR(50) NOT NULL,                -- 광고 유형 (포스터, 디지털, 랩핑 등)
    ad_size VARCHAR(50),                         -- 광고 크기 (A0, A1, 디지털 사이즈 등)

    -- 가격
    price_monthly DECIMAL(12, 0),                -- 월 단가
    price_weekly DECIMAL(12, 0),                 -- 주 단가

    -- 가용성
    availability_status availability_status DEFAULT 'AVAILABLE',
    available_from DATE,                         -- 가용 시작일
    available_to DATE,                           -- 가용 종료일

    -- 배치도 정보
    floor_plan_url TEXT,                         -- 역사 배치도 URL
    spot_position_x INTEGER,                     -- 배치도 내 X 좌표 (%)
    spot_position_y INTEGER,                     -- 배치도 내 Y 좌표 (%)

    -- 부가 정보
    description TEXT,                            -- 설명
    traffic_daily INTEGER,                       -- 일평균 통행량
    demographics TEXT,                           -- 타겟 인구통계

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약
    UNIQUE(station_name, location_code)
);

-- 인덱스
CREATE INDEX idx_ad_inventory_station ON ad_inventory(station_name);
CREATE INDEX idx_ad_inventory_status ON ad_inventory(availability_status);
CREATE INDEX idx_ad_inventory_type ON ad_inventory(ad_type);

-- ============================================
-- 4. 역사 배치도 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL UNIQUE,   -- 역 이름
    floor_name VARCHAR(50) DEFAULT 'B1',         -- 층 (B2, B1, 1F, 2F 등)
    image_url TEXT NOT NULL,                     -- 외부 이미지 URL
    thumbnail_url TEXT,                          -- 썸네일 URL
    width INTEGER,                               -- 원본 이미지 너비
    height INTEGER,                              -- 원본 이미지 높이
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_floor_plans_station ON floor_plans(station_name);

-- ============================================
-- 5. 제안서 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    -- 제안서 내용
    title VARCHAR(255) NOT NULL,                 -- 제안서 제목
    greeting_message TEXT,                       -- 인사말
    inventory_ids UUID[],                        -- 포함된 광고 매체 ID들

    -- 금액
    total_price DECIMAL(12, 0),                  -- 총 금액
    discount_rate DECIMAL(5, 2) DEFAULT 0,       -- 할인율
    final_price DECIMAL(12, 0),                  -- 최종 금액

    -- 효과 분석 (JSON)
    effect_analysis JSONB,

    -- 상태
    pdf_url TEXT,                                -- 생성된 PDF URL
    status proposal_status DEFAULT 'DRAFT',
    sent_at TIMESTAMPTZ,                         -- 발송 시각
    viewed_at TIMESTAMPTZ,                       -- 열람 시각

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- ============================================
-- 6. 통화 기록 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    -- 통화 정보
    called_at TIMESTAMPTZ DEFAULT NOW(),         -- 통화 시각
    duration_seconds INTEGER,                    -- 통화 시간 (초)
    outcome call_outcome NOT NULL,               -- 통화 결과
    contact_person VARCHAR(100),                 -- 담당자명

    -- 메모
    notes TEXT,                                  -- 통화 메모
    next_action TEXT,                            -- 다음 액션
    next_contact_date DATE,                      -- 다음 연락 예정일

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_lead ON call_logs(lead_id);
CREATE INDEX idx_call_logs_outcome ON call_logs(outcome);
CREATE INDEX idx_call_logs_called_at ON call_logs(called_at);

-- ============================================
-- 7. 영업 진행 체크리스트 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS sales_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    step progress_step NOT NULL,                 -- 진행 단계
    completed_at TIMESTAMPTZ,                    -- 완료 시각
    notes TEXT,                                  -- 메모

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(lead_id, step)
);

CREATE INDEX idx_sales_progress_lead ON sales_progress(lead_id);

-- ============================================
-- 8. 엑셀 업로드 기록 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS excel_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,                              -- Supabase Storage 경로
    file_size INTEGER,
    row_count INTEGER,                           -- 처리된 행 수
    success_count INTEGER,                       -- 성공 건수
    error_count INTEGER,                         -- 실패 건수
    errors JSONB,                                -- 에러 상세 (행번호, 메시지)
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 트리거 설정
-- ============================================

CREATE TRIGGER update_ad_inventory_updated_at
    BEFORE UPDATE ON ad_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floor_plans_updated_at
    BEFORE UPDATE ON floor_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. RLS 정책
-- ============================================

ALTER TABLE ad_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ad_inventory" ON ad_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations on floor_plans" ON floor_plans FOR ALL USING (true);
CREATE POLICY "Allow all operations on proposals" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow all operations on call_logs" ON call_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales_progress" ON sales_progress FOR ALL USING (true);
CREATE POLICY "Allow all operations on excel_uploads" ON excel_uploads FOR ALL USING (true);
