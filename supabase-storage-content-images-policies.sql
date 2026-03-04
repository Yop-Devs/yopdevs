-- Políticas do bucket "content-images" (Oportunidades + Comunidade)
-- Usado em: /dashboard/projetos/novo e /dashboard/forum (posts com imagem)
--
-- PASSO 1: Criar o bucket (se ainda não existir)
--   Supabase Dashboard > Storage > New bucket
--   Nome: content-images
--   Public bucket: SIM (marcado)
--
-- PASSO 2: Executar este SQL no Supabase (SQL Editor)
--   Cole o conteúdo abaixo e rode. Se der "must be owner", crie as políticas
--   manualmente em Storage > content-images > Policies (veja comentários no código).
--
-- Política 1 - Upload (INSERT): usuários logados podem enviar imagens
-- Política 2 - Leitura (SELECT): qualquer um pode ver (bucket público)

-- Remover políticas antigas se existirem (evita duplicata)
DROP POLICY IF EXISTS "Allow authenticated upload content-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read content-images" ON storage.objects;

-- Upload: apenas usuários autenticados no bucket content-images
CREATE POLICY "Allow authenticated upload content-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-images');

-- Leitura: pública para exibir imagens em posts e projetos
CREATE POLICY "Allow public read content-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-images');
