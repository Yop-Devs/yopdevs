-- Entradas e saídas manuais do Controle Financeiro
create table if not exists public.yop_admin_finance_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind = any (array['entrada'::text, 'saida'::text])),
  title text not null,
  amount numeric not null check (amount > 0),
  entry_date date not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_finance_entries_kind_idx on public.yop_admin_finance_entries (kind);
create index if not exists yop_admin_finance_entries_date_idx on public.yop_admin_finance_entries (entry_date desc);

alter table public.yop_admin_finance_entries enable row level security;

drop policy if exists "yop_admin_finance_entries_select" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_insert" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_update" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_delete" on public.yop_admin_finance_entries;

create policy "yop_admin_finance_entries_select" on public.yop_admin_finance_entries for select to authenticated using (true);
create policy "yop_admin_finance_entries_insert" on public.yop_admin_finance_entries for insert to authenticated with check (true);
create policy "yop_admin_finance_entries_update" on public.yop_admin_finance_entries for update to authenticated using (true) with check (true);
create policy "yop_admin_finance_entries_delete" on public.yop_admin_finance_entries for delete to authenticated using (true);
