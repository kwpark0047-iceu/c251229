-- ============================================================
-- 승인 이력(approval_history) 테이블 추가 마이그레이션
-- ============================================================
-- 목적: 관리자(슈퍼어드민)의 멤버 승인/거절/역할변경 조치에 대한
--       감사(audit) 기록을 남긴다. 승인·거절 시점, 처리자, 사유를 추적한다.
-- 참조: gold 20260320010000_add_proposal_logs.sql (동일 패턴)
-- ============================================================

-- 1. 승인 이력 테이블 생성
CREATE TABLE IF NOT EXISTS public.approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('APPROVED', 'REJECTED', 'ROLE_CHANGE')),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY 활성화
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- 3-1. 삽입 정책: 모든 인증 사용자가 승인 이력을 기록할 수 있다
DROP POLICY IF EXISTS "Anyone can insert approval history" ON public.approval_history;
CREATE POLICY "Anyone can insert approval history"
    ON public.approval_history
    FOR INSERT
    WITH CHECK (true);

-- 3-2. 조회 정책: 조직 구성원(승인/슈퍼어드민)은 자신의 조직 승인 이력을 조회할 수 있다
DROP POLICY IF EXISTS "Organizations can view their own approval history" ON public.approval_history;
CREATE POLICY "Organizations can view their own approval history"
    ON public.approval_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.is_super_admin = TRUE OR p.is_approved = TRUE)
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND is_super_admin = TRUE
            )
            OR organization_id IN (
                SELECT m.organization_id
                FROM public.organization_members m
                WHERE m.user_id = auth.uid()
            )
        )
    );

-- 4. 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_history_org_id
    ON public.approval_history (organization_id);

-- 5. 테이블 주석
COMMENT ON TABLE public.approval_history IS '조직 멤버 승인/거절/역할변경 감사 이력';