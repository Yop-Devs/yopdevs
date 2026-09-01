-- Rodar no SQL Editor do projeto CORRETO da YOP Devs:
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql
-- (o app usa NEXT_PUBLIC_SUPABASE_URL=https://rfkfzkbmqtvpbjnbvnjz.supabase.co)

create table if not exists public.yop_admin_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text not null,
  link text,
  logo_path text,
  logo_url text,
  is_quitado boolean not null default false,
  has_monthly_fee boolean not null default false,
  monthly_fee_amount numeric(12,2),
  monthly_fee_due_day integer check (monthly_fee_due_day is null or (monthly_fee_due_day >= 1 and monthly_fee_due_day <= 31)),
  monthly_next_due date,
  is_paying_development boolean not null default false,
  development_amount numeric(12,2),
  development_paid_off_date date,
  domain_expires_at date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.yop_admin_system_files (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.yop_admin_systems(id) on delete cascade,
  kind text not null check (kind in ('env', 'access', 'other')),
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists yop_admin_system_files_system_id_idx on public.yop_admin_system_files(system_id);
create index if not exists yop_admin_systems_company_name_idx on public.yop_admin_systems(company_name);

alter table public.yop_admin_systems enable row level security;
alter table public.yop_admin_system_files enable row level security;

drop policy if exists "yop_admin_systems_select" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_insert" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_update" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_delete" on public.yop_admin_systems;

create policy "yop_admin_systems_select" on public.yop_admin_systems for select to authenticated using (true);
create policy "yop_admin_systems_insert" on public.yop_admin_systems for insert to authenticated with check (true);
create policy "yop_admin_systems_update" on public.yop_admin_systems for update to authenticated using (true) with check (true);
create policy "yop_admin_systems_delete" on public.yop_admin_systems for delete to authenticated using (true);

drop policy if exists "yop_admin_system_files_select" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_insert" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_update" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_delete" on public.yop_admin_system_files;

create policy "yop_admin_system_files_select" on public.yop_admin_system_files for select to authenticated using (true);
create policy "yop_admin_system_files_insert" on public.yop_admin_system_files for insert to authenticated with check (true);
create policy "yop_admin_system_files_update" on public.yop_admin_system_files for update to authenticated using (true) with check (true);
create policy "yop_admin_system_files_delete" on public.yop_admin_system_files for delete to authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-system-files',
  'admin-system-files',
  false,
  20971520,
  array[
    'application/pdf',
    'text/plain',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin_system_files_select" on storage.objects;
drop policy if exists "admin_system_files_insert" on storage.objects;
drop policy if exists "admin_system_files_update" on storage.objects;
drop policy if exists "admin_system_files_delete" on storage.objects;

create policy "admin_system_files_select" on storage.objects for select to authenticated
using (bucket_id = 'admin-system-files');
create policy "admin_system_files_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'admin-system-files');
create policy "admin_system_files_update" on storage.objects for update to authenticated
using (bucket_id = 'admin-system-files') with check (bucket_id = 'admin-system-files');
create policy "admin_system_files_delete" on storage.objects for delete to authenticated
using (bucket_id = 'admin-system-files');

-- Seed dos projetos da landing (só insere se a tabela estiver vazia)
insert into public.yop_admin_systems
  (name, company_name, link, logo_url, notes, is_quitado, has_monthly_fee, is_paying_development)
select * from (values
  ('Plify 360', 'Plify 360', 'https://plify360.com.br', '/projetos/plify/logo.png', 'ERP/SaaS para PMEs. Importado da landing.', false, false, false),
  ('Westham Sport Club', 'Westham Sport Club', 'https://www.farrus.com.br/', '/projetos/westham/logo.png', 'Site e painel do clube. Importado da landing.', false, false, false),
  ('Palha Weddings', 'Palha Weddings', 'https://palhaweddings.plify360.com.br/', '/projetos/palha/logo.png', 'Álbuns para casamentos e eventos. Importado da landing.', false, false, false),
  ('Fênix Gestora', 'Fênix Gestora', 'https://www.fenixgestora.com.br', '/projetos/fenix/logo.420a748b9c9c09dc115e.png', 'Consórcios: CRM, ranking e automações. Importado da landing.', false, false, false),
  ('Teu Posto', 'Teu Posto', 'https://www.appteuposto.com.br/', '/projetos/teuposto/logo.png', 'Plataforma para postos. Importado da landing.', false, false, false),
  ('M&B Transportes', 'M&B Transportes', 'https://www.mebtransporte.com.br/', '/projetos/meb/logo.png', 'Gestão de frota e viagens. Importado da landing.', false, false, false),
  ('TOQ Tennis', 'TOQ Tennis', 'https://www.toqtennis.com.br/', '/projetos/toq/logo.png', 'Rede social de tênis. Importado da landing.', false, false, false),
  ('Capítulo 862 DeMolay', 'Capítulo 862 da Ordem DeMolay', 'https://www.demolay862.com.br/', '/projetos/demolay/logo.png', 'Sistema do capítulo DeMolay. Importado da landing.', false, false, false)
) as v(name, company_name, link, logo_url, notes, is_quitado, has_monthly_fee, is_paying_development)
where not exists (select 1 from public.yop_admin_systems limit 1);
