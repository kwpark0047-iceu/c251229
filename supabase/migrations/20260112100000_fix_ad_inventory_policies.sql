-- =====================================================
-- ad_inventory 테이블 RLS 정책 및 제약조건 수정
-- =====================================================

-- 1. 기존 제약조건 삭제 (있으면)
ALTER TABLE ad_inventory DROP CONSTRAINT IF EXISTS ad_inventory_station_location_unique;

-- 2. 복합 유니크 제약조건 추가 (upsert를 위해 필요)
ALTER TABLE ad_inventory
  ADD CONSTRAINT ad_inventory_station_location_unique
  UNIQUE (station_name, location_code);

-- 3. RLS 활성화 확인
ALTER TABLE ad_inventory ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their org inventory" ON ad_inventory;
DROP POLICY IF EXISTS "Users can insert their org inventory" ON ad_inventory;
DROP POLICY IF EXISTS "Users can update their org inventory" ON ad_inventory;
DROP POLICY IF EXISTS "Users can delete their org inventory" ON ad_inventory;

-- 5. SELECT 정책 (조직의 인벤토리 조회)
CREATE POLICY "Users can view their org inventory" ON ad_inventory
  FOR SELECT USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

-- 6. INSERT 정책 (조직 인벤토리 생성)
CREATE POLICY "Users can insert their org inventory" ON ad_inventory
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

-- 7. UPDATE 정책 (조직 인벤토리 수정)
CREATE POLICY "Users can update their org inventory" ON ad_inventory
  FOR UPDATE USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

-- 8. DELETE 정책 (조직 인벤토리 삭제)
CREATE POLICY "Users can delete their org inventory" ON ad_inventory
  FOR DELETE USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR organization_id IS NULL
  );

-- 9. excel_uploads 테이블 RLS (없으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'excel_uploads') THEN
    CREATE TABLE excel_uploads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      row_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      errors JSONB,
      organization_id UUID REFERENCES organizations(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE excel_uploads ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can manage their excel uploads" ON excel_uploads
      FOR ALL USING (
        organization_id IN (SELECT get_user_organization_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;
