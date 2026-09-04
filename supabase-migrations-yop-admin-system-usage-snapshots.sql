-- Histórico diário de uso + limites mensais Resend
-- Rodar no SQL Editor do projeto YOP Devs:
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

alter table public.yop_admin_system_integrations
  add column if not exists resend_monthly_limit integer not null default 3000;

alter table public.yop_admin_system_integrations
  add column if not exists resend_sent_month integer not null default 0;

create table if not exists public.yop_admin_system_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.yop_admin_systems(id) on delete cascade,
  day date not null,
  cf_storage_used_bytes bigint,
  sb_storage_used_bytes bigint,
  sb_db_used_bytes bigint,
  resend_sent_today integer,
  created_at timestamptz not null default now(),
  unique (system_id, day)
);

create index if not exists yop_admin_system_usage_snapshots_system_day_idx
  on public.yop_admin_system_usage_snapshots (system_id, day desc);

alter table public.yop_admin_system_usage_snapshots enable row level security;

drop policy if exists "yop_admin_system_usage_snapshots_select" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_insert" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_update" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_delete" on public.yop_admin_system_usage_snapshots;

create policy "yop_admin_system_usage_snapshots_select"
  on public.yop_admin_system_usage_snapshots for select to authenticated using (true);
create policy "yop_admin_system_usage_snapshots_insert"
  on public.yop_admin_system_usage_snapshots for insert to authenticated with check (true);
create policy "yop_admin_system_usage_snapshots_update"
  on public.yop_admin_system_usage_snapshots for update to authenticated using (true) with check (true);
create policy "yop_admin_system_usage_snapshots_delete"
  on public.yop_admin_system_usage_snapshots for delete to authenticated using (true);
