-- 리드 목록 조회(정렬: license_date DESC NULLS LAST, 조직 필터) 인덱스
-- 목적: 리드 조회 statement timeout(57014) 완화. 운영 DB에는 아직 적용하지 않았다 (승인 후 실행).
-- 주의: CONCURRENTLY는 트랜잭션 블록 안에서 실행할 수 없다.
--       마이그레이션 도구가 트랜잭션으로 감싸면 실패하므로 psql 등에서 한 문장씩 실행한다.
--       대용량 테이블 생성 중 쓰기 잠금을 피하기 위해 CONCURRENTLY를 사용한다.

-- 비(非)관리자 조회: organization_id 필터 + 날짜 정렬
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_license_date
  ON leads (organization_id, license_date DESC NULLS LAST);

-- 최고관리자 조회: 조직 필터 없이 날짜 정렬
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_license_date
  ON leads (license_date DESC NULLS LAST);
