-- 20260812100000_fix_profiles_policy_recursion.sql
-- profiles RLS 무한 재귀(infinite recursion) 정책 수정
--
-- 문제:
--   "Super admins can manage all profiles" 정책이 USING 절에서
--   profiles 테이블을 다시 조회함
--     EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = TRUE)
--   → 정책 평가 중 profiles RLS가 재진입되어
--     "infinite recursion detected in policy for relation 'profiles'" 에러 발생.
--
-- 해결:
--   is_super_admin() (SECURITY DEFINER, RLS 우회) 헬퍼를 사용하는
--   비재귀 정책으로 교체. 20260806000000_fix_superadmin_membership_policy.sql에서
--   organization_members/organizations에 이미 적용한 패턴과 동일.
--   참고: is_super_admin()은 20260323020000_security_hardening.sql에서 생성,
--         20260806000000_fix_superadmin_membership_policy.sql에서 search_path 명시로 재정의됨.

DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());