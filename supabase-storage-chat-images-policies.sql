-- Políticas do bucket "chat-images" (chat com imagens)
-- Rode no SQL Editor do Supabase após criar o bucket "chat-images" no Storage.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated upload chat-images" ON storage.objects;
CREATE POLICY "Allow authenticated upload chat-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Allow public read chat-images" ON storage.objects;
CREATE POLICY "Allow public read chat-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');
