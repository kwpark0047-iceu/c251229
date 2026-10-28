-- 최소 합성 스키마. auth.users/운영 public/storage 테이블은 사용하지 않는다.
CREATE TABLE __TEST_SCHEMA__.profiles (
  id uuid PRIMARY KEY, email text NOT NULL, full_name text,
  is_approved boolean DEFAULT false, is_super_admin boolean DEFAULT false,
  tier text DEFAULT 'FREE'
);
CREATE TABLE __TEST_SCHEMA__.organizations (id uuid PRIMARY KEY);
CREATE TABLE __TEST_SCHEMA__.organization_members (
  organization_id uuid REFERENCES __TEST_SCHEMA__.organizations(id),
  user_id uuid REFERENCES __TEST_SCHEMA__.profiles(id), role text NOT NULL,
  PRIMARY KEY(organization_id,user_id)
);
CREATE TABLE __TEST_SCHEMA__.leads (id uuid PRIMARY KEY, assigned_to uuid REFERENCES __TEST_SCHEMA__.profiles(id), organization_id uuid REFERENCES __TEST_SCHEMA__.organizations(id));
CREATE TABLE __TEST_SCHEMA__.proposals (id uuid PRIMARY KEY, organization_id uuid REFERENCES __TEST_SCHEMA__.organizations(id));
CREATE TABLE __TEST_SCHEMA__.tasks (id uuid PRIMARY KEY, organization_id uuid REFERENCES __TEST_SCHEMA__.organizations(id));
CREATE TABLE __TEST_SCHEMA__.objects (id uuid PRIMARY KEY, bucket_id text NOT NULL DEFAULT 'floor-plans');
CREATE TABLE __TEST_SCHEMA__.stores (id uuid PRIMARY KEY);
CREATE TABLE __TEST_SCHEMA__.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, user_email text,
  action_type text NOT NULL, entity_id uuid, details jsonb, organization_id uuid
);
GRANT USAGE ON SCHEMA __TEST_SCHEMA__ TO authenticated, anon, service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA __TEST_SCHEMA__ TO authenticated, service_role;
-- 의도적으로 넓은 기존 정책도 RESTRICTIVE 가드를 우회할 수 없어야 한다.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','organizations','organization_members','leads','proposals','tasks','objects','activity_logs'] LOOP
    EXECUTE format('ALTER TABLE __TEST_SCHEMA__.%I ENABLE ROW LEVEL SECURITY',t);
    IF t='activity_logs' THEN
      -- 조직 없는 감사 행은 새 SELECT 정책 없이는 보이지 않아야 한다.
      EXECUTE 'CREATE POLICY legacy_audit_select ON __TEST_SCHEMA__.activity_logs FOR SELECT TO authenticated USING (organization_id IS NOT NULL)';
      EXECUTE 'CREATE POLICY legacy_audit_insert ON __TEST_SCHEMA__.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid())';
    ELSE
      EXECUTE format('CREATE POLICY legacy_authenticated ON __TEST_SCHEMA__.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',t);
    END IF;
  END LOOP;
END $$;
