// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseFixture, asUser } from '../helpers/database-fixture';
import { cleanupOwnedSchema, getIsolatedDatabaseConfig } from '../helpers/isolated-db';

const config = getIsolatedDatabaseConfig(process.env);
describe.skipIf(!config)('격리 DB 계약 검증 (명시적 로컬 실행 설정 필요)', () => {
  let fixture: Awaited<ReturnType<typeof createDatabaseFixture>>;
  beforeAll(async () => { fixture = await createDatabaseFixture(config!); }, 60000);
  afterAll(async () => {
    if (!fixture) return;
    try { await cleanupOwnedSchema(fixture.db, fixture.runId); }
    finally { await fixture.db.end(); }
  });
  const table = (name: string) => `"${fixture.schema}".${name}`;
  const owner = (sql: string, values: unknown[] = []) => asUser(fixture.db, fixture.userA, sql, values);
  async function lead(org = fixture.orgA, user = fixture.userA) {
    const id = randomUUID();
    const result = await asUser(fixture.db, user, `insert into ${table('leads')} (id,organization_id,biz_name,road_address,category,station_distance) values ($1,$2,$3,$4,'FOOD',125) returning id`, [id, org, `Synthetic ${id}`, 'Synthetic test road']);
    expect(result.rows).toEqual([{ id }]);
    return id;
  }
  it('리드를 저장하고 ID·거리·상태를 재조회한다', async () => {
    const id = await lead();
    expect((await owner(`select id,organization_id,status,station_distance from ${table('leads')} where id=$1`, [id])).rows)
      .toEqual([{ id, organization_id: fixture.orgA, status: 'NEW', station_distance: 125 }]);
  });
  it('조직별 조회는 자기 자료만 반환한다', async () => {
    const a = await lead(), b = await lead(fixture.orgB, fixture.userB);
    expect((await owner(`select id from ${table('leads')} where id in ($1,$2)`, [a, b])).rows).toEqual([{ id: a }]);
    expect((await asUser(fixture.db, fixture.userB, `select id from ${table('leads')} where id in ($1,$2)`, [a, b])).rows).toEqual([{ id: b }]);
  });
  it('리드 상태 변경을 저장 후 재조회한다', async () => {
    const id = await lead();
    expect((await owner(`update ${table('leads')} set status='PROPOSAL_SENT' where id=$1 returning id`, [id])).rowCount).toBe(1);
    expect((await owner(`select status from ${table('leads')} where id=$1`, [id])).rows).toEqual([{ status: 'PROPOSAL_SENT' }]);
  });
  it('인벤토리를 생성하고 가격을 재조회한다', async () => {
    const id = randomUUID();
    await owner(`insert into ${table('ad_inventory')} (id,organization_id,station_name,location_code,ad_type,price_monthly) values ($1,$2,'Test station','L01','POSTER',2000000)`, [id, fixture.orgA]);
    expect((await owner(`select station_name,price_monthly,availability_status from ${table('ad_inventory')} where id=$1`, [id])).rows)
      .toEqual([{ station_name: 'Test station', price_monthly: '2000000', availability_status: 'AVAILABLE' }]);
  });
  it('인벤토리 규격 변경을 저장 후 재조회한다', async () => {
    const id = randomUUID();
    await owner(`insert into ${table('ad_inventory')} (id,organization_id,station_name) values ($1,$2,'Test station')`, [id, fixture.orgA]);
    expect((await owner(`update ${table('ad_inventory')} set ad_size='A1' where id=$1 returning ad_size`, [id])).rows).toEqual([{ ad_size: 'A1' }]);
    expect((await owner(`select ad_size from ${table('ad_inventory')} where id=$1`, [id])).rows).toEqual([{ ad_size: 'A1' }]);
  });
  it('유효한 리드의 통화 기록을 저장·재조회한다', async () => {
    const leadId = await lead(), id = randomUUID();
    await owner(`insert into ${table('call_logs')} (id,organization_id,lead_id,outcome,duration_seconds,notes) values ($1,$2,$3,'INTERESTED',300,'Synthetic call')`, [id, fixture.orgA, leadId]);
    expect((await owner(`select lead_id,outcome,duration_seconds from ${table('call_logs')} where id=$1`, [id])).rows).toEqual([{ lead_id: leadId, outcome: 'INTERESTED', duration_seconds: 300 }]);
  });
  it('실제 영업 단계와 복합 키로 진행상황을 갱신한다', async () => {
    const id = await lead();
    for (const notes of ['First', 'Updated']) await owner(`insert into ${table('sales_progress')} (lead_id,organization_id,step,notes,completed_at) values ($1,$2,'FIRST_CALL',$3,now()) on conflict (lead_id,step) do update set notes=excluded.notes`, [id, fixture.orgA, notes]);
    expect((await owner(`select step,notes from ${table('sales_progress')} where lead_id=$1`, [id])).rows).toEqual([{ step: 'FIRST_CALL', notes: 'Updated' }]);
  });
  it('제안서 계약 필드와 최종 금액을 저장·재조회한다', async () => {
    const leadId = await lead(), id = randomUUID();
    await owner(`insert into ${table('proposals')} (id,organization_id,lead_id,title,greeting_message,total_price,discount_rate,final_price) values ($1,$2,$3,'Synthetic proposal','Hello',1000,10,900)`, [id, fixture.orgA, leadId]);
    expect((await owner(`select greeting_message,final_price,status from ${table('proposals')} where id=$1`, [id])).rows).toEqual([{ greeting_message: 'Hello', final_price: '900', status: 'DRAFT' }]);
  });
  it('다른 조직·익명 접근·조직 이동·일반 회원 삭제를 차단한다', async () => {
    const a = await lead(), b = await lead(fixture.orgB, fixture.userB);
    expect((await owner(`select id from ${table('leads')} where id=$1`, [b])).rows).toEqual([]);
    expect((await asUser(fixture.db, null, `select id from ${table('leads')}`)).rows).toEqual([]);
    expect((await owner(`update ${table('leads')} set status='CONTACTED' where id=$1 returning id`, [b])).rowCount).toBe(0);
    expect((await owner(`delete from ${table('leads')} where id=$1 returning id`, [b])).rowCount).toBe(0);
    await expect(owner(`update ${table('leads')} set organization_id=$1 where id=$2`, [fixture.orgB, a])).rejects.toMatchObject({ code: '42501' });
    expect((await asUser(fixture.db, fixture.memberA, `delete from ${table('leads')} where id=$1 returning id`, [a])).rowCount).toBe(0);
    expect((await asUser(fixture.db, fixture.userB, `select id,status from ${table('leads')} where id=$1`, [b])).rows).toEqual([{ id: b, status: 'NEW' }]);
    expect((await owner(`select organization_id from ${table('leads')} where id=$1`, [a])).rows).toEqual([{ organization_id: fixture.orgA }]);
    expect((await owner(`delete from ${table('leads')} where id=$1 returning id`, [a])).rowCount).toBe(1);
  });
  it('필수 필드 누락을 정확한 NOT NULL 오류로 거부한다', async () => {
    await expect(owner(`insert into ${table('leads')} (id,organization_id) values ($1,$2)`, [randomUUID(), fixture.orgA])).rejects.toMatchObject({ code: '23502' });
  });
  it('존재하지 않는 외래 키를 정확한 FK 오류로 거부한다', async () => {
    await expect(fixture.db.query(`insert into ${table('leads')} (id,organization_id,biz_name) values ($1,$2,'Synthetic FK')`, [randomUUID(), randomUUID()])).rejects.toMatchObject({ code: '23503' });
  });
});
