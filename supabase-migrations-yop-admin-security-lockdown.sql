-- Endurecimento de segurança admin (YOP Devs)
-- Rodar no SQL Editor: https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql
--
-- Efeito:
-- 1) Função is_yop_admin() — só o e-mail allowlist (JWT)
-- 2) RLS de todas yop_admin_* passa a exigir is_yop_admin()
-- 3) RLS em payments / installments (antes sem RLS)
-- 4) Storage admin-system-files só para admin

create or replace function public.is_yop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(nullif(trim(auth.jwt() ->> 'email'), '')) = any (
      array[
        'gabrielcarrarapessoal@gmail.com'
      ]::text[]
    ),
    false
  );
$$;

revoke all on function public.is_yop_admin() from public;
grant execute on function public.is_yop_admin() to authenticated;
grant execute on function public.is_yop_admin() to service_role;

-- ---------- helpers: recriar policies por tabela ----------

-- yop_admin_clients
alter table if exists public.yop_admin_clients enable row level security;
drop policy if exists "yop_admin_clients_select" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_insert" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_update" on public.yop_admin_clients;
drop policy if exists "yop_admin_clients_delete" on public.yop_admin_clients;
create policy "yop_admin_clients_select" on public.yop_admin_clients for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_clients_insert" on public.yop_admin_clients for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_clients_update" on public.yop_admin_clients for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_clients_delete" on public.yop_admin_clients for delete to authenticated using (public.is_yop_admin());

-- yop_admin_client_systems
alter table if exists public.yop_admin_client_systems enable row level security;
drop policy if exists "yop_admin_client_systems_select" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_insert" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_update" on public.yop_admin_client_systems;
drop policy if exists "yop_admin_client_systems_delete" on public.yop_admin_client_systems;
create policy "yop_admin_client_systems_select" on public.yop_admin_client_systems for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_client_systems_insert" on public.yop_admin_client_systems for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_client_systems_update" on public.yop_admin_client_systems for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_client_systems_delete" on public.yop_admin_client_systems for delete to authenticated using (public.is_yop_admin());

-- yop_admin_client_documents
alter table if exists public.yop_admin_client_documents enable row level security;
drop policy if exists "yop_admin_client_documents_select" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_insert" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_update" on public.yop_admin_client_documents;
drop policy if exists "yop_admin_client_documents_delete" on public.yop_admin_client_documents;
create policy "yop_admin_client_documents_select" on public.yop_admin_client_documents for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_client_documents_insert" on public.yop_admin_client_documents for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_client_documents_update" on public.yop_admin_client_documents for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_client_documents_delete" on public.yop_admin_client_documents for delete to authenticated using (public.is_yop_admin());

-- yop_admin_systems
alter table if exists public.yop_admin_systems enable row level security;
drop policy if exists "yop_admin_systems_select" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_insert" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_update" on public.yop_admin_systems;
drop policy if exists "yop_admin_systems_delete" on public.yop_admin_systems;
create policy "yop_admin_systems_select" on public.yop_admin_systems for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_systems_insert" on public.yop_admin_systems for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_systems_update" on public.yop_admin_systems for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_systems_delete" on public.yop_admin_systems for delete to authenticated using (public.is_yop_admin());

-- yop_admin_system_files
alter table if exists public.yop_admin_system_files enable row level security;
drop policy if exists "yop_admin_system_files_select" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_insert" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_update" on public.yop_admin_system_files;
drop policy if exists "yop_admin_system_files_delete" on public.yop_admin_system_files;
create policy "yop_admin_system_files_select" on public.yop_admin_system_files for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_system_files_insert" on public.yop_admin_system_files for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_system_files_update" on public.yop_admin_system_files for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_system_files_delete" on public.yop_admin_system_files for delete to authenticated using (public.is_yop_admin());

-- yop_admin_system_integrations
alter table if exists public.yop_admin_system_integrations enable row level security;
drop policy if exists "yop_admin_system_integrations_select" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_insert" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_update" on public.yop_admin_system_integrations;
drop policy if exists "yop_admin_system_integrations_delete" on public.yop_admin_system_integrations;
create policy "yop_admin_system_integrations_select" on public.yop_admin_system_integrations for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_system_integrations_insert" on public.yop_admin_system_integrations for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_system_integrations_update" on public.yop_admin_system_integrations for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_system_integrations_delete" on public.yop_admin_system_integrations for delete to authenticated using (public.is_yop_admin());

-- yop_admin_system_usage_snapshots
alter table if exists public.yop_admin_system_usage_snapshots enable row level security;
drop policy if exists "yop_admin_system_usage_snapshots_select" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_insert" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_update" on public.yop_admin_system_usage_snapshots;
drop policy if exists "yop_admin_system_usage_snapshots_delete" on public.yop_admin_system_usage_snapshots;
create policy "yop_admin_system_usage_snapshots_select" on public.yop_admin_system_usage_snapshots for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_system_usage_snapshots_insert" on public.yop_admin_system_usage_snapshots for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_system_usage_snapshots_update" on public.yop_admin_system_usage_snapshots for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_system_usage_snapshots_delete" on public.yop_admin_system_usage_snapshots for delete to authenticated using (public.is_yop_admin());

-- yop_admin_finance_entries
alter table if exists public.yop_admin_finance_entries enable row level security;
drop policy if exists "yop_admin_finance_entries_select" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_insert" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_update" on public.yop_admin_finance_entries;
drop policy if exists "yop_admin_finance_entries_delete" on public.yop_admin_finance_entries;
create policy "yop_admin_finance_entries_select" on public.yop_admin_finance_entries for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_finance_entries_insert" on public.yop_admin_finance_entries for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_finance_entries_update" on public.yop_admin_finance_entries for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_finance_entries_delete" on public.yop_admin_finance_entries for delete to authenticated using (public.is_yop_admin());

-- yop_admin_boletos
alter table if exists public.yop_admin_boletos enable row level security;
drop policy if exists "yop_admin_boletos_select" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_insert" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_update" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_delete" on public.yop_admin_boletos;
create policy "yop_admin_boletos_select" on public.yop_admin_boletos for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_boletos_insert" on public.yop_admin_boletos for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_boletos_update" on public.yop_admin_boletos for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_boletos_delete" on public.yop_admin_boletos for delete to authenticated using (public.is_yop_admin());

-- yop_admin_mailbox_threads (+ starred se ainda não existir)
alter table if exists public.yop_admin_mailbox_threads
  add column if not exists starred boolean not null default false;
alter table if exists public.yop_admin_mailbox_threads enable row level security;
drop policy if exists "yop_admin_mailbox_threads_select" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_insert" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_update" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_delete" on public.yop_admin_mailbox_threads;
create policy "yop_admin_mailbox_threads_select" on public.yop_admin_mailbox_threads for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_mailbox_threads_insert" on public.yop_admin_mailbox_threads for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_mailbox_threads_update" on public.yop_admin_mailbox_threads for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_mailbox_threads_delete" on public.yop_admin_mailbox_threads for delete to authenticated using (public.is_yop_admin());

-- yop_admin_mailbox_messages
alter table if exists public.yop_admin_mailbox_messages enable row level security;
drop policy if exists "yop_admin_mailbox_messages_select" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_insert" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_update" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_delete" on public.yop_admin_mailbox_messages;
create policy "yop_admin_mailbox_messages_select" on public.yop_admin_mailbox_messages for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_mailbox_messages_insert" on public.yop_admin_mailbox_messages for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_mailbox_messages_update" on public.yop_admin_mailbox_messages for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_mailbox_messages_delete" on public.yop_admin_mailbox_messages for delete to authenticated using (public.is_yop_admin());

-- yop_admin_payments (antes SEM RLS)
alter table if exists public.yop_admin_payments enable row level security;
drop policy if exists "yop_admin_payments_select" on public.yop_admin_payments;
drop policy if exists "yop_admin_payments_insert" on public.yop_admin_payments;
drop policy if exists "yop_admin_payments_update" on public.yop_admin_payments;
drop policy if exists "yop_admin_payments_delete" on public.yop_admin_payments;
create policy "yop_admin_payments_select" on public.yop_admin_payments for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_payments_insert" on public.yop_admin_payments for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_payments_update" on public.yop_admin_payments for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_payments_delete" on public.yop_admin_payments for delete to authenticated using (public.is_yop_admin());

-- yop_admin_payment_installments
alter table if exists public.yop_admin_payment_installments enable row level security;
drop policy if exists "yop_admin_payment_installments_select" on public.yop_admin_payment_installments;
drop policy if exists "yop_admin_payment_installments_insert" on public.yop_admin_payment_installments;
drop policy if exists "yop_admin_payment_installments_update" on public.yop_admin_payment_installments;
drop policy if exists "yop_admin_payment_installments_delete" on public.yop_admin_payment_installments;
create policy "yop_admin_payment_installments_select" on public.yop_admin_payment_installments for select to authenticated using (public.is_yop_admin());
create policy "yop_admin_payment_installments_insert" on public.yop_admin_payment_installments for insert to authenticated with check (public.is_yop_admin());
create policy "yop_admin_payment_installments_update" on public.yop_admin_payment_installments for update to authenticated using (public.is_yop_admin()) with check (public.is_yop_admin());
create policy "yop_admin_payment_installments_delete" on public.yop_admin_payment_installments for delete to authenticated using (public.is_yop_admin());

-- Storage bucket admin-system-files
drop policy if exists "admin_system_files_select" on storage.objects;
drop policy if exists "admin_system_files_insert" on storage.objects;
drop policy if exists "admin_system_files_update" on storage.objects;
drop policy if exists "admin_system_files_delete" on storage.objects;
create policy "admin_system_files_select" on storage.objects for select to authenticated
using (bucket_id = 'admin-system-files' and public.is_yop_admin());
create policy "admin_system_files_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'admin-system-files' and public.is_yop_admin());
create policy "admin_system_files_update" on storage.objects for update to authenticated
using (bucket_id = 'admin-system-files' and public.is_yop_admin())
with check (bucket_id = 'admin-system-files' and public.is_yop_admin());
create policy "admin_system_files_delete" on storage.objects for delete to authenticated
using (bucket_id = 'admin-system-files' and public.is_yop_admin());
