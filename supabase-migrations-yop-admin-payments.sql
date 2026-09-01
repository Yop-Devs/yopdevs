-- Pagamentos por sistema + parcelas
-- (já aplicada no projeto YOP; arquivo de referência)

create table if not exists public.yop_admin_payments (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null unique references public.yop_admin_systems(id) on delete cascade,
  is_quitado boolean not null default false,
  has_operation_fee boolean not null default false,
  operation_fee_period_days integer,
  operation_fee_amount numeric(12,2),
  operation_fee_charge_day integer,
  operation_next_due date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.yop_admin_payment_installments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.yop_admin_payments(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12,2) not null,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  unique (payment_id, installment_number)
);
