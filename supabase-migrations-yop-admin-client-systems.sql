-- Vínculo cliente <-> sistemas (pagamentos ficam ligados via system_id)
create table if not exists public.yop_admin_client_systems (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.yop_admin_clients(id) on delete cascade,
  system_id uuid not null references public.yop_admin_systems(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, system_id)
);

create index if not exists yop_admin_client_systems_client_idx on public.yop_admin_client_systems (client_id);
create index if not exists yop_admin_client_systems_system_idx on public.yop_admin_client_systems (system_id);

alter table public.yop_admin_client_systems enable row level security;

drop policy if exists "yop_admin_client_systems_select" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_insert" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_update" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_delete" on public.yop_admin_client_systems;

create policy "yop_admin_client_systems_select" on public.yop_admin_client_systems for select to authenticated using (true);
create policy "yop_admin_client_systems_insert" on public.yop_admin_client_systems for insert to authenticated with check (true);
create policy "yop_admin_client_systems_update" on public.yop_admin_client_systems for update to authenticated using (true) with check (true);
create policy "yop_admin_client_systems_delete" on public.yop_admin_client_systems for delete to authenticated using (true);

alter table public.yop_admin_clients drop column if exists system_name;
alter table public.yop_admin_clients drop column if exists system_description;
