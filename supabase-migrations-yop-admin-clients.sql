-- Clientes da área admin YOP Devs
create table if not exists public.yop_admin_clients (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  document text,
  cep text,
  street text,
  address_number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  email text,
  phone text,
  person_name text,
  cpf text,
  company_name text,
  cnpj text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_clients_full_name_idx on public.yop_admin_clients (full_name);
create index if not exists yop_admin_clients_document_idx on public.yop_admin_clients (document);

alter table public.yop_admin_clients enable row level security;

drop policy if exists "yop_admin_clients_select" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_insert" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_update" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_delete" on public.yop_admin_clients;

create policy "yop_admin_clients_select" on public.yop_admin_clients for select to authenticated using (true);
create policy "yop_admin_clients_insert" on public.yop_admin_clients for insert to authenticated with check (true);
create policy "yop_admin_clients_update" on public.yop_admin_clients for update to authenticated using (true) with check (true);
create policy "yop_admin_clients_delete" on public.yop_admin_clients for delete to authenticated using (true);
