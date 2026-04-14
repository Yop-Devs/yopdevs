-- Agenda pessoal (calendário / atividades) — YOP Devs
-- Executar no Supabase → SQL Editor (uma vez).

CREATE TABLE IF NOT EXISTS user_agenda_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_date date NOT NULL,
  activity_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_agenda_activities_user_date
  ON user_agenda_activities (user_id, activity_date);

CREATE OR REPLACE FUNCTION public.set_user_agenda_activities_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_agenda_activities_updated_at ON user_agenda_activities;
CREATE TRIGGER tr_user_agenda_activities_updated_at
  BEFORE UPDATE ON user_agenda_activities
  FOR EACH ROW EXECUTE PROCEDURE public.set_user_agenda_activities_updated_at();

ALTER TABLE user_agenda_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_agenda_select_own" ON user_agenda_activities;
CREATE POLICY "user_agenda_select_own" ON user_agenda_activities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_agenda_insert_own" ON user_agenda_activities;
CREATE POLICY "user_agenda_insert_own" ON user_agenda_activities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_agenda_update_own" ON user_agenda_activities;
CREATE POLICY "user_agenda_update_own" ON user_agenda_activities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_agenda_delete_own" ON user_agenda_activities;
CREATE POLICY "user_agenda_delete_own" ON user_agenda_activities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
