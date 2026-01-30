-- ============================================================
-- YOP DEVS - Corrigir tabela posts: coluna user_id
-- Erro: "Could not find the 'user_id' column of 'posts' in the schema cache"
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1) Verificar colunas atuais da tabela posts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- 2) Adicionar coluna user_id (autor do post) se não existir
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2b) Se a tabela já tiver uma coluna tipo author_id, descomente e use uma das opções:
-- Opção A: renomear author_id para user_id (se existir author_id)
-- ALTER TABLE public.posts RENAME COLUMN author_id TO user_id;

-- Opção B: criar user_id e copiar de author_id (depois pode apagar author_id)
-- ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
-- UPDATE public.posts SET user_id = author_id WHERE author_id IS NOT NULL;

-- 3) Garantir que novos posts tenham user_id (opcional: tornar NOT NULL depois de preencher)
-- UPDATE public.posts SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- ALTER TABLE public.posts ALTER COLUMN user_id SET NOT NULL;

-- 4) Atualizar schema cache do PostgREST (Supabase recarrega sozinho; se não, reinicie o projeto)
-- Não é necessário rodar nada; após o ALTER, a API já enxerga a nova coluna.
