-- 20260814000000_add_sopo_fields_to_leads.sql
-- SOPO(소상공인시장진흥공단) 상가정보 필드를 leads 테이블에 추가

-- 상가업소번호 (상가업소 고유 식별자)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_bizes_id VARCHAR(50);
COMMENT ON COLUMN leads.sopo_bizes_id IS '상가업소번호 (SOPO 상가업소번호)';

-- 상호명
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_biz_name VARCHAR(100);
COMMENT ON COLUMN leads.sopo_biz_name IS '상호명 (소상공인시장진흥공단 상호명)';

-- 도로명 주소
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_road_address VARCHAR(200);
COMMENT ON COLUMN leads.sopo_road_address IS '도로명 주소 (주소 기반)';

-- 지번 주소
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_lot_address VARCHAR(100);
COMMENT ON COLUMN leads.sopo_lot_address IS '지번 주소 (구 주소)';

-- 위도 (WGS84 좌표)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_latitude FLOAT;
COMMENT ON COLUMN leads.sopo_latitude IS '위도 (WGS84 좌표, SOPO로부터 매핑)';

-- 경도 (WGS84 좌표)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_longitude FLOAT;
COMMENT ON COLUMN leads.sopo_longitude IS '경도 (WGS84 좌표, SOPO로부터 매핑)';

-- 대분류 업종코드 (indsLclsCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_large VARCHAR(10);
COMMENT ON COLUMN leads.sopo_category_large IS '대분류 업종코드 (indsLclsCd, 업종 대분류)';

-- 대분류 업종명
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_large_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_category_large_name IS '대분류 업종명';

-- 중분류 업종코드 (indsMclsCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_middle VARCHAR(10);
COMMENT ON COLUMN leads.sopo_category_middle IS '중분류 업종코드 (indsMclsCd, 업종 중분류)';

-- 중분류 업종명
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_middle_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_category_middle_name IS '중분류 업종명';

-- 소분류 업종코드 (indsSclsCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_small VARCHAR(10);
COMMENT ON COLUMN leads.sopo_category_small IS '소분류 업종코드 (indsSclsCd, 업종 소분류)';

-- 소분류 업종명
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_category_small_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_category_small_name IS '소분류 업종명';

-- 시도코드 (ctprvnCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_province_code VARCHAR(10);
COMMENT ON COLUMN leads.sopo_province_code IS '시도코드 (ctprvnCd, 시도코드)';

-- 시도명 (ctprvnNm)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_province_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_province_name IS '시도명 (ctprvnNm, 시도명)';

-- 시군구코드 (signguCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_district_code VARCHAR(10);
COMMENT ON COLUMN leads.sopo_district_code IS '시군구코드 (signguCd, 시군구코드)';

-- 시군구명 (signguNm)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_district_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_district_name IS '시군구명 (signguNm, 시군구명)';

-- 행정동코드 (adongCd)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_dong_code VARCHAR(10);
COMMENT ON COLUMN leads.sopo_dong_code IS '행정동코드 (adongCd, 행정동코드)';

-- 행정동명 (adongNm)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_dong_name VARCHAR(50);
COMMENT ON COLUMN leads.sopo_dong_name IS '행정동명 (adongNm, 행정동명)';

-- 조사연월 (stdrYm, YYYYMM 형식)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_std_ym VARCHAR(6);
COMMENT ON COLUMN leads.sopo_std_ym IS '조사연월 (stdrYm, YYYYMM 형식, SOPO 조사연도-월)';

-- SOPO 데이터 조회 일시
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS sopo_data_fetched_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN leads.sopo_data_fetched_at IS 'SOPO 데이터 조회 일시 (조회 시각, UTC)';

-- 인덱스: 행정동별 조회 성능 최적화
CREATE INDEX IF NOT EXISTS idx_leads_sopo_dong ON leads(sopo_dong_code);
COMMENT ON INDEX idx_leads_sopo_dong IS '행정동코드 기반 색인 (SOPO 조회 성능 최적화)';

-- 인덱스: 시도/시군구 복합 조회 성능 최적화
CREATE INDEX IF NOT EXISTS idx_leads_sopo_prov_dist ON leads(sopo_province_code, sopo_district_code);
COMMENT ON INDEX idx_leads_sopo_prov_dist IS '시도/시군구 복합 색인 (SOPO 필터링 성능 최적화)';

-- 정책: 삭제 정책 - SOPO 데이터가 있는 레코드는 관리자만 수정 가능
-- (기존 정책과 병합하거나 별도 처리)