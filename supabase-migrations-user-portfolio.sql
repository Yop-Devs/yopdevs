-- Sistema de Portfólio de Usuário — YOP Devs
-- Executar no Supabase → SQL Editor (uma vez).
-- Não quebra o sistema atual (profiles, projects, etc.).

-- ========== 1) Tabelas ==========

-- Portfólio principal (um por usuário)
CREATE TABLE IF NOT EXISTS user_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  headline text,
  bio text,
  location text,
  phone text,
  website text,
  instagram text,
  github text,
  linkedin text,
  avatar_url text,
  banner_url text,
  available_for_work boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_slug CHECK (username ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR length(username) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);

-- Skills do portfólio
CREATE TABLE IF NOT EXISTS portfolio_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  UNIQUE(user_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_skills_user_id ON portfolio_skills(user_id);

-- Projetos do portfólio
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  project_url text,
  image_url text,
  tech_stack text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_user_id ON portfolio_projects(user_id);

-- Experiências
CREATE TABLE IF NOT EXISTS portfolio_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  company text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_experiences_user_id ON portfolio_experiences(user_id);

-- ========== 2) RLS ==========

ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_experiences ENABLE ROW LEVEL SECURITY;

-- user_portfolios: usuário edita o próprio; todos podem ler (portfólio público)
DROP POLICY IF EXISTS "user_portfolios_select_public" ON user_portfolios;
CREATE POLICY "user_portfolios_select_public" ON user_portfolios FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "user_portfolios_insert_own" ON user_portfolios;
CREATE POLICY "user_portfolios_insert_own" ON user_portfolios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_portfolios_update_own" ON user_portfolios;
CREATE POLICY "user_portfolios_update_own" ON user_portfolios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_portfolios_delete_own" ON user_portfolios;
CREATE POLICY "user_portfolios_delete_own" ON user_portfolios FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- portfolio_skills: mesmo padrão
DROP POLICY IF EXISTS "portfolio_skills_select_public" ON portfolio_skills;
CREATE POLICY "portfolio_skills_select_public" ON portfolio_skills FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "portfolio_skills_all_own" ON portfolio_skills;
CREATE POLICY "portfolio_skills_all_own" ON portfolio_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- portfolio_projects: mesmo padrão
DROP POLICY IF EXISTS "portfolio_projects_select_public" ON portfolio_projects;
CREATE POLICY "portfolio_projects_select_public" ON portfolio_projects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "portfolio_projects_all_own" ON portfolio_projects;
CREATE POLICY "portfolio_projects_all_own" ON portfolio_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- portfolio_experiences: mesmo padrão
DROP POLICY IF EXISTS "portfolio_experiences_select_public" ON portfolio_experiences;
CREATE POLICY "portfolio_experiences_select_public" ON portfolio_experiences FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "portfolio_experiences_all_own" ON portfolio_experiences;
CREATE POLICY "portfolio_experiences_all_own" ON portfolio_experiences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== 3) Trigger updated_at ==========

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_portfolios_updated_at ON user_portfolios;
CREATE TRIGGER user_portfolios_updated_at
  BEFORE UPDATE ON user_portfolios FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
