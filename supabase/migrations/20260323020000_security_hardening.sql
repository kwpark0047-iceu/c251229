-- 20260323_security_hardening.sql
-- 보안 린터 결과 기반 RLS 활성화 및 권한 정책 수립

-- 1. 모든 대상 테이블 RLS 활성화
DO $$
DECLARE
    t TEXT;
    tables_to_harden TEXT[] := ARRAY[
        'store_receipt_settings', 'tables', 'store_point_settings', 'shared_cart_items', 
        'waiting_list', 'reviews', 'review_likes', 'users', 'coupons', 'staff', 
        'store_customers', 'payments', 'ledger', 'orders', 'store_accounts', 
        'comments', 'order_items', 'settlements', 'products', 'staff_account_requests', 
        'point_transactions', 'posts', 'user_coupons', 'campaign_settings', 
        'reservations', 'option_templates', 'store_tier_settings', 'plan_requests', 
        'metrics', 'categories', 'user_points', 'store_staff', 'stores', 
        'chat_rooms', 'chat_messages', 'profiles', 'organizations'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_harden LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 2. 헬퍼 함수: 현재 사용자의 슈퍼 어드민 여부 확인
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 헬퍼 함수: 사용자가 해당 조직에 속해 있는지 확인
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 주요 테이블별 정책 수립

-- [profiles]
DROP POLICY IF EXISTS "Profiles are viewable by owner or super admin" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner or super admin" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "Profiles are editable by owner" ON public.profiles;
CREATE POLICY "Profiles are editable by owner" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- [organizations]
DROP POLICY IF EXISTS "Organizations are viewable by its members or super admin" ON public.organizations;
CREATE POLICY "Organizations are viewable by its members or super admin" ON public.organizations
FOR SELECT USING (public.is_org_member(id) OR public.is_super_admin());

-- [orders]
DROP POLICY IF EXISTS "Orders are viewable by org members or super admin" ON public.orders;
CREATE POLICY "Orders are viewable by org members or super admin" ON public.orders
FOR ALL USING (public.is_org_member(organization_id) OR public.is_super_admin());

-- [payments] (민감 정보 보호)
DROP POLICY IF EXISTS "Payments are protected by org access" ON public.payments;
CREATE POLICY "Payments are protected by org access" ON public.payments
FOR ALL USING (public.is_org_member(organization_id) OR public.is_super_admin());

-- [products]
DROP POLICY IF EXISTS "Products are viewable by anyone in org" ON public.products;
CREATE POLICY "Products are viewable by anyone in org" ON public.products
FOR ALL USING (public.is_org_member(organization_id) OR public.is_super_admin());

-- 5. 기타 비즈니스 테이블들에 대한 공통 조직 기반 정책 (자동화 시도)
DO $$
DECLARE
    t TEXT;
    tables_with_org TEXT[] := ARRAY[
        'store_receipt_settings', 'store_point_settings', 'shared_cart_items', 
        'waiting_list', 'coupons', 'staff', 'store_customers', 'ledger', 
        'store_accounts', 'order_items', 'settlements', 'campaign_settings', 
        'reservations', 'store_tier_settings', 'plan_requests', 'store_staff', 'stores'
    ];
BEGIN
    FOREACH t IN ARRAY tables_with_org LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Org members can access %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Org members can access %I" ON public.%I FOR ALL USING (public.is_org_member(organization_id) OR public.is_super_admin());', t, t);
    END LOOP;
END $$;

-- 6. 사용자(users) 테이블 보호 (profiles와 별개인 경우)
DROP POLICY IF EXISTS "Users table protection" ON public.users;
CREATE POLICY "Users table protection" ON public.users
FOR SELECT USING (public.is_super_admin() OR auth.uid()::text = id::text); -- ID 매칭 시만 허용
