-- YOP Devs — reset completo do banco
-- Mantém apenas gabrielcarrarapessoal@gmail.com (GABRIEL CARRARA, ADMIN).
-- Portfólio e landing são estáticos no código; dados salvos no banco são apagados.
-- Executar no Supabase SQL Editor ou: npx supabase db query --linked -f supabase-reset-yopdevs-fresh-start.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = 'gabrielcarrarapessoal@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Usuário gabrielcarrarapessoal@gmail.com não encontrado. Crie a conta antes do reset.';
  END IF;
END $$;

-- Storage: limpeza via Dashboard (Storage) ou API — delete direto em storage.objects é bloqueado.

-- Fórum / rede social
DELETE FROM post_reactions WHERE true;
DELETE FROM post_comment_likes WHERE true;
DELETE FROM post_likes WHERE true;
DELETE FROM post_comments WHERE true;
DELETE FROM posts WHERE true;

-- Chat, notificações, amizades
DELETE FROM messages WHERE true;
DELETE FROM notifications WHERE true;
DELETE FROM friend_requests WHERE true;

-- Agenda
DELETE FROM user_agenda_activities WHERE true;

-- Portfólios dinâmicos (/u/username) — landing e /gabriel-portfolio-completo ficam no código
DELETE FROM portfolio_experiences WHERE true;
DELETE FROM portfolio_projects WHERE true;
DELETE FROM portfolio_skills WHERE true;
DELETE FROM user_portfolios WHERE true;

-- Marketplace / projetos legados
DELETE FROM projects WHERE true;

-- Remove todos os usuários exceto Gabriel (CASCADE limpa profiles órfãos)
DELETE FROM auth.users
WHERE lower(email) IS DISTINCT FROM 'gabrielcarrarapessoal@gmail.com';

-- Garantir perfil e admin do Gabriel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

INSERT INTO profiles (id, full_name, role)
SELECT id, 'GABRIEL CARRARA', 'ADMIN'
FROM auth.users
WHERE lower(email) = 'gabrielcarrarapessoal@gmail.com'
ON CONFLICT (id) DO UPDATE
SET full_name = 'GABRIEL CARRARA',
    role = 'ADMIN';

UPDATE profiles
SET role = 'MEMBER'
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE lower(email) = 'gabrielcarrarapessoal@gmail.com'
);
