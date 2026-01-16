-- =====================================================
-- 20260121000000_add_proposal_reminders.sql
-- 제안서 리마인더 추적을 위한 컬럼 추가
-- =====================================================

DO $$
BEGIN
  -- last_reminded_at 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'last_reminded_at') THEN
    ALTER TABLE proposals ADD COLUMN last_reminded_at TIMESTAMPTZ;
  END IF;

  -- reminder_count 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'reminder_count') THEN
    ALTER TABLE proposals ADD COLUMN reminder_count INTEGER DEFAULT 0;
  END IF;
END $$;
