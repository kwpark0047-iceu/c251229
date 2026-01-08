-- 업무/스케줄 관리 테이블
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    task_type VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    assignee VARCHAR(100),
    reminder_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_task_type CHECK (task_type IN ('CALL', 'MEETING', 'PROPOSAL', 'FOLLOW_UP', 'CONTRACT', 'OTHER')),
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- RLS 정책
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);
