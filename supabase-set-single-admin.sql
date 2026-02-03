-- Deixar SOMENTE yopdevs@gmail.com como ADMIN; todos os demais como MEMBER
-- Rode no SQL Editor do Supabase (uma vez ou sempre que quiser resetar os admins).

-- 1) Garantir que a coluna role existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

-- 2) Primeiro: todos os perfis viram MEMBER
UPDATE profiles SET role = 'MEMBER';

-- 3) Depois: o perfil do e-mail abaixo vira ADMIN
UPDATE profiles
SET role = 'ADMIN'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'yopdevs@gmail.com'
);

-- Se o perfil do yopdevs@gmail.com ainda não existir (novo usuário), crie:
-- INSERT INTO profiles (id, full_name, role)
-- SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'ADMIN'
-- FROM auth.users WHERE email = 'yopdevs@gmail.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Para conferir quem é admin:
-- SELECT p.id, p.full_name, p.role, u.email
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.id
-- ORDER BY p.role DESC NULLS LAST, p.full_name;
