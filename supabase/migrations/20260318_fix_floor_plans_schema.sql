-- =====================================================
-- 지하철 역사 도면(floor_plans) 테이블 스키마 보정 및 확장
-- 작성일: 2026-03-18
-- =====================================================

-- 1. 기존 UNIQUE 제약 조건 제거 (station_name 단일 제약 조건은 멀티 노선/층 대응 불가)
ALTER TABLE IF EXISTS public.floor_plans DROP CONSTRAINT IF EXISTS floor_plans_station_name_key;

-- 2. 필수 컬럼 추가 및 타입 수정
ALTER TABLE public.floor_plans 
ADD COLUMN IF NOT EXISTS line_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'station_layout',
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 3. 기존 데이터 보정 (null 값 방지)
UPDATE public.floor_plans SET line_number = '2' WHERE line_number IS NULL;
UPDATE public.floor_plans SET plan_type = 'station_layout' WHERE plan_type IS NULL;

-- 4. 복합 UNIQUE 제약 조건 추가 (역명, 노선, 도면유형, 층수 조합)
-- 기존에 중복된 데이터가 있을 경우 에러가 발생할 수 있으므로 주의가 필요하지만, 
-- 신규 시스템 구축 단계이므로 강제 적용합니다.
ALTER TABLE public.floor_plans 
ADD CONSTRAINT floor_plans_composite_key UNIQUE (station_name, line_number, plan_type, floor_name);

-- 5. RLS 정책 재설정 (개발 단계에서는 모든 접근 허용)
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for floor_plans" ON public.floor_plans;
CREATE POLICY "Allow all for floor_plans" ON public.floor_plans FOR ALL USING (true);

-- 6. 광고 위치 테이블(floor_plan_ad_positions) 확인 및 인벤토리 연동 강화
-- 이 테이블은 이미 존재할 수 있으므로 IF NOT EXISTS 사용
CREATE TABLE IF NOT EXISTS public.floor_plan_ad_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.ad_inventory(id) ON DELETE SET NULL,
  position_x DECIMAL(10, 4) NOT NULL, -- 0-100 %
  position_y DECIMAL(10, 4) NOT NULL, -- 0-100 %
  label VARCHAR(100),
  ad_code VARCHAR(50),
  marker_color VARCHAR(20) DEFAULT '#3CB54A',
  marker_size INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 광고 위치 테이블 RLS 정책
ALTER TABLE public.floor_plan_ad_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for ad_positions" ON public.floor_plan_ad_positions;
CREATE POLICY "Allow all for ad_positions" ON public.floor_plan_ad_positions FOR ALL USING (true);

-- 7. 권한 부여
GRANT ALL ON public.floor_plans TO anon, authenticated;
GRANT ALL ON public.floor_plan_ad_positions TO anon, authenticated;
