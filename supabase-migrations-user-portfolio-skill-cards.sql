-- Cartões de competências (título + tags), até 4, no portfólio público.
-- Executar no Supabase → SQL Editor (uma vez).

ALTER TABLE user_portfolios
  ADD COLUMN IF NOT EXISTS skill_cards jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_portfolios.skill_cards IS 'Array JSON: [{ "title": "Frontend", "tags": ["React","Next.js"] }, ...] máx. 4 itens.';
