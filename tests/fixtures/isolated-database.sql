-- 로컬 실행별 합성 계약입니다. 운영 스키마/정책의 복제본이 아닙니다.
create table __TEST_SCHEMA__.organizations (id uuid primary key, name text not null);
create table __TEST_SCHEMA__.organization_members (
  organization_id uuid references __TEST_SCHEMA__.organizations(id), user_id uuid not null,
  role text not null check (role in ('owner','admin','member')), primary key (organization_id,user_id)
);
alter table __TEST_SCHEMA__.organization_members enable row level security;
create policy own_membership on __TEST_SCHEMA__.organization_members for select to authenticated using (user_id = (select auth.uid()));
create function __TEST_SCHEMA__.organization_ids() returns setof uuid language sql stable security invoker
  as 'select organization_id from __TEST_SCHEMA__.organization_members where user_id = (select auth.uid())';
alter table __TEST_SCHEMA__.organizations enable row level security;
create policy organization_select on __TEST_SCHEMA__.organizations for select to authenticated
  using (id in (select __TEST_SCHEMA__.organization_ids()));

create table __TEST_SCHEMA__.leads (
  id uuid primary key, organization_id uuid not null references __TEST_SCHEMA__.organizations(id),
  biz_name text not null, road_address text, category text, nearest_station text, station_distance double precision,
  status text not null default 'NEW' check (status in ('NEW','PROPOSAL_SENT','CONTACTED','CONTRACTED')),
  unique(id,organization_id)
);
create table __TEST_SCHEMA__.ad_inventory (
  id uuid primary key, organization_id uuid not null references __TEST_SCHEMA__.organizations(id),
  station_name text not null, location_code text, ad_type text, ad_size text, price_monthly numeric,
  availability_status text not null default 'AVAILABLE'
);
create table __TEST_SCHEMA__.call_logs (
  id uuid primary key, organization_id uuid not null references __TEST_SCHEMA__.organizations(id),
  lead_id uuid not null, outcome text not null, duration_seconds integer, contact_person text, notes text,
  next_action text, next_contact_date date,
  foreign key(lead_id,organization_id) references __TEST_SCHEMA__.leads(id,organization_id)
);
create table __TEST_SCHEMA__.sales_progress (
  lead_id uuid not null, organization_id uuid not null references __TEST_SCHEMA__.organizations(id),
  step text not null check (step in ('PROPOSAL_SENT','FIRST_CALL','MEETING_SCHEDULED','CONTRACT_SIGNED')),
  completed_at timestamptz, notes text, primary key(lead_id,step),
  foreign key(lead_id,organization_id) references __TEST_SCHEMA__.leads(id,organization_id)
);
create table __TEST_SCHEMA__.proposals (
  id uuid primary key, organization_id uuid not null references __TEST_SCHEMA__.organizations(id),
  lead_id uuid not null, title text not null, greeting_message text, inventory_ids uuid[],
  total_price numeric, discount_rate numeric, final_price numeric,
  status text not null default 'DRAFT' check (status in ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED')),
  foreign key(lead_id,organization_id) references __TEST_SCHEMA__.leads(id,organization_id)
);
grant usage on schema __TEST_SCHEMA__ to authenticated, anon;
grant select on __TEST_SCHEMA__.organizations, __TEST_SCHEMA__.organization_members to authenticated, anon;
revoke all on function __TEST_SCHEMA__.organization_ids() from public;
grant execute on function __TEST_SCHEMA__.organization_ids() to authenticated;
