-- Portfolio público: permite leitura de profiles por visitantes anônimos
-- (necessário para a página /portfolio/[slug] funcionar sem login)
-- Rode no SQL Editor do Supabase se o portfolio retornar "Perfil não encontrado".

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permite que qualquer pessoa (incl. anônimos) leia perfis para exibir portfolios públicos
DROP POLICY IF EXISTS "Public read profiles for portfolio" ON profiles;
CREATE POLICY "Public read profiles for portfolio" ON profiles FOR SELECT USING (true);
