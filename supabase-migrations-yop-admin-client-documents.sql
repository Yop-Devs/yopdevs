-- Documentos PDF anexados aos clientes
create table if not exists public.yop_admin_client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.yop_admin_clients(id) on delete cascade,
  title text not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_client_documents_client_idx
  on public.yop_admin_client_documents (client_id);

alter table public.yop_admin_client_documents enable row level security;

drop policy if exists "yop_admin_client_documents_select" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_insert" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_update" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_delete" on public.yop_admin_client_documents;

create policy "yop_admin_client_documents_select" on public.yop_admin_client_documents
  for select to authenticated using (true);
create policy "yop_admin_client_documents_insert" on public.yop_admin_client_documents
  for insert to authenticated with check (true);
create policy "yop_admin_client_documents_update" on public.yop_admin_client_documents
  for update to authenticated using (true) with check (true);
create policy "yop_admin_client_documents_delete" on public.yop_admin_client_documents
  for delete to authenticated using (true);
