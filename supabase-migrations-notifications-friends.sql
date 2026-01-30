-- Notificações: colunas para link e contexto (rode no SQL Editor do Supabase)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES auth.users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;

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

CREATE POLICY "Users can see own requests" ON friend_requests FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "Users can insert own outgoing" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "Users can update incoming" ON friend_requests FOR UPDATE USING (auth.uid() = to_id);

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

CREATE POLICY "Anyone can read likes" ON post_comment_likes FOR SELECT USING (true);
CREATE POLICY "Auth can insert like" ON post_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can delete own like" ON post_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: ao receber mensagem, criar notificação com link para o chat (opcional; ajuste se já tiver trigger em messages)
-- CREATE OR REPLACE FUNCTION notify_on_new_message()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO notifications (user_id, type, content, is_read, link)
--   VALUES (NEW.receiver_id, 'CHAT', 'Nova mensagem no chat.', false, '/dashboard/chat/' || NEW.sender_id);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS on_message_insert ON messages;
-- CREATE TRIGGER on_message_insert AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();
