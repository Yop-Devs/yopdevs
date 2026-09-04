-- Integrações de infra por sistema (Cloudflare R2, Supabase, Resend)
-- Rodar no SQL Editor do projeto YOP Devs:
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

create table if not exists public.yop_admin_system_integrations (
  system_id uuid primary key references public.yop_admin_systems(id) on delete cascade,

  has_cloudflare boolean not null default false,
  has_supabase boolean not null default false,
  has_resend boolean not null default false,
  track_cloudflare boolean not null default false,
  track_supabase boolean not null default true,
  track_resend boolean not null default false,

  -- Cloudflare R2
  cf_account_id text,
  cf_api_token text,
  cf_r2_bucket text,
  cf_storage_limit_bytes bigint not null default 10737418240, -- 10 GB
  cf_storage_used_bytes bigint,
  cf_synced_at timestamptz,

  -- Supabase (projeto do cliente)
  sb_url text,
  sb_anon_key text,
  sb_service_role_key text,
  sb_project_ref text,
  sb_access_token text, -- Management API (opcional, para tamanho do DB)
  sb_db_limit_bytes bigint not null default 536870912, -- 512 MB
  sb_db_used_bytes bigint,
  sb_storage_limit_bytes bigint not null default 1073741824, -- 1 GB
  sb_storage_used_bytes bigint,
  sb_synced_at timestamptz,

  -- Resend
  resend_api_key text,
  resend_daily_limit integer not null default 100,
  resend_sent_today integer not null default 0,
  resend_day date,
  resend_monthly_limit integer not null default 3000,
  resend_sent_month integer not null default 0,
  resend_synced_at timestamptz,

  env_parsed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_system_integrations_has_cf_idx
  on public.yop_admin_system_integrations (has_cloudflare)
  where has_cloudflare = true;

create index if not exists yop_admin_system_integrations_has_sb_idx
  on public.yop_admin_system_integrations (has_supabase)
  where has_supabase = true;

create index if not exists yop_admin_system_integrations_has_resend_idx
  on public.yop_admin_system_integrations (has_resend)
  where has_resend = true;

alter table public.yop_admin_system_integrations enable row level security;

drop policy if exists "yop_admin_system_integrations_select" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_insert" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_update" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_delete" on public.yop_admin_system_integrations;

create policy "yop_admin_system_integrations_select"
  on public.yop_admin_system_integrations for select to authenticated using (true);
create policy "yop_admin_system_integrations_insert"
  on public.yop_admin_system_integrations for insert to authenticated with check (true);
create policy "yop_admin_system_integrations_update"
  on public.yop_admin_system_integrations for update to authenticated using (true) with check (true);
create policy "yop_admin_system_integrations_delete"
  on public.yop_admin_system_integrations for delete to authenticated using (true);
