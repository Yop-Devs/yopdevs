-- ============================================================
-- YOP DEVS - Corrigir tabela projects (lançar projeto)
-- Erro: "Could not find the 'category' column of 'projects' in the schema cache"
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1) Ver colunas atuais da tabela projects
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- 2) Adicionar colunas que o formulário envia (se não existirem)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tech_stack text,
  ADD COLUMN IF NOT EXISTS equity_offered numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Se a tabela usar "sector" em vez de "category", descomente uma das opções:
-- Opção A: renomear sector para category
-- ALTER TABLE public.projects RENAME COLUMN sector TO category;
-- Opção B: criar category e copiar de sector
-- ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS category text;
-- UPDATE public.projects SET category = sector WHERE sector IS NOT NULL;

-- 3) RLS: permitir que usuários autenticados insiram projetos (owner_id = ele mesmo)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
CREATE POLICY "Anyone can read projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
