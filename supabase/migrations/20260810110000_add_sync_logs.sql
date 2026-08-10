-- 20260810110000_add_sync_logs.sql
-- 자동 동기화(매일 06:10 크론) 실행 이력 추적 테이블
--
-- 목적: 조직별·소스별 마지막 동기화 시각과 증분(추가/수정/건너뜀/실패) 건수를 기록하여
--       '추가수정된 데이터만' 동기화가 실제로 잘 동작하는지 운영 측면에서 확인 가능하게 한다.
--       (리드 병합 자체는 mgt_no 기준 upsertLeadsByMgtNo가 신규 insert/기존 update로 처리)

CREATE TABLE IF NOT EXISTS source_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  source_label TEXT,
  status TEXT NOT NULL DEFAULT 'success',          -- success / error
  total_count INTEGER DEFAULT 0,                   -- 공공 API 총 건수
  fetched_count INTEGER DEFAULT 0,                 -- 유효하게 가져온 건수 (폐업 제외 등)
  inserted_count INTEGER DEFAULT 0,                -- 신규 추가
  updated_count INTEGER DEFAULT 0,                 -- 기존 수정
  skipped_count INTEGER DEFAULT 0,                 -- UNIQUE 충돌 등 건너뜀
  failed_count INTEGER DEFAULT 0,                  -- 저장 실패
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  -- 조직별·소스별 1행 유지 (재실행 시 덮어쓰기)
  CONSTRAINT source_sync_logs_org_source_unique UNIQUE (organization_id, source_key)
);

-- 최신 실행 이력 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_source_sync_logs_org_finished
  ON source_sync_logs (organization_id, finished_at DESC);