-- ============================================================
-- YOP DEVS - RLS na tabela posts (fórum)
-- Erro: "New row violates row-level security policy for table 'posts'"
-- Execute no SQL Editor do Supabase
-- A tabela posts usa author_id (não user_id). Políticas abaixo usam author_id.
-- ============================================================

-- 1) Habilitar RLS na tabela posts (se ainda não estiver)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 2) Política: usuário autenticado pode INSERIR um post (só com author_id = ele mesmo)
DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 3) Política: qualquer um pode LER todos os posts (para listar o fórum)
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

-- 4) Política: autor pode ATUALIZAR o próprio post (opcional)
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 5) Política: autor pode DELETAR o próprio post (opcional)
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 6) Verificar políticas atuais
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'posts';
