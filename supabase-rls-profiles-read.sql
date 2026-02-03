-- RLS na tabela profiles: permitir leitura de perfis para usuários autenticados
-- Necessário para: (1) painel Admin listar todos os usuários; (2) ver portfólio de outros membros (/dashboard/perfil/[id])

-- 0) Garantir coluna created_at (usada pelo painel Admin para ordenar)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 1) Garantir que RLS está ativado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2) Política: qualquer usuário autenticado pode LER qualquer perfil (lista no admin + ver portfólio de outros)
-- Se já existir uma política com nome "Allow authenticated read profiles", remova-a antes ou use DROP POLICY IF EXISTS.
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON profiles;
CREATE POLICY "Allow authenticated read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3) Garantir que cada um só pode ATUALIZAR o próprio perfil (se ainda não tiver política de UPDATE)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Para conferir políticas: SELECT * FROM pg_policies WHERE tablename = 'profiles';
