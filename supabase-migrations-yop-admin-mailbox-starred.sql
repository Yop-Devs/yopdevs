-- Estrela / importante na caixa de e-mail
-- Rodar no SQL Editor do projeto Yop-Devs:
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

alter table public.yop_admin_mailbox_threads
  add column if not exists starred boolean not null default false;

create index if not exists yop_admin_mailbox_threads_starred_idx
  on public.yop_admin_mailbox_threads (starred desc, last_message_at desc);
