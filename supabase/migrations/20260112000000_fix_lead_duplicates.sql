-- =====================================================
-- 리드 데이터 중복 문제 해결 마이그레이션
-- 1. 문자열 정규화 함수 생성
-- 2. 기존 중복 데이터 정리
-- 3. UNIQUE 제약조건 추가
-- =====================================================

-- 1. 문자열 정규화 함수 생성
-- 공백 정리, 대소문자 통일, 특수문자 제거
CREATE OR REPLACE FUNCTION normalize_lead_key(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN '';
  END IF;

  -- 앞뒤 공백 제거, 연속 공백을 단일 공백으로, 소문자 변환
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(input_text, '\s+', ' ', 'g'),  -- 연속 공백 -> 단일 공백
        '[　]', ' ', 'g'  -- 전각 공백 -> 반각 공백
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. 기존 중복 데이터 정리 (가장 오래된 레코드 유지)
-- 임시 테이블에 유지할 ID 저장
CREATE TEMP TABLE leads_to_keep AS
SELECT DISTINCT ON (
  normalize_lead_key(biz_name),
  normalize_lead_key(road_address),
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
  id
FROM leads
ORDER BY
  normalize_lead_key(biz_name),
  normalize_lead_key(road_address),
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  created_at ASC NULLS LAST,
  id ASC;

-- 중복 레코드 삭제 (유지할 ID 제외)
DELETE FROM leads
WHERE id NOT IN (SELECT id FROM leads_to_keep);

-- 삭제된 레코드 수 로그 (디버깅용)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '중복 리드 삭제 완료: % 건', deleted_count;
END $$;

-- 임시 테이블 삭제
DROP TABLE leads_to_keep;

-- 3. 정규화된 컬럼 추가 (인덱스 성능 향상)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS biz_name_normalized TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS road_address_normalized TEXT;

-- 기존 데이터 정규화 값 업데이트
UPDATE leads SET
  biz_name_normalized = normalize_lead_key(biz_name),
  road_address_normalized = normalize_lead_key(road_address);

-- 4. 트리거 생성 - INSERT/UPDATE 시 자동 정규화
CREATE OR REPLACE FUNCTION trigger_normalize_lead_keys()
RETURNS TRIGGER AS $$
BEGIN
  NEW.biz_name_normalized := normalize_lead_key(NEW.biz_name);
  NEW.road_address_normalized := normalize_lead_key(NEW.road_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_normalize_keys ON leads;
CREATE TRIGGER leads_normalize_keys
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_lead_keys();

-- 5. UNIQUE 제약조건 추가 (정규화된 값 + 조직 ID 기준)
-- organization_id가 NULL인 경우도 처리하기 위해 COALESCE 사용
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_biz_address_org
ON leads (
  biz_name_normalized,
  road_address_normalized,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- 6. 기존 인덱스 최적화 (정규화 컬럼 활용)
CREATE INDEX IF NOT EXISTS idx_leads_biz_name_normalized ON leads (biz_name_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_road_address_normalized ON leads (road_address_normalized);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '리드 중복 방지 마이그레이션 완료';
  RAISE NOTICE '- 문자열 정규화 함수 생성됨';
  RAISE NOTICE '- 기존 중복 데이터 정리됨';
  RAISE NOTICE '- UNIQUE 제약조건 추가됨';
  RAISE NOTICE '- 자동 정규화 트리거 설정됨';
END $$;
