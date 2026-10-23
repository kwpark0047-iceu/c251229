BEGIN;

-- 정적 검토용: 실제 PostgreSQL 실행/교착/동시성 검증은 아직 수행하지 않았다.
-- RPC만 READ COMMITTED를 강제한다. 일반 멤버십 변경의 소유자 재조회는 기본
-- READ COMMITTED를 전제로 하며, 별도 고립 수준 및 직접 프로필 상태 변경 경쟁은
-- 격리 DB에서 추가 검증해야 한다. 교착(40P01)/직렬화 실패(40001)는 잡지 않고 롤백한다.
-- 기존 SECURITY DEFINER/owner-rights view 및 향후 테이블은 별도 보안 검토 대상이다.
-- DB/RLS가 권한의 기준이며 외부 Auth ban/unban 또는 JWT 폐기를 전제하지 않는다.
-- storage.objects RLS는 공개 버킷 URL/이미 발급한 signed URL/캐시를 회수하지 않는다.

ALTER TABLE public.profiles
  ADD COLUMN account_status text NOT NULL DEFAULT 'PENDING'
    CHECK (account_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by uuid,
  ADD COLUMN archived_reason text;
UPDATE public.profiles SET account_status = 'ACTIVE'
WHERE is_approved IS TRUE OR is_super_admin IS TRUE;
ALTER TABLE public.organization_members ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE FUNCTION public.can_access_app() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND account_status = 'ACTIVE') $$;

CREATE FUNCTION public.archive_identity_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND account_status IN ('ACTIVE', 'PENDING')) $$;

CREATE FUNCTION public.archive_live_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND account_status = 'ACTIVE' AND is_super_admin IS TRUE) $$;

CREATE FUNCTION public.can_access_organization(p_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
  AND p.account_status='ACTIVE' AND (p.is_super_admin IS TRUE OR EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.user_id=p.id
      AND m.organization_id=p_org_id AND m.is_active))) $$;

CREATE FUNCTION public.can_manage_organization(p_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
  AND p.account_status='ACTIVE' AND (p.is_super_admin IS TRUE OR EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.user_id=p.id
      AND m.organization_id=p_org_id AND m.is_active AND m.role IN ('owner','admin')))) $$;

CREATE FUNCTION public.archive_pending_self() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles
  WHERE id=auth.uid() AND account_status='PENDING') $$;

-- 저장소에서 확인한 기존 시그니처만 교체한다. inactive 역할은 승인 후에도 복구되지 않는다.
CREATE OR REPLACE FUNCTION public.get_user_organization_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT m.organization_id FROM public.organization_members m JOIN public.profiles p ON p.id=m.user_id
  WHERE m.user_id=auth.uid() AND m.is_active AND p.account_status='ACTIVE' $$;
CREATE OR REPLACE FUNCTION public.get_user_role(org_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT m.role FROM public.organization_members m JOIN public.profiles p ON p.id=m.user_id
  WHERE m.user_id=auth.uid() AND m.organization_id=org_id AND m.is_active
    AND p.account_status='ACTIVE' LIMIT 1 $$;

CREATE FUNCTION public.archive_guard_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE trusted boolean := current_user IN ('postgres', 'service_role', 'supabase_admin');
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT trusted THEN RAISE EXCEPTION 'Use soft archive' USING ERRCODE = '42501'; END IF;
    RETURN OLD;
  END IF;
  IF NOT trusted THEN
    -- 가입 auth 트리거의 trusted INSERT는 유지한다. 직접 INSERT는 자기 PENDING만 허용한다.
    IF TG_OP <> 'INSERT' AND NOT public.archive_identity_allowed() THEN
      RAISE EXCEPTION 'Inactive profile cannot write' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL
        OR NEW.is_approved IS TRUE OR NEW.is_super_admin IS TRUE OR NEW.account_status <> 'PENDING'
        OR NEW.tier IS DISTINCT FROM 'FREE'
        OR NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL OR NEW.archived_reason IS NOT NULL THEN
        RAISE EXCEPTION 'Protected profile fields' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.id IS DISTINCT FROM OLD.id OR
        (ROW(NEW.account_status, NEW.is_approved, NEW.is_super_admin, NEW.tier, NEW.archived_at, NEW.archived_by, NEW.archived_reason)
        IS DISTINCT FROM ROW(OLD.account_status, OLD.is_approved, OLD.is_super_admin, OLD.tier, OLD.archived_at, OLD.archived_by, OLD.archived_reason)
        AND (NEW.id = auth.uid() OR NOT public.archive_live_admin())) THEN
        RAISE EXCEPTION 'Protected profile fields' USING ERRCODE = '42501';
      END IF;
      IF NEW.account_status = 'ARCHIVED' OR OLD.account_status = 'ARCHIVED'
        OR ROW(NEW.archived_at, NEW.archived_by, NEW.archived_reason)
          IS DISTINCT FROM ROW(OLD.archived_at, OLD.archived_by, OLD.archived_reason) THEN
        RAISE EXCEPTION 'Archive transitions require RPC' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_approved IS TRUE OR NEW.is_super_admin IS TRUE THEN NEW.account_status := 'ACTIVE'; END IF;
  ELSE
    IF OLD.account_status = 'ARCHIVED' AND NEW.is_approved IS TRUE THEN
      RAISE EXCEPTION 'Archived approval forbidden' USING ERRCODE = '23514';
    END IF;
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      IF NEW.is_approved IS TRUE THEN NEW.account_status := 'ACTIVE';
      ELSIF OLD.account_status = 'ACTIVE' AND NEW.account_status <> 'ARCHIVED' THEN NEW.account_status := 'SUSPENDED';
      END IF;
    END IF;
  END IF;
  NEW.is_approved := NEW.account_status = 'ACTIVE';
  RETURN NEW;
END $$;
CREATE TRIGGER archive_guard_profile BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.archive_guard_profile();

CREATE FUNCTION public.archive_guard_membership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target uuid; old_user uuid; new_user uuid; old_org uuid; new_org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target := OLD.user_id; ELSE target := NEW.user_id; END IF;
  IF current_setting('role')='authenticated' AND NOT public.archive_identity_allowed() THEN
    RAISE EXCEPTION 'Inactive actor cannot change memberships' USING ERRCODE = '42501';
  END IF;
  -- 기존 definer 가입/초대 함수가 RLS를 우회해도 inactive 역할로 조직을 관리할 수 없다.
  IF current_setting('role')='authenticated' THEN
    IF TG_OP <> 'INSERT' AND NOT public.can_manage_organization(OLD.organization_id) THEN
      RAISE EXCEPTION 'Active organization manager required' USING ERRCODE = '42501';
    END IF;
    IF TG_OP <> 'DELETE' AND NOT public.can_manage_organization(NEW.organization_id)
      AND NOT (TG_OP='INSERT' AND NEW.user_id=auth.uid() AND NEW.role='member'
        AND NEW.is_active AND public.archive_pending_self()) THEN
      RAISE EXCEPTION 'Active organization manager required' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.user_id,NEW.organization_id,NEW.role,NEW.is_active)
    IS NOT DISTINCT FROM ROW(OLD.user_id,OLD.organization_id,OLD.role,OLD.is_active) THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN old_user := OLD.user_id; old_org := OLD.organization_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_user := NEW.user_id; new_org := NEW.organization_id; END IF;
  -- 대상 프로필 잠금으로 archive 중 새 멤버십이 끼어드는 것을 방지한다.
  PERFORM p.id FROM public.profiles p WHERE p.id IN (old_user,new_user)
    ORDER BY p.id FOR KEY SHARE OF p;
  -- 조직 이동도 이전/새 조직을 정렬해서 잠근 뒤 최종 소유자를 재검사한다.
  PERFORM o.id FROM public.organizations o WHERE o.id IN (old_org,new_org)
    ORDER BY o.id FOR UPDATE OF o;
  IF TG_OP = 'INSERT' AND NEW.is_active AND current_setting('role')='authenticated'
    AND NOT public.archive_live_admin() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id=target AND account_status='ACTIVE') THEN
    RAISE EXCEPTION 'Active membership creation requires administrator' USING ERRCODE = '42501';
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.is_active AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = target AND account_status IN ('ARCHIVED','SUSPENDED')) THEN
    RAISE EXCEPTION 'Inactive target membership' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active
    AND (auth.uid() = target OR NOT public.archive_live_admin())
    AND current_setting('role') NOT IN ('none','service_role') THEN
    RAISE EXCEPTION 'Membership reactivation requires live administrator' USING ERRCODE = '42501';
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.role = 'owner' AND OLD.is_active AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = OLD.user_id AND account_status = 'ACTIVE') THEN
      IF TG_OP = 'DELETE' OR ROW(NEW.role,NEW.is_active,NEW.organization_id,NEW.user_id)
        IS DISTINCT FROM ROW(OLD.role,OLD.is_active,OLD.organization_id,OLD.user_id) THEN
        IF NOT EXISTS (SELECT 1 FROM public.organization_members m JOIN public.profiles p ON p.id=m.user_id
          WHERE m.organization_id=OLD.organization_id AND m.user_id<>OLD.user_id
          AND m.role='owner' AND m.is_active AND p.account_status='ACTIVE') THEN
          RAISE EXCEPTION 'Final active owner' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER archive_guard_membership BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.archive_guard_membership();

CREATE FUNCTION public.archive_guard_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignee_status text;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    -- KEY SHARE는 서로 다른/동일 담당자의 일반 배정을 직렬화하지 않는다.
    -- RPC의 명시적 FOR UPDATE와는 충돌하므로 먼저 끝난 작업을 후속 작업이 확인한다.
    SELECT account_status INTO assignee_status FROM public.profiles
      WHERE id=NEW.assigned_to FOR KEY SHARE;
    IF NOT FOUND OR assignee_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Active assignee required' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER archive_guard_assignment BEFORE INSERT OR UPDATE OF assigned_to ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.archive_guard_assignment();

CREATE FUNCTION public.transition_member_archive(p_user_id uuid, p_archive boolean, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.profiles%ROWTYPE; actor_email text;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Archive RPC requires READ COMMITTED' USING ERRCODE = '40001';
  END IF;
  IF auth.uid() IS NULL OR current_setting('role') <> 'authenticated' THEN
    RAISE EXCEPTION 'Authenticated session required' USING ERRCODE = '42501';
  END IF;
  SELECT email INTO actor_email FROM public.profiles
    WHERE id=auth.uid() AND account_status='ACTIVE' AND is_super_admin IS TRUE FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Live superadmin required' USING ERRCODE = '42501'; END IF;
  IF p_archive IS NULL THEN RAISE EXCEPTION 'Archive flag required' USING ERRCODE = '23514'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002'; END IF;
  IF p_user_id=auth.uid() OR target.is_super_admin IS TRUE THEN
    RAISE EXCEPTION 'Protected target' USING ERRCODE = '42501';
  END IF;
  IF (p_archive AND target.account_status='ARCHIVED') OR
    (NOT p_archive AND target.account_status='SUSPENDED' AND target.archived_at IS NOT NULL) THEN
    RETURN json_build_object('archived',p_archive,'already',true,'user_id',p_user_id);
  END IF;
  IF NOT p_archive AND target.account_status<>'ARCHIVED' THEN
    RAISE EXCEPTION 'Only archived members can restore' USING ERRCODE = '23514';
  END IF;
  -- 대상 FOR UPDATE 이후 조직 목록은 새 멤버십 INSERT/이동과 경쟁하지 않는다.
  -- 소유자 판정은 조직 잠금 획득 후 별도 쿼리로 수행한다 (READ COMMITTED).
  PERFORM o.id FROM public.organizations o WHERE o.id IN (
    SELECT m.organization_id FROM public.organization_members m WHERE m.user_id=p_user_id)
    ORDER BY o.id FOR UPDATE OF o;
  IF p_archive THEN
    IF EXISTS (SELECT 1 FROM public.leads WHERE assigned_to=p_user_id) THEN
      RAISE EXCEPTION 'Assigned leads must be reassigned' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.user_id=p_user_id AND m.role='owner' AND m.is_active
      AND target.account_status='ACTIVE' AND NOT EXISTS (
        SELECT 1 FROM public.organization_members other JOIN public.profiles p ON p.id=other.user_id
        WHERE other.organization_id=m.organization_id AND other.user_id<>p_user_id
        AND other.role='owner' AND other.is_active AND p.account_status='ACTIVE')) THEN
      RAISE EXCEPTION 'Final active owner' USING ERRCODE = '23514';
    END IF;
    UPDATE public.profiles SET account_status='ARCHIVED', is_approved=false,
      archived_at=now(),archived_by=auth.uid(),archived_reason=p_reason WHERE id=p_user_id;
  ELSE
    UPDATE public.profiles SET account_status = 'SUSPENDED',is_approved=false WHERE id=p_user_id;
  END IF;
  UPDATE public.organization_members SET is_active = false WHERE user_id=p_user_id;
  INSERT INTO public.activity_logs(user_id,user_email,action_type,entity_id,details)
  VALUES(auth.uid(),actor_email,CASE WHEN p_archive THEN 'MEMBER_ARCHIVED' ELSE 'MEMBER_RESTORED' END,
    p_user_id,jsonb_build_object('reason',p_reason,'previous_status',target.account_status,
      'account_status',CASE WHEN p_archive THEN 'ARCHIVED' ELSE 'SUSPENDED' END));
  RETURN json_build_object('archived',p_archive,'already',false,'user_id',p_user_id);
END $$;

-- PENDING 가입의 조직 생성/초대 처리는 기존 정책에 맡긴다. 업무/스토리지는 ACTIVE만 허용한다.
-- 현재 public 일반/파티션 테이블 전체에 적용한다. 이후 추가 테이블도 같은 가드가 필요하다.
DO $$ DECLARE t record; guard text; command text;
BEGIN
  FOR t IN SELECT n.nspname,c.relname FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname='public' AND c.relkind IN ('r','p'))
      OR (n.nspname='storage' AND c.relname='objects' AND c.relkind='r') LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',t.nspname,t.relname);
    IF t.nspname='public' AND t.relname IN ('organizations','organization_members') THEN
      IF t.relname='organization_members' THEN
        EXECUTE 'CREATE POLICY archive_identity_read ON public.organization_members AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.can_access_organization(organization_id))';
        EXECUTE 'CREATE POLICY archive_identity_insert ON public.organization_members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_manage_organization(organization_id) OR (user_id=auth.uid() AND role=''member'' AND is_active AND public.archive_pending_self()))';
        EXECUTE 'CREATE POLICY archive_identity_update ON public.organization_members AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_manage_organization(organization_id)) WITH CHECK (public.can_manage_organization(organization_id))';
        EXECUTE 'CREATE POLICY archive_identity_delete ON public.organization_members AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_manage_organization(organization_id))';
      ELSE
        EXECUTE 'CREATE POLICY archive_identity_read ON public.organizations AS RESTRICTIVE FOR SELECT TO authenticated USING (public.can_access_organization(id) OR public.archive_pending_self())';
        EXECUTE 'CREATE POLICY archive_identity_insert ON public.organizations AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.archive_live_admin() OR public.archive_pending_self())';
        EXECUTE 'CREATE POLICY archive_identity_update ON public.organizations AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_manage_organization(id)) WITH CHECK (public.can_manage_organization(id))';
        EXECUTE 'CREATE POLICY archive_identity_delete ON public.organizations AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_manage_organization(id))';
      END IF;
    ELSIF t.nspname='public' AND t.relname='profiles' THEN
      EXECUTE 'CREATE POLICY archive_profile_read ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (id=auth.uid() OR public.archive_live_admin() OR (account_status<>''ARCHIVED'' AND public.archive_identity_allowed()))';
      FOREACH command IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
        IF command='INSERT' THEN guard := 'WITH CHECK (public.archive_identity_allowed() OR (id=auth.uid() AND account_status=''PENDING'' AND is_approved IS NOT TRUE AND is_super_admin IS NOT TRUE AND archived_at IS NULL AND archived_by IS NULL AND archived_reason IS NULL))';
        ELSIF command='DELETE' THEN guard := 'USING (public.archive_identity_allowed())';
        ELSE guard := 'USING (public.archive_identity_allowed()) WITH CHECK (public.archive_identity_allowed())'; END IF;
        EXECUTE format('CREATE POLICY %I ON public.profiles AS RESTRICTIVE FOR %s TO authenticated %s','archive_profile_'||lower(command),command,guard);
      END LOOP;
    ELSE
      guard := CASE WHEN t.nspname='public' AND t.relname IN ('organizations','organization_members')
        THEN 'public.archive_identity_allowed()' ELSE 'public.can_access_app()' END;
      EXECUTE format('CREATE POLICY archive_live_access ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',t.nspname,t.relname,guard,guard);
      IF t.nspname='public' AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=t.nspname AND c.relname=t.relname AND a.attname='organization_id'
          AND a.attnum>0 AND NOT a.attisdropped) THEN
        EXECUTE format('CREATE POLICY archive_active_organization ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.can_access_organization(organization_id)) WITH CHECK (public.can_access_organization(organization_id))',t.nspname,t.relname);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 조직 없는 archive 감사 행은 기존 조직 기반 permissive SELECT로는 보이지 않는다.
-- 전역 ACTIVE 관리자에게 해당 두 이벤트의 읽기만 추가하며 쓰기 권한은 추가하지 않는다.
CREATE POLICY archive_admin_audit_read ON public.activity_logs FOR SELECT TO authenticated
USING (public.archive_live_admin() AND organization_id IS NULL
  AND action_type IN ('MEMBER_ARCHIVED','MEMBER_RESTORED'));

REVOKE ALL ON FUNCTION public.transition_member_archive(uuid,boolean,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.transition_member_archive(uuid,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.can_access_app(), public.archive_identity_allowed(), public.archive_live_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_app(), public.archive_identity_allowed(), public.archive_live_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_access_organization(uuid), public.can_manage_organization(uuid),
  public.archive_pending_self(), public.get_user_organization_ids(), public.get_user_role(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_organization(uuid), public.can_manage_organization(uuid),
  public.archive_pending_self(), public.get_user_organization_ids(), public.get_user_role(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.archive_guard_profile(),
  public.archive_guard_membership(), public.archive_guard_assignment() FROM PUBLIC, anon, authenticated;
COMMIT;
