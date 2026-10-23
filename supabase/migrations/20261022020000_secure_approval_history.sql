BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

-- 기존 회원 상태를 변경하거나 과거 승인 이력을 추정하여 생성하지 않는다.
CREATE TABLE IF NOT EXISTS public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('APPROVED', 'REJECTED', 'ROLE_CHANGE')),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.approval_history FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.approval_history FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.approval_history TO authenticated;

DROP POLICY IF EXISTS "Anyone can insert approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Organizations can view their own approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Super admins record approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Authorized admins read approval history" ON public.approval_history;

CREATE POLICY "Super admins record approval history"
ON public.approval_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid()) AND actor.is_super_admin = true
  )
);

CREATE POLICY "Authorized admins read approval history"
ON public.approval_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.is_super_admin = true
        OR (
          actor.is_approved = true
          AND EXISTS (
            SELECT 1 FROM public.organization_members member
            WHERE member.user_id = actor.id
              AND member.organization_id = approval_history.organization_id
              AND member.role IN ('owner', 'admin')
          )
        )
      )
  )
);

CREATE INDEX IF NOT EXISTS idx_approval_history_org_id
ON public.approval_history (organization_id);

NOTIFY pgrst, 'reload schema';
COMMIT;
