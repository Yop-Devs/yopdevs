-- Portfolio público: Rode TUDO no Supabase → SQL Editor (uma vez).
--
-- 1) Coluna portfolio_slug (URL amigável)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_slug text UNIQUE;

-- 2) Slug para Gabriel Costa Carrara
UPDATE profiles
SET portfolio_slug = 'gabriel-costa-carrara'
WHERE full_name = 'Gabriel Costa Carrara';

-- 3) Função que ignora RLS (SECURITY DEFINER) — a API chama essa função
CREATE OR REPLACE FUNCTION get_portfolio_by_slug(slug_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row profiles%ROWTYPE;
  projects_arr json;
  full_name_from_slug text;
BEGIN
  -- Converte slug em nome: gabriel-costa-carrara -> Gabriel Costa Carrara
  full_name_from_slug := initcap(replace(slug_input, '-', ' '));

  SELECT * INTO profile_row FROM profiles
  WHERE portfolio_slug = slug_input
     OR full_name = full_name_from_slug
     OR full_name ILIKE full_name_from_slug
  LIMIT 1;

  IF profile_row.id IS NULL THEN
    RETURN json_build_object('profile', null, 'projects', '[]'::json);
  END IF;

  SELECT coalesce(json_agg(p ORDER BY p.created_at DESC), '[]'::json) INTO projects_arr
  FROM projects p WHERE p.owner_id = profile_row.id;

  RETURN json_build_object(
    'profile', to_json(profile_row),
    'projects', coalesce(projects_arr, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_portfolio_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION get_portfolio_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_by_slug(text) TO service_role;
