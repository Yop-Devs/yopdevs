-- Tornar um usuário Administrador ou Moderador pelo e-mail
-- Rode no SQL Editor do Supabase. Troque 'seu@email.com' pelo e-mail da conta.

-- 1) Garantir que a coluna role existe na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

-- 2) Atualizar o perfil existente para ADMIN (o painel Admin aparece para role ADMIN ou MODERADOR)
UPDATE profiles
SET role = 'ADMIN'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'seu@email.com'
);

-- Se retornar "0 rows", o perfil pode não existir ainda. Crie/atualize com:
-- INSERT INTO profiles (id, full_name, role)
-- SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'ADMIN'
-- FROM auth.users WHERE email = 'seu@email.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Para conferir: SELECT id, full_name, role FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'seu@email.com');