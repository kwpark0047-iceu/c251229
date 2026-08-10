-- =====================================================
-- 제안서 접근 로그 테이블 (열람/다운로드 추적)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.proposal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT, -- 비회원 또는 이메일 수신자 식별용
  action_type TEXT NOT NULL CHECK (action_type IN ('VIEW', 'DOWNLOAD')),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.proposal_logs ENABLE ROW LEVEL SECURITY;

-- 1. 로그 입력 권한 (모든 인증된 사용자 또는 익명 접근 허용 시 정책 조절)
-- 제안서를 확인하는 누구나 로그를 남길 수 있어야 함
DROP POLICY IF EXISTS "Anyone can insert proposal logs" ON public.proposal_logs;
CREATE POLICY "Anyone can insert proposal logs" ON public.proposal_logs
  FOR INSERT WITH CHECK (true);

-- 2. 로그 조회 권한 (매체사 및 슈퍼 어드민)
-- 자신이 속한 조직의 제안서 로그만 조회 가능
DROP POLICY IF EXISTS "Organizations can view their own proposal logs" ON public.proposal_logs;
CREATE POLICY "Organizations can view their own proposal logs" ON public.proposal_logs
  FOR SELECT USING (
    -- 슈퍼 어드민이거나 조직 멤버인 경우
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (p.is_super_admin = TRUE OR p.is_approved = TRUE)
    )
    AND 
    (
      -- 슈퍼 어드민은 전부 가능
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
      OR
      -- 일반 멤버는 자신의 조직 로그만 가능
      organization_id IN (
        SELECT m.organization_id FROM organization_members m WHERE m.user_id = auth.uid()
      )
    )
  );

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_proposal_logs_proposal_id ON public.proposal_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_logs_org_id ON public.proposal_logs(organization_id);

COMMENT ON TABLE public.proposal_logs IS '제안서 접근 로그 (열람 및 다운로드 이력)';
