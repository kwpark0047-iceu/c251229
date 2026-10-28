// @vitest-environment node
// Static checks are not PostgreSQL execution or concurrency verification.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = new URL('../../supabase/migrations/20261022030000_member_soft_archive.sql', import.meta.url);
describe('soft archive SQL policy contract (offline)', () => {
  it('uses explicit application tables and scopes storage to application buckets', () => {
    const sql = readFileSync(migration, 'utf8');
    expect(sql).toContain("c.relname IN (");
    expect(sql).toContain("'leads', 'proposals', 'proposal_logs'");
    expect(sql).toContain("bucket_id NOT IN (''floor-plans'',''proposals'')");
    expect(sql).not.toMatch(/'stores'|'store_staff'|'Subscription'/);
  });
  it('has live restrictive guards, authenticated-only RPC and atomic audit', () => {
    const sql = readFileSync(migration, 'utf8');
    for (const token of ['AS RESTRICTIVE', 'public.can_access_app()', 'SECURITY DEFINER',
      "SET search_path = ''", 'FROM PUBLIC, anon, service_role', 'TO authenticated',
      'INSERT INTO public.activity_logs', "ERRCODE = '42501'", "ERRCODE = '23514'",
      "ERRCODE = 'P0002'", 'FOR KEY SHARE', 'FOR UPDATE', "account_status = 'SUSPENDED'",
      'is_active = false', 'NEW.tier', 'OLD.tier', "'storage'", "'objects'"]) expect(sql).toContain(token);
    expect(sql).not.toMatch(/DELETE FROM auth\.|UPDATE auth\.|EXCEPTION WHEN/i);
  });
  it('uses scoped locks rather than serializing all ordinary writes', () => {
    const sql = readFileSync(migration, 'utf8');
    expect(sql).not.toMatch(/pg_advisory|archive_serialize|FOR EACH STATEMENT/);
    const ordinary = sql.slice(0, sql.indexOf('CREATE FUNCTION public.transition_member_archive'));
    expect(ordinary).not.toContain('transaction_isolation');
    expect(sql).toContain('ORDER BY o.id FOR UPDATE OF o');
    expect(sql).toContain("NEW.id = auth.uid()");
    expect(sql).toContain("id=auth.uid() AND account_status=''PENDING''");
  });
  it('requires live organization membership as well as ACTIVE account status', () => {
    const sql = readFileSync(migration, 'utf8');
    expect(sql).toContain('CREATE FUNCTION public.can_access_organization(p_org_id uuid)');
    expect(sql).toContain('m.is_active');
    expect(sql).toContain('archive_active_organization');
    expect(sql).toContain('public.can_access_organization(organization_id)');
  });
  it('hides archived profiles from ordinary actors and permits only narrow admin audit reads', () => {
    const sql = readFileSync(migration, 'utf8');
    expect(sql).toContain("id=auth.uid() OR public.archive_live_admin() OR (account_status<>''ARCHIVED'' AND public.archive_identity_allowed())");
    expect(sql).toContain('CREATE POLICY archive_admin_audit_read ON public.activity_logs FOR SELECT TO authenticated');
    expect(sql).toContain("action_type IN ('MEMBER_ARCHIVED','MEMBER_RESTORED')");
  });
});
