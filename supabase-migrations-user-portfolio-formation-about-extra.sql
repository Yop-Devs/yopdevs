-- Formação & certificações (JSONB, sem limite de itens) + campos extra na secção Sobre.
-- Executar no Supabase → SQL Editor (uma vez).

ALTER TABLE user_portfolios
  ADD COLUMN IF NOT EXISTS formation_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS about_highlight text,
  ADD COLUMN IF NOT EXISTS about_age text,
  ADD COLUMN IF NOT EXISTS about_marital_status text,
  ADD COLUMN IF NOT EXISTS about_status_line text;

COMMENT ON COLUMN user_portfolios.formation_entries IS 'Array JSON: [{ "institution": "...", "course": "...", "year": "2021" | null }, ...].';
COMMENT ON COLUMN user_portfolios.about_highlight IS 'Texto opcional na secção Sobre (destaque, ex. itálico).';
COMMENT ON COLUMN user_portfolios.about_age IS 'Texto livre exibido no cartão Idade (ex.: 22 anos).';
COMMENT ON COLUMN user_portfolios.about_marital_status IS 'Estado civil (texto livre).';
COMMENT ON COLUMN user_portfolios.about_status_line IS 'Frase de status / disponibilidade na secção Sobre.';
