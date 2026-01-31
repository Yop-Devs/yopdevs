-- Tornar um usuário Administrador pelo e-mail
-- Rode no SQL Editor do Supabase. Troque 'seu@email.com' pelo e-mail da conta que será admin.

UPDATE profiles
SET role = 'ADMIN'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'seu@email.com'
);

-- Se retornar "0 rows" ou não encontrar o usuário, confira:
-- 1. O e-mail está correto e a conta já existe (já fez cadastro/login uma vez).
-- 2. A tabela profiles tem uma linha para esse usuário (gerada no primeiro login/cadastro).
-- Para conferir o id do usuário antes de atualizar:
--   SELECT id, email FROM auth.users WHERE email = 'seu@email.com';
-- Para conferir o perfil:
--   SELECT id, full_name, role FROM profiles WHERE id = 'uuid-do-resultado-acima';
