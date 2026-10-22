import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { connectIsolatedDatabase, schemaIdentifier, type DatabaseClient, type IsolatedDatabaseConfig } from './isolated-db';

export async function createDatabaseFixture(config: IsolatedDatabaseConfig) {
  const runId = randomUUID(), schema = schemaIdentifier(runId);
  const orgA = randomUUID(), orgB = randomUUID(), userA = randomUUID(), userB = randomUUID(), memberA = randomUUID();
  const db = await connectIsolatedDatabase(config);
  try {
    await db.query('begin');
    await db.query(`create schema "${schema}"`);
    await db.query(`create table "${schema}".__test_run (run_id uuid primary key)`);
    await db.query(`insert into "${schema}".__test_run values ($1)`, [runId]);
    const ddl = readFileSync(new URL('../fixtures/isolated-database.sql', import.meta.url), 'utf8');
    await db.query(ddl.replaceAll('__TEST_SCHEMA__', `"${schema}"`));
    for (const table of ['leads', 'ad_inventory', 'call_logs', 'sales_progress', 'proposals']) {
      await db.query(`alter table "${schema}".${table} enable row level security`);
      await db.query(`grant select on "${schema}".${table} to anon`);
      await db.query(`grant select, insert, update, delete on "${schema}".${table} to authenticated`);
      const scope = `organization_id in (select "${schema}".organization_ids())`;
      await db.query(`create policy tenant_select on "${schema}".${table} for select to authenticated using (${scope})`);
      await db.query(`create policy tenant_insert on "${schema}".${table} for insert to authenticated with check (${scope})`);
      await db.query(`create policy tenant_update on "${schema}".${table} for update to authenticated using (${scope}) with check (${scope})`);
      await db.query(`create policy tenant_delete on "${schema}".${table} for delete to authenticated using (
        exists(select 1 from "${schema}".organization_members where organization_id = ${table}.organization_id and user_id = (select auth.uid()) and role in ('owner','admin')))`);
    }
    await db.query(`insert into "${schema}".organizations values ($1,'Synthetic A'),($2,'Synthetic B')`, [orgA, orgB]);
    await db.query(`insert into "${schema}".organization_members values ($1,$2,'owner'),($3,$4,'owner'),($1,$5,'member')`, [orgA, userA, orgB, userB, memberA]);
    await db.query('commit');
    return { db, runId, schema, orgA, orgB, userA, userB, memberA };
  } catch (error) {
    try { await db.query('rollback'); } finally { await db.end(); }
    throw error;
  }
}

export async function asUser(db: DatabaseClient, userId: string | null, sql: string, values: unknown[] = []) {
  await db.query('begin');
  try {
    await db.query(userId ? 'set local role authenticated' : 'set local role anon');
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' })]);
    const result = await db.query(sql, values);
    await db.query('commit');
    return result;
  } catch (error) { await db.query('rollback'); throw error; }
}
