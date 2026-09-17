-- 회원 승인/거절 기능을 위한 프로필 컬럼 추가
-- - approved_at: 승인된 시각 (NULL이면 아직 승인되지 않음)
-- - approved_by: 승인한 관리자 ID
-- - rejected_at: 거절된 시각 (is_approved=false 이고 rejected_at이 설정되면 거절 상태)
-- - reject_reason: 거절 사유 (거절 시 이메일 발송에 사용)
-- 멱등성 보장: ADD COLUMN IF NOT EXISTS 사용

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reject_reason text NULL;