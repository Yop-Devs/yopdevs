-- Portfolio público: permite leitura de profiles por visitantes anônimos
-- (necessário para a página /portfolio/[slug] funcionar sem login)
--
-- OPÇÃO A (recomendada): Na Vercel, adicione a variável de ambiente:
--   SUPABASE_SERVICE_ROLE_KEY = (chave service_role do Supabase)
-- Pegue em: Supabase → Project Settings → API → service_role (secret)
-- A API do portfolio usa essa chave e ignora o RLS.
--
-- OPÇÃO B: Se não quiser usar service role, rode este SQL no Supabase (SQL Editor):

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles for portfolio" ON profiles;
CREATE POLICY "Public read profiles for portfolio" ON profiles FOR SELECT USING (true);
