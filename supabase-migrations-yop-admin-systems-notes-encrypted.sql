-- Exige que yop_admin_systems.notes seja null ou AES (enc:v1:...).
-- Rodar DEPOIS de clicar "Criptografar secrets" no painel (migra plaintext).
-- SQL Editor: https://supabase.com/dashboard/project/rfkfzkbmqtvpbjnbvnjz/sql

-- Falha se ainda houver plaintext — rode o botão de criptografar antes.
do $$
begin
  if exists (
    select 1
    from public.yop_admin_systems
    where notes is not null
      and btrim(notes) <> ''
      and notes not like 'enc:v1:%'
  ) then
    raise exception
      'Ainda há notes em plaintext. No admin → Sistemas → "Criptografar secrets", depois rode este SQL de novo.';
  end if;
end $$;

alter table public.yop_admin_systems
  drop constraint if exists yop_admin_systems_notes_encrypted_chk;

alter table public.yop_admin_systems
  add constraint yop_admin_systems_notes_encrypted_chk
  check (
    notes is null
    or btrim(notes) = ''
    or notes like 'enc:v1:%'
  );
