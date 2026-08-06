-- 20260806000000_fix_superadmin_membership_policy.sql
-- 슈퍼어드민 소속설정(조직/역할 강제 변경) RLS 정책 보강
-- 문제: 슈퍼어드민이 다른 사용자의 organization_members 행을
--       INSERT/DELETE/UPDATE 하려 해도 기존 정책이 허용하지 않아
--       "소속 조직이 없습니다" / "permission denied" 에러가 발생.
-- 해결: is_super_admin() 함수 보장 + organization_members/organizations에
--       슈퍼어드민 FOR ALL 정책을 USING/WITH CHECK 모두 명시하여 재생성.

-- 1. 슈퍼어드민 판별 함수 (SECURITY DEFINER)
--    이미 존재하면 재정의, 없으면 생성 (멱등)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
$$;

-- 2. organization_members: 슈퍼어드민 전권 정책
--    (SELECT/INSERT/UPDATE/DELETE 모두 허용 — USING + WITH CHECK 명시)
DROP POLICY IF EXISTS "Super admins can manage all organization_members" ON public.organization_members;
CREATE POLICY "Super admins can manage all organization_members"
  ON public.organization_members
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 3. organizations: 슈퍼어드민 전권 정책 (소속설정 모달의 조직 목록 조회/생성 대응)
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
CREATE POLICY "Super admins can view all organizations"
  ON public.organizations
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
