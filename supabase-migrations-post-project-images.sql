-- Imagens em posts e projetos (até 3 por item)
-- Execute no SQL Editor do Supabase

ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- IMPORTANTE: Crie o bucket "content-images" no Supabase Storage:
-- 1. Dashboard > Storage > New bucket
-- 2. Nome: content-images
-- 3. Public bucket: SIM (para leitura pública das imagens)
