-- Fim da série recorrente (preserva histórico ao editar/excluir a partir de uma data)
alter table public.yop_admin_finance_entries
  add column if not exists recurrence_ends_on date;

alter table public.yop_admin_finance_entries
  drop constraint if exists yop_admin_finance_entries_recurrence_ends_check;

alter table public.yop_admin_finance_entries
  add constraint yop_admin_finance_entries_recurrence_ends_check
  check (
    recurrence_ends_on is null
    or recurrence_ends_on >= entry_date
  );
