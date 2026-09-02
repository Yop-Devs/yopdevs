-- Recorrência em entradas do Controle Financeiro
alter table public.yop_admin_finance_entries
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_interval_days integer;

alter table public.yop_admin_finance_entries
  drop constraint if exists yop_admin_finance_entries_recurrence_days_check;

alter table public.yop_admin_finance_entries
  add constraint yop_admin_finance_entries_recurrence_days_check
  check (
    recurrence_interval_days is null
    or recurrence_interval_days > 0
  );
