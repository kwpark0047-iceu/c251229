# 지하철 역사 도면 페이지 설정 가이드

## 1. Supabase 마이그레이션 실행

Supabase Dashboard에서 SQL Editor로 이동하여 다음 SQL을 실행하세요:

```sql
-- 지하철 역사 도면 페이지 DB 확장
-- floor_plans 테이블 확장 및 ad_positions 테이블 생성

-- ============================================
-- 1. floor_plans 테이블 확장
-- ============================================

-- 노선 번호 컬럼 추가
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS line_number VARCHAR(10);

-- 도면 유형 컬럼 추가 (역구내도면 / PSD도면)
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'station_layout';

-- Supabase Storage 경로
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 원본 파일명
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- 파일 크기 (bytes)
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- 정렬 순서
ALTER TABLE floor_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 기존 unique 제약 제거 후 새로 추가
ALTER TABLE floor_plans DROP CONSTRAINT IF EXISTS floor_plans_station_name_key;
ALTER TABLE floor_plans ADD CONSTRAINT floor_plans_unique
    UNIQUE(station_name, line_number, plan_type, floor_name);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_floor_plans_line ON floor_plans(line_number);
CREATE INDEX IF NOT EXISTS idx_floor_plans_type ON floor_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_floor_plans_line_type ON floor_plans(line_number, plan_type);

-- ============================================
-- 2. floor_plan_ad_positions 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS floor_plan_ad_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES ad_inventory(id) ON DELETE SET NULL,

    -- 도면 위 위치 (퍼센트)
    position_x DECIMAL(5, 2) NOT NULL,  -- X 좌표 (0-100%)
    position_y DECIMAL(5, 2) NOT NULL,  -- Y 좌표 (0-100%)

    -- 라벨 및 설명
    label VARCHAR(100),
    ad_code VARCHAR(50),  -- 광고 위치 코드

    -- 마커 스타일
    marker_color VARCHAR(20) DEFAULT '#3CB54A',
    marker_size INTEGER DEFAULT 24,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ad_positions_floor_plan ON floor_plan_ad_positions(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_ad_positions_inventory ON floor_plan_ad_positions(inventory_id);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_floor_plan_ad_positions_updated_at ON floor_plan_ad_positions;
CREATE TRIGGER update_floor_plan_ad_positions_updated_at
    BEFORE UPDATE ON floor_plan_ad_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS 정책
-- ============================================

ALTER TABLE floor_plan_ad_positions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow select on floor_plan_ad_positions" ON floor_plan_ad_positions;
DROP POLICY IF EXISTS "Allow insert on floor_plan_ad_positions" ON floor_plan_ad_positions;
DROP POLICY IF EXISTS "Allow update on floor_plan_ad_positions" ON floor_plan_ad_positions;
DROP POLICY IF EXISTS "Allow delete on floor_plan_ad_positions" ON floor_plan_ad_positions;

-- 모든 사용자가 조회 가능
CREATE POLICY "Allow select on floor_plan_ad_positions"
    ON floor_plan_ad_positions FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능
CREATE POLICY "Allow insert on floor_plan_ad_positions"
    ON floor_plan_ad_positions FOR INSERT WITH CHECK (true);

-- 모든 사용자가 수정 가능
CREATE POLICY "Allow update on floor_plan_ad_positions"
    ON floor_plan_ad_positions FOR UPDATE USING (true);

-- 모든 사용자가 삭제 가능
CREATE POLICY "Allow delete on floor_plan_ad_positions"
    ON floor_plan_ad_positions FOR DELETE USING (true);
```

## 2. Storage 버킷 생성

Supabase Dashboard → Storage에서:

1. **New bucket** 클릭
2. 이름: `floor-plans`
3. Public bucket: **체크** (공개 접근 허용)
4. **Create bucket** 클릭

### Storage 정책 설정

생성된 버킷의 Policies 탭에서:

```sql
-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT USING (bucket_id = 'floor-plans');

-- 모든 사용자가 업로드 가능
CREATE POLICY "Allow public upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'floor-plans');

-- 모든 사용자가 삭제 가능
CREATE POLICY "Allow public delete" ON storage.objects
FOR DELETE USING (bucket_id = 'floor-plans');
```

## 3. JPG 파일 업로드

### 방법 1: 스크립트 사용

```bash
cd C:\Users\user\c251229
node scripts/upload-floor-plans.js
```

### 방법 2: 웹 UI 사용

1. 개발 서버 실행: `npm run dev`
2. http://localhost:3000/floor-plans 접속
3. 업로드 버튼 클릭하여 파일 업로드

## 4. 확인

- http://localhost:3000/floor-plans 접속
- 노선 탭 클릭하여 도면 표시 확인
- 일괄 다운로드 기능 테스트

## 파일 구조

```
src/app/floor-plans/
├── page.tsx                 # 메인 페이지
├── types.ts                 # 타입 정의
├── floor-plan-service.ts    # DB 서비스
├── storage-service.ts       # Storage 서비스
└── components/
    ├── LineSelector.tsx     # 노선 선택 탭
    ├── StationList.tsx      # 역 목록 사이드바
    ├── FloorPlanViewer.tsx  # 도면 뷰어
    └── BatchDownloadModal.tsx # 일괄 다운로드 모달

src/app/api/floor-plans/
├── upload/route.ts          # 업로드 API
└── download/route.ts        # ZIP 다운로드 API

scripts/
└── upload-floor-plans.js    # 일괄 업로드 스크립트
```
