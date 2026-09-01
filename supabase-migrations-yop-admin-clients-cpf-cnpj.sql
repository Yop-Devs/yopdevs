-- Pessoa (CPF) e empresa (CNPJ) no mesmo cliente
alter table public.yop_admin_clients
  add column if not exists person_name text,
  add column if not exists cpf text,
  add column if not exists company_name text,
  add column if not exists cnpj text;

alter table public.yop_admin_clients alter column full_name drop not null;
alter table public.yop_admin_clients alter column document drop not null;

create index if not exists yop_admin_clients_cpf_idx on public.yop_admin_clients (cpf);
create index if not exists yop_admin_clients_cnpj_idx on public.yop_admin_clients (cnpj);
