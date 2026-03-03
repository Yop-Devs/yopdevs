-- Visualizações de posts (para feed de rede social)
-- Execute no SQL Editor do Supabase para habilitar contagem de visualizações
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;

-- Função para incrementar visualizações (evita race condition)
CREATE OR REPLACE FUNCTION increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_post_id;
$$;
