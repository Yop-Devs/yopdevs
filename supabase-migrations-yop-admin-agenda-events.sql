-- Agenda pessoal admin (YOP Devs)
-- Rodar no SQL Editor: https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

create table if not exists public.yop_admin_agenda_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  -- null = dia inteiro (avisos: véspera + 08:00 no dia)
  event_time time without time zone,
  category text not null default 'geral'
    check (category in ('geral', 'pessoal', 'trabalho', 'reuniao', 'pagamento', 'lembrete', 'outro')),
  color text,
  notify_enabled boolean not null default true,
  notified_day_before_at timestamptz,
  notified_day_of_at timestamptz,
  notified_two_hours_before_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_agenda_events_date_idx
  on public.yop_admin_agenda_events (event_date);

create index if not exists yop_admin_agenda_events_notify_idx
  on public.yop_admin_agenda_events (event_date, notify_enabled)
  where notify_enabled = true;

alter table public.yop_admin_agenda_events enable row level security;

drop policy if exists "yop_admin_agenda_events_select" on public.yop_admin_agenda_events;
drop policy if exists "yop_admin_agenda_events_insert" on public.yop_admin_agenda_events;
drop policy if exists "yop_admin_agenda_events_update" on public.yop_admin_agenda_events;
drop policy if exists "yop_admin_agenda_events_delete" on public.yop_admin_agenda_events;

create policy "yop_admin_agenda_events_select"
  on public.yop_admin_agenda_events for select to authenticated
  using (public.is_yop_admin());

create policy "yop_admin_agenda_events_insert"
  on public.yop_admin_agenda_events for insert to authenticated
  with check (public.is_yop_admin());

create policy "yop_admin_agenda_events_update"
  on public.yop_admin_agenda_events for update to authenticated
  using (public.is_yop_admin()) with check (public.is_yop_admin());

create policy "yop_admin_agenda_events_delete"
  on public.yop_admin_agenda_events for delete to authenticated
  using (public.is_yop_admin());
