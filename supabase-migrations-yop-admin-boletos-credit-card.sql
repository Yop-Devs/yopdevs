-- Cobrança por cartão (Checkout Pro) no Gerenciamento de Cobrança
alter table public.yop_admin_boletos
  add column if not exists payment_method text not null default 'boleto',
  add column if not exists mp_preference_id text,
  add column if not exists checkout_url text,
  add column if not exists installments integer;

alter table public.yop_admin_boletos
  drop constraint if exists yop_admin_boletos_payment_method_check;

alter table public.yop_admin_boletos
  add constraint yop_admin_boletos_payment_method_check
  check (payment_method = any (array['boleto'::text, 'credit_card'::text]));

create index if not exists yop_admin_boletos_method_idx on public.yop_admin_boletos (payment_method);
create index if not exists yop_admin_boletos_preference_idx on public.yop_admin_boletos (mp_preference_id);
