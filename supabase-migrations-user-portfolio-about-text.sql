-- Texto longo da secção "Sobre" no portfólio público (/u/...), separado da bio curta (hero).
-- Executar no Supabase → SQL Editor (uma vez).

ALTER TABLE user_portfolios
  ADD COLUMN IF NOT EXISTS about_text text;

COMMENT ON COLUMN user_portfolios.bio IS 'Resumo curto abaixo da headline no hero.';
COMMENT ON COLUMN user_portfolios.about_text IS 'Texto longo na secção Sobre da página pública.';
