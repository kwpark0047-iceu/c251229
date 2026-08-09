-- 조직별 리드 스코어링 가중치 설정 컬럼 추가
-- (2026-08-10, 6단계 고도화)
-- 구조: JSONB { distance: {max, within300, within700, within1500, over1500},
--               category: {max, health, animalCulture, foodLiving, other},
--               completeness: {max, phone, address, businessName} }
-- NULL이면 DEFAULT_SCORING_CONFIG(src/lib/lead-scoring.ts) 사용
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT NULL;