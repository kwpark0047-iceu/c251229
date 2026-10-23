// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser } from '../helpers/database-fixture';
import { cleanupOwnedSchema, connectIsolatedDatabase, getIsolatedDatabaseConfig, schemaIdentifier, type DatabaseClient } from '../helpers/isolated-db';

const config = getIsolatedDatabaseConfig(process.env);
describe.skipIf(!config)('member archive: opt-in isolated DB only', () => {
  const runId = randomUUID(), schema = schemaIdentifier(runId);
  const admin = randomUUID(), target = randomUUID(), pending = randomUUID(), org = randomUUID();
  let db: DatabaseClient;
  let ready = false;
  const table = (name: string) => `${schema}.${name}`;
  const user = (id: string | null, sql: string, values: unknown[] = []) => asUser(db, id, sql, values);
  const rpc = (archive: boolean, id = target, actor: string | null = admin) => user(actor,
    `select ${schema}.transition_member_archive($1,$2,'synthetic reason') as result`, [id, archive]);
  beforeAll(async () => {
    db = await connectIsolatedDatabase(config!);
    await db.query('begin');
    try {
      await db.query(`create schema ${schema}; create table ${schema}.__test_run(run_id uuid primary key)`);
      await db.query(`insert into ${schema}.__test_run values ($1)`, [runId]);
      const fixture = readFileSync(new URL('../fixtures/member-archive.sql', import.meta.url), 'utf8');
      await db.query(fixture.replaceAll('__TEST_SCHEMA__', schema));
      await db.query(`insert into ${table('profiles')}(id,email,is_approved,is_super_admin) values ($1,'admin',true,true),($2,'target',true,false),($3,'pending',false,false)`, [admin,target,pending]);
      // 실제 새 마이그레이션 본문을 실행별 스키마로만 재배치한다.
      const migration = readFileSync(new URL('../../supabase/migrations/20261022030000_member_soft_archive.sql', import.meta.url), 'utf8')
        .replace(/^BEGIN;|COMMIT;\s*$/gm, '')
        .replaceAll('public.', `${schema}.`).replaceAll("'public'", `'${schema}'`)
        .replaceAll("n.nspname='storage'", `n.nspname='${schema}'`);
      await db.query(migration);
      await db.query(`insert into ${table('organizations')} values ($1)`, [org]);
      await db.query(`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'member')`, [org,target]);
      for (const name of ['leads','proposals','tasks']) await db.query(`insert into ${table(name)}(id,organization_id) values ($1,$2)`, [randomUUID(),org]);
      await db.query(`insert into ${table('objects')}(id) values ($1)`,[randomUUID()]);
      await db.query('commit'); ready = true;
    } catch (error) { await db.query('rollback'); await db.end(); throw error; }
  }, 60000);
  afterAll(async () => {
    if (!ready) return;
    try { await cleanupOwnedSchema(db,runId); } finally { await db.end(); }
  });
  it('backfills without changing legacy approval and denies pending business/storage', async () => {
    expect((await db.query(`select account_status from ${table('profiles')} where id=$1`,[pending])).rows).toEqual([{account_status:'PENDING'}]);
    for (const name of ['leads','proposals','tasks','objects']) {
      expect((await user(pending,`select * from ${table(name)}`)).rowCount).toBe(0);
      await expect(user(pending,`insert into ${table(name)}(id) values ($1)`,[randomUUID()])).rejects.toMatchObject({code:'42501'});
    }
    expect((await user(pending,`select * from ${table('profiles')} where id=$1`,[pending])).rowCount).toBe(1);
  });
  it('allows own initial PENDING insert and trusted signup inserts without allowing elevation', async () => {
    const initial=randomUUID(), elevated=randomUUID(), trusted=randomUUID();
    await user(initial,`insert into ${table('profiles')}(id,email) values ($1,'initial-pending')`,[initial]);
    expect((await user(initial,`select account_status from ${table('profiles')} where id=$1`,[initial])).rows).toEqual([{account_status:'PENDING'}]);
    await user(initial,`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'member')`,[org,initial]);
    await expect(user(initial,`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'owner')`,[org,initial])).rejects.toMatchObject({code:'42501'});
    expect((await user(initial,`select * from ${schema}.get_user_organization_ids()`)).rowCount).toBe(0);
    await expect(user(elevated,`insert into ${table('profiles')}(id,email,is_approved) values ($1,'elevated',true)`,[elevated])).rejects.toMatchObject({code:'42501'});
    await expect(user(initial,`insert into ${table('profiles')}(id,email) values ($1,'other-profile')`,[randomUUID()])).rejects.toMatchObject({code:'42501'});
    // auth trigger owner 경로와 동일한 trusted DB role. auth.users에는 쓰지 않는다.
    await db.query(`insert into ${table('profiles')}(id,email,is_approved) values ($1,'trusted-signup',true)`,[trusted]);
    expect((await db.query(`select account_status from ${table('profiles')} where id=$1`,[trusted])).rows).toEqual([{account_status:'ACTIVE'}]);
  });
  it('rejects anonymous, ordinary, self, superadmin and missing target', async () => {
    await expect(rpc(true,target,null)).rejects.toMatchObject({code:'42501'});
    await expect(rpc(true,target,pending)).rejects.toMatchObject({code:'42501'});
    await expect(rpc(true,admin)).rejects.toMatchObject({code:'42501'});
    await expect(rpc(true,randomUUID())).rejects.toMatchObject({code:'P0002'});
  });
  it('protects self privilege fields and final active organization owner', async () => {
    for (const clause of ["account_status='ACTIVE'",'is_approved=true','is_super_admin=true',"tier='SALES'", "archived_reason='fake'",'archived_at=now()',`archived_by='${admin}'`]) {
      await expect(user(pending,`update ${table('profiles')} set ${clause} where id=$1`,[pending])).rejects.toMatchObject({code:'42501'});
    }
    for (const clause of ['is_super_admin=true',"tier='MEDIA'","account_status='ARCHIVED'",'is_approved=false']) {
      await expect(user(target,`update ${table('profiles')} set ${clause} where id=$1`,[target])).rejects.toMatchObject({code:'42501'});
    }
    await user(target,`update ${table('profiles')} set full_name='Allowed ordinary edit' where id=$1`,[target]);
    await db.query(`update ${table('organization_members')} set role='owner' where user_id=$1`,[target]);
    await expect(rpc(true)).rejects.toMatchObject({code:'23514'});
    await db.query(`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'owner')`,[org,admin]);
  });
  it('blocks assigned leads and rolls back profile and memberships when audit fails', async () => {
    await db.query(`update ${table('leads')} set assigned_to=$1`,[target]);
    await expect(rpc(true)).rejects.toMatchObject({code:'23514'});
    await db.query(`update ${table('leads')} set assigned_to=null`);
    await db.query(`alter table ${table('activity_logs')} add constraint reject_archive_test check (action_type <> 'MEMBER_ARCHIVED')`);
    await expect(rpc(true)).rejects.toMatchObject({code:'23514'});
    expect((await db.query(`select account_status from ${table('profiles')} where id=$1`,[target])).rows).toEqual([{account_status:'ACTIVE'}]);
    expect((await db.query(`select is_active from ${table('organization_members')} where user_id=$1`,[target])).rows).toEqual([{is_active:true}]);
    await db.query(`alter table ${table('activity_logs')} drop constraint reject_archive_test`);
  });
  it('locks only referenced assignees; unrelated lead writes do not wait on archive profile locks', async () => {
    const second = await connectIsolatedDatabase(config!);
    await db.query('begin');
    try {
      await db.query(`select id from ${table('profiles')} where id=$1 for update`,[target]);
      await second.query("set lock_timeout='250ms'");
      expect((await asUser(second,admin,`update ${table('leads')} set id=id`)).rowCount).toBe(1);
      await expect(asUser(second,admin,`update ${table('leads')} set assigned_to=$1`,[target])).rejects.toMatchObject({code:'55P03'});
    } finally {
      await db.query('rollback');
      await second.end();
    }
    await user(admin,`update ${table('leads')} set assigned_to=$1`,[target]);
    await expect(rpc(true)).rejects.toMatchObject({code:'23514'});
    await user(admin,`update ${table('leads')} set assigned_to=null`);
  });
  it('archives idempotently, denies old JWT, restores only to suspended and audits once each', async () => {
    expect((await rpc(true)).rows[0].result).toEqual({archived:true,already:false,user_id:target});
    expect((await rpc(true)).rows[0].result).toEqual({archived:true,already:true,user_id:target});
    const viewer = randomUUID();
    await db.query(`insert into ${table('profiles')}(id,email,is_approved) values ($1,'ordinary-viewer',true)`,[viewer]);
    for (const actor of [viewer,pending]) {
      expect((await user(actor,`select id from ${table('profiles')} where id=$1`,[target])).rowCount).toBe(0);
    }
    expect((await user(admin,`select id from ${table('profiles')} where id=$1`,[target])).rowCount).toBe(1);
    for (const name of ['leads','proposals','tasks','objects']) expect((await user(target,`select * from ${table(name)}`)).rowCount).toBe(0);
    expect((await user(target,`select * from ${table('organization_members')} where user_id=$1`,[target])).rowCount).toBe(1);
    expect((await user(target,`select * from ${table('profiles')} where id=$1`,[target])).rowCount).toBe(1);
    expect((await user(target,`update ${table('profiles')} set full_name='blocked' where id=$1`,[target])).rowCount).toBe(0);
    await expect(user(admin,`update ${table('profiles')} set is_approved=true where id=$1`,[target])).rejects.toMatchObject({code:'42501'});
    expect((await rpc(false)).rows[0].result).toEqual({archived:false,already:false,user_id:target});
    expect((await rpc(false)).rows[0].result).toEqual({archived:false,already:true,user_id:target});
    expect((await db.query(`select account_status,is_approved from ${table('profiles')} where id=$1`,[target])).rows).toEqual([{account_status:'SUSPENDED',is_approved:false}]);
    expect((await db.query(`select is_active from ${table('organization_members')} where user_id=$1`,[target])).rows).toEqual([{is_active:false}]);
    expect((await db.query(`select action_type from ${table('activity_logs')} where entity_id=$1 order by action_type`,[target])).rows).toEqual([{action_type:'MEMBER_ARCHIVED'},{action_type:'MEMBER_RESTORED'}]);
    expect((await user(admin,`select action_type from ${table('activity_logs')} where entity_id=$1`,[target])).rowCount).toBe(2);
    expect((await user(viewer,`select action_type from ${table('activity_logs')} where entity_id=$1`,[target])).rowCount).toBe(0);
    expect((await user(target,`select * from ${table('objects')}`)).rowCount).toBe(0);
  });
  it('serializes concurrent archives of two owners so one owner survives', async () => {
    const second = await connectIsolatedDatabase(config!);
    const a=randomUUID(), b=randomUUID(), sharedOrg=randomUUID();
    try {
      await db.query(`insert into ${table('profiles')}(id,email,is_approved) values ($1,'race-a',true),($2,'race-b',true)`,[a,b]);
      await db.query(`insert into ${table('organizations')} values ($1)`,[sharedOrg]);
      await db.query(`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'owner'),($1,$3,'owner')`,[sharedOrg,a,b]);
      const results = await Promise.allSettled([
        rpc(true,a),
        asUser(second,admin,`select ${schema}.transition_member_archive($1,true)`,[b]),
      ]);
      expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      const failure=results.find(result=>result.status==='rejected');
      expect(failure?.status==='rejected' ? failure.reason : null).toMatchObject({code:'23514'});
      expect((await db.query(`select id from ${table('profiles')} where id in ($1,$2) and account_status='ACTIVE'`,[a,b])).rowCount).toBe(1);
    } finally { await second.end(); }
  });
  it('syncs legacy approval, requires live ACTIVE actor, preserves service-role RLS bypass', async () => {
    await user(admin,`update ${table('profiles')} set is_approved=true where id=$1`,[target]);
    expect((await db.query(`select account_status from ${table('profiles')} where id=$1`,[target])).rows).toEqual([{account_status:'ACTIVE'}]);
    for (const name of ['leads','proposals','tasks']) {
      expect((await user(target,`select * from ${table(name)}`)).rowCount).toBe(0);
      expect((await user(target,`update ${table(name)} set id=id`)).rowCount).toBe(0);
      await expect(user(target,`insert into ${table(name)}(id,organization_id) values ($1,$2)`,[randomUUID(),org])).rejects.toMatchObject({code:'42501'});
    }
    expect((await user(target,`select ${schema}.get_user_role($1) as role`,[org])).rows).toEqual([{role:null}]);
    expect((await user(target,`select * from ${schema}.get_user_organization_ids()`)).rowCount).toBe(0);
    expect((await user(target,`update ${table('organization_members')} set is_active=true where user_id=$1`,[target])).rowCount).toBe(0);
    expect((await user(target,`delete from ${table('organization_members')} where user_id=$1`,[target])).rowCount).toBe(0);
    await expect(user(target,`insert into ${table('organization_members')}(organization_id,user_id,role) values ($1,$2,'owner')`,[org,target])).rejects.toMatchObject({code:'42501'});
    expect((await user(target,`update ${table('organizations')} set id=id where id=$1`,[org])).rowCount).toBe(0);
    await user(admin,`update ${table('organization_members')} set is_active=true where user_id=$1`,[target]);
    expect((await user(target,`select * from ${table('leads')}`)).rowCount).toBe(1);
    expect((await user(target,`update ${table('leads')} set id=id`)).rowCount).toBe(1);
    await user(admin,`update ${table('profiles')} set is_approved=false where id=$1`,[target]);
    expect((await db.query(`select account_status from ${table('profiles')} where id=$1`,[target])).rows).toEqual([{account_status:'SUSPENDED'}]);
    await db.query(`update ${table('profiles')} set is_approved=false where id=$1`,[admin]);
    await expect(rpc(true)).rejects.toMatchObject({code:'42501'});
    await db.query('begin');
    try {
      await db.query('set local role service_role');
      expect((await db.query(`select * from ${table('objects')}`)).rowCount).toBe(1);
    } finally { await db.query('rollback'); }
  });
});
