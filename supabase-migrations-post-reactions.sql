-- Reações extras em posts: Útil e Interessante (Curtir já está em post_likes)
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('useful', 'interesting')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read post reactions" ON post_reactions;
DROP POLICY IF EXISTS "Auth can insert post reaction" ON post_reactions;
DROP POLICY IF EXISTS "Auth can delete own post reaction" ON post_reactions;
CREATE POLICY "Anyone can read post reactions" ON post_reactions FOR SELECT USING (true);
CREATE POLICY "Auth can insert post reaction" ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can delete own post reaction" ON post_reactions FOR DELETE USING (auth.uid() = user_id);
