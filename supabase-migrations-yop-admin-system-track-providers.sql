-- Toggles: provedor em uso / ignorar avisos
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

alter table public.yop_admin_system_integrations
  add column if not exists track_cloudflare boolean not null default false;

alter table public.yop_admin_system_integrations
  add column if not exists track_supabase boolean not null default true;

alter table public.yop_admin_system_integrations
  add column if not exists track_resend boolean not null default false;

-- Ativa tracking onde já há credenciais detectadas
update public.yop_admin_system_integrations
set track_cloudflare = true
where has_cloudflare = true;

update public.yop_admin_system_integrations
set track_resend = true
where has_resend = true;
