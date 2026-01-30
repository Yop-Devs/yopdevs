-- Notificações: colunas para link e contexto (rode no SQL Editor do Supabase)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES auth.users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Permite que o usuário apague suas próprias notificações (sem isso, o DELETE não persiste no servidor)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Tabela de solicitações de amizade
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_id, to_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_id);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can insert own outgoing" ON friend_requests;
DROP POLICY IF EXISTS "Users can update incoming" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete own request" ON friend_requests;
CREATE POLICY "Users can see own requests" ON friend_requests FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "Users can insert own outgoing" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "Users can update incoming" ON friend_requests FOR UPDATE USING (auth.uid() = to_id);
CREATE POLICY "Users can delete own request" ON friend_requests FOR DELETE USING (auth.uid() = from_id OR auth.uid() = to_id);

-- Fórum: curtir comentários
CREATE TABLE IF NOT EXISTS post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON post_comment_likes(comment_id);

ALTER TABLE post_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read likes" ON post_comment_likes;
DROP POLICY IF EXISTS "Auth can insert like" ON post_comment_likes;
DROP POLICY IF EXISTS "Auth can delete own like" ON post_comment_likes;
CREATE POLICY "Anyone can read likes" ON post_comment_likes FOR SELECT USING (true);
CREATE POLICY "Auth can insert like" ON post_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can delete own like" ON post_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Fórum: curtir postagem (tópico)
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read post likes" ON post_likes;
DROP POLICY IF EXISTS "Auth can insert post like" ON post_likes;
DROP POLICY IF EXISTS "Auth can delete own post like" ON post_likes;
CREATE POLICY "Anyone can read post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Auth can insert post like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can delete own post like" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Permite que o autor exclua sua própria publicação no fórum (a tabela posts já deve ter RLS ativo)
DROP POLICY IF EXISTS "Users can delete own post" ON posts;
CREATE POLICY "Users can delete own post" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Permite que o dono exclua seu próprio projeto (a tabela projects já deve ter RLS ativo)
DROP POLICY IF EXISTS "Users can delete own project" ON projects;
CREATE POLICY "Users can delete own project" ON projects FOR DELETE USING (auth.uid() = owner_id);

-- ========== TRIGGERS DE NOTIFICAÇÃO (descomente e rode um por vez no SQL Editor) ==========

-- 1) Mensagem no chat (link e from_user_id para exibir "Você recebeu uma nova mensagem de [nome]")
-- CREATE OR REPLACE FUNCTION notify_on_new_message()
-- RETURNS TRIGGER AS $$
-- DECLARE sender_name text;
-- BEGIN
--   SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
--   INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id)
--   VALUES (NEW.receiver_id, 'CHAT', 'Você recebeu uma nova mensagem de ' || COALESCE(sender_name, 'alguém') || '.', false, '/dashboard/chat/' || NEW.sender_id, NEW.sender_id);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_message_insert ON messages;
-- CREATE TRIGGER on_message_insert AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- 2) Solicitação de amizade enviada para você
-- CREATE OR REPLACE FUNCTION notify_on_friend_request()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id)
--   VALUES (NEW.to_id, 'FRIEND_REQUEST', 'Nova solicitação de amizade.', false, '/dashboard/membros', NEW.from_id);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_friend_request_insert ON friend_requests;
-- CREATE TRIGGER on_friend_request_insert AFTER INSERT ON friend_requests FOR EACH ROW EXECUTE FUNCTION notify_on_friend_request();

-- 3) Sua solicitação de amizade foi aceita
-- CREATE OR REPLACE FUNCTION notify_on_friend_accepted()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
--     INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id)
--     VALUES (NEW.from_id, 'FRIEND_ACCEPTED', 'Sua solicitação de amizade foi aceita.', false, '/dashboard/membros', NEW.to_id);
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_friend_request_update ON friend_requests;
-- CREATE TRIGGER on_friend_request_update AFTER UPDATE ON friend_requests FOR EACH ROW EXECUTE FUNCTION notify_on_friend_accepted();

-- 4) Alguém curtiu sua resposta no fórum
-- CREATE OR REPLACE FUNCTION notify_on_comment_like()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   comment_author uuid;
-- BEGIN
--   SELECT user_id INTO comment_author FROM post_comments WHERE id = NEW.comment_id;
--   IF comment_author IS NOT NULL AND comment_author <> NEW.user_id THEN
--     INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id, metadata)
--     VALUES (comment_author, 'COMMENT_LIKE', 'Alguém curtiu sua resposta no fórum.', false, '/dashboard/forum/' || (SELECT post_id FROM post_comments WHERE id = NEW.comment_id), NEW.user_id, jsonb_build_object('comment_id', NEW.comment_id));
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_comment_like_insert ON post_comment_likes;
-- CREATE TRIGGER on_comment_like_insert AFTER INSERT ON post_comment_likes FOR EACH ROW EXECUTE FUNCTION notify_on_comment_like();

-- 4b) Alguém curtiu sua postagem (tópico) do fórum
-- CREATE OR REPLACE FUNCTION notify_on_post_like()
-- RETURNS TRIGGER AS $$
-- DECLARE post_author uuid;
-- BEGIN
--   SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
--   IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
--     INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id, metadata)
--     VALUES (post_author, 'LIKE', 'Alguém curtiu sua postagem.', false, '/dashboard/forum/' || NEW.post_id, NEW.user_id, jsonb_build_object('post_id', NEW.post_id));
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_post_like_insert ON post_likes;
-- CREATE TRIGGER on_post_like_insert AFTER INSERT ON post_likes FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();

-- 5) Nova resposta no seu tópico do fórum
-- CREATE OR REPLACE FUNCTION notify_on_forum_reply()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   post_author uuid;
-- BEGIN
--   SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
--   IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
--     INSERT INTO notifications (user_id, type, content, is_read, link, from_user_id, metadata)
--     VALUES (post_author, 'FORUM_REPLY', 'Nova resposta no seu tópico do fórum.', false, '/dashboard/forum/' || NEW.post_id, NEW.user_id, jsonb_build_object('post_id', NEW.post_id));
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_forum_reply_insert ON post_comments;
-- CREATE TRIGGER on_forum_reply_insert AFTER INSERT ON post_comments FOR EACH ROW EXECUTE FUNCTION notify_on_forum_reply();
