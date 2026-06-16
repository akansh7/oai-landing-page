-- ============================================================
-- OAI Outreach — List download (.xlsx) setup
-- Already applied to project xbgnypymysxplpuesifo on 2026-06-16
-- (migration: add_list_download_tables). Kept here for reference /
-- re-creation. Safe to re-run (idempotent).
--
-- Creates the two data tables the download button pulls from, adds the
-- list_id link column to prospects, and mirrors the same RLS posture as
-- `prospects` (public read, anon write, service_role full access) so the
-- landing page reads and the cURL uploads both work with the anon key.
-- ============================================================

-- People rows (sheet "People" in the downloaded .xlsx)
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  list_id      text not null,
  created_at   timestamptz default now(),
  name         text,
  company_name text,
  job_title    text,
  linkedin     text
);

-- Company/job rows (sheet "Companies" in the downloaded .xlsx)
create table if not exists public.companies (
  id              uuid primary key default gen_random_uuid(),
  list_id         text not null,
  created_at      timestamptz default now(),
  company_name    text,
  job_title       text,
  job_type        text,
  job_description text,
  city            text,
  state           text,
  country         text,
  job_url         text,
  salary_info     text,
  skills          text
);

create index if not exists people_list_id_idx    on public.people (list_id);
create index if not exists companies_list_id_idx on public.companies (list_id);

-- Link a prospect (landing page) to its list
alter table public.prospects add column if not exists list_id text;

-- Privileges (match the existing prospects posture: anon key has full access)
grant select, insert, update, delete on public.people    to anon, authenticated;
grant select, insert, update, delete on public.companies to anon, authenticated;
grant all on public.people    to service_role;
grant all on public.companies to service_role;

-- RLS mirrored from prospects: public read, anon write, service_role full access
alter table public.people    enable row level security;
alter table public.companies enable row level security;

drop policy if exists public_read_by_id   on public.people;
drop policy if exists anon_insert          on public.people;
drop policy if exists anon_update          on public.people;
drop policy if exists anon_delete          on public.people;
drop policy if exists service_full_access  on public.people;
create policy public_read_by_id   on public.people for select to public using (true);
create policy anon_insert         on public.people for insert to anon with check (true);
create policy anon_update         on public.people for update to anon using (true) with check (true);
create policy anon_delete         on public.people for delete to anon using (true);
create policy service_full_access on public.people for all to public using (auth.role() = 'service_role');

drop policy if exists public_read_by_id   on public.companies;
drop policy if exists anon_insert          on public.companies;
drop policy if exists anon_update          on public.companies;
drop policy if exists anon_delete          on public.companies;
drop policy if exists service_full_access  on public.companies;
create policy public_read_by_id   on public.companies for select to public using (true);
create policy anon_insert         on public.companies for insert to anon with check (true);
create policy anon_update         on public.companies for update to anon using (true) with check (true);
create policy anon_delete         on public.companies for delete to anon using (true);
create policy service_full_access on public.companies for all to public using (auth.role() = 'service_role');
