-- =============================================
-- tasks 테이블 마이그레이션
-- 업무/스케줄 관리를 위한 테이블 생성
-- =============================================

-- ENUM 타입 생성
DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('CALL', 'MEETING', 'PROPOSAL', 'FOLLOW_UP', 'CONTRACT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- tasks 테이블 생성
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- 연결된 리드 (선택)
  task_type task_type NOT NULL DEFAULT 'OTHER',          -- 업무 유형
  title VARCHAR(255) NOT NULL,                           -- 업무 제목
  description TEXT,                                      -- 상세 설명
  due_date DATE NOT NULL,                                -- 예정일
  due_time TIME,                                         -- 예정 시간
  status task_status NOT NULL DEFAULT 'PENDING',         -- 상태
  priority task_priority NOT NULL DEFAULT 'MEDIUM',      -- 우선순위
  assignee VARCHAR(100),                                 -- 담당자
  reminder_at TIMESTAMPTZ,                               -- 알림 시간
  completed_at TIMESTAMPTZ,                              -- 완료 시간
  notes TEXT,                                            -- 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status ON tasks(due_date, status);

-- updated_at 트리거
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all for tasks" ON tasks;
DROP POLICY IF EXISTS "Allow select on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow insert on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow update on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow delete on tasks" ON tasks;

-- 모든 인증된 사용자가 CRUD 가능 (개발용 - 프로덕션에서는 조직별 격리 필요)
CREATE POLICY "Allow select on tasks"
  ON tasks FOR SELECT USING (true);

CREATE POLICY "Allow insert on tasks"
  ON tasks FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on tasks"
  ON tasks FOR UPDATE USING (true);

CREATE POLICY "Allow delete on tasks"
  ON tasks FOR DELETE USING (true);

-- =============================================
-- 완료 메시지
-- =============================================
SELECT 'Tasks table created successfully!' AS message;
