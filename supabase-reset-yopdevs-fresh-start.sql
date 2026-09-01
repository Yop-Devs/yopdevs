-- YOP Devs — reset leve (mantém schema atual)
-- Tabelas ativas: profiles, user_portfolios, portfolio_*, yop_admin_*
-- Executar no SQL Editor se precisar limpar dados de testes.

DELETE FROM yop_admin_system_files WHERE true;
DELETE FROM yop_admin_systems WHERE true;
DELETE FROM portfolio_experiences WHERE true;
DELETE FROM portfolio_projects WHERE true;
DELETE FROM portfolio_skills WHERE true;
DELETE FROM user_portfolios WHERE true;

-- Garantir perfil admin do Gabriel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

INSERT INTO profiles (id, full_name, role)
SELECT id, 'GABRIEL CARRARA', 'ADMIN'
FROM auth.users
WHERE lower(email) = 'gabrielcarrarapessoal@gmail.com'
ON CONFLICT (id) DO UPDATE
SET full_name = 'GABRIEL CARRARA',
    role = 'ADMIN';
