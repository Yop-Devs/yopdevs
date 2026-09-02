-- Boletos emitidos via Mercado Pago (Gerenciamento de Cobrança)
create table if not exists public.yop_admin_boletos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.yop_admin_clients(id) on delete restrict,
  description text not null,
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status = any (array[
      'pending'::text,
      'approved'::text,
      'cancelled'::text,
      'rejected'::text,
      'refunded'::text,
      'charged_back'::text,
      'expired'::text
    ])),
  mp_payment_id text unique,
  mp_status text,
  mp_status_detail text,
  ticket_url text,
  barcode text,
  digitable_line text,
  date_of_expiration timestamptz,
  paid_at timestamptz,
  payer_email text,
  payer_name text,
  payer_doc_type text,
  payer_doc_number text,
  notes text,
  external_reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_boletos_client_idx on public.yop_admin_boletos (client_id);
create index if not exists yop_admin_boletos_status_idx on public.yop_admin_boletos (status);
create index if not exists yop_admin_boletos_created_idx on public.yop_admin_boletos (created_at desc);
create index if not exists yop_admin_boletos_mp_payment_idx on public.yop_admin_boletos (mp_payment_id);

alter table public.yop_admin_boletos enable row level security;

drop policy if exists "yop_admin_boletos_select" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_insert" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_update" on public.yop_admin_boletos;
drop policy if exists "yop_admin_boletos_delete" on public.yop_admin_boletos;

create policy "yop_admin_boletos_select" on public.yop_admin_boletos for select to authenticated using (true);
create policy "yop_admin_boletos_insert" on public.yop_admin_boletos for insert to authenticated with check (true);
create policy "yop_admin_boletos_update" on public.yop_admin_boletos for update to authenticated using (true) with check (true);
create policy "yop_admin_boletos_delete" on public.yop_admin_boletos for delete to authenticated using (true);
