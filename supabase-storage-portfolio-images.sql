-- Bucket portfolio-images: avatar, banner e imagens de projetos
-- Criar o bucket no Supabase Dashboard: Storage > New bucket > Nome: portfolio-images > Public: SIM
-- Depois executar este SQL no SQL Editor.

DROP POLICY IF EXISTS "Allow authenticated upload portfolio-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read portfolio-images" ON storage.objects;

CREATE POLICY "Allow authenticated upload portfolio-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio-images');

CREATE POLICY "Allow public read portfolio-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'portfolio-images');
