-- Caixa de e-mail admin (threads + mensagens)
-- Rodar no SQL Editor do projeto Yop-Devs:
-- https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

create table if not exists public.yop_admin_mailbox_threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '(sem assunto)',
  participants text[] not null default '{}',
  last_message_at timestamptz not null default now(),
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yop_admin_mailbox_threads_last_msg_idx
  on public.yop_admin_mailbox_threads (last_message_at desc);

create table if not exists public.yop_admin_mailbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.yop_admin_mailbox_threads(id) on delete cascade,
  resend_email_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_email text not null default '',
  from_name text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text not null default '(sem assunto)',
  text_body text,
  html_body text,
  message_id text,
  in_reply_to text,
  attachments jsonb not null default '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists yop_admin_mailbox_messages_resend_id_uidx
  on public.yop_admin_mailbox_messages (resend_email_id)
  where resend_email_id is not null;

create index if not exists yop_admin_mailbox_messages_thread_idx
  on public.yop_admin_mailbox_messages (thread_id, created_at);

create index if not exists yop_admin_mailbox_messages_message_id_idx
  on public.yop_admin_mailbox_messages (message_id)
  where message_id is not null;

alter table public.yop_admin_mailbox_threads enable row level security;
alter table public.yop_admin_mailbox_messages enable row level security;

drop policy if exists "yop_admin_mailbox_threads_select" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_insert" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_update" on public.yop_admin_mailbox_threads;
drop policy if exists "yop_admin_mailbox_threads_delete" on public.yop_admin_mailbox_threads;

create policy "yop_admin_mailbox_threads_select"
  on public.yop_admin_mailbox_threads for select to authenticated using (true);
create policy "yop_admin_mailbox_threads_insert"
  on public.yop_admin_mailbox_threads for insert to authenticated with check (true);
create policy "yop_admin_mailbox_threads_update"
  on public.yop_admin_mailbox_threads for update to authenticated using (true) with check (true);
create policy "yop_admin_mailbox_threads_delete"
  on public.yop_admin_mailbox_threads for delete to authenticated using (true);

drop policy if exists "yop_admin_mailbox_messages_select" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_insert" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_update" on public.yop_admin_mailbox_messages;
drop policy if exists "yop_admin_mailbox_messages_delete" on public.yop_admin_mailbox_messages;

create policy "yop_admin_mailbox_messages_select"
  on public.yop_admin_mailbox_messages for select to authenticated using (true);
create policy "yop_admin_mailbox_messages_insert"
  on public.yop_admin_mailbox_messages for insert to authenticated with check (true);
create policy "yop_admin_mailbox_messages_update"
  on public.yop_admin_mailbox_messages for update to authenticated using (true) with check (true);
create policy "yop_admin_mailbox_messages_delete"
  on public.yop_admin_mailbox_messages for delete to authenticated using (true);
