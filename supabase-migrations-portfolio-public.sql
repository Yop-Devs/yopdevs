-- Portfolio público: Rode TUDO no Supabase → SQL Editor (uma vez).
--
-- 1) Coluna portfolio_slug (URL amigável)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_slug text UNIQUE;

-- 2) Slug para Gabriel Costa Carrara (qualquer variação do nome)
UPDATE profiles
SET portfolio_slug = 'gabriel-costa-carrara'
WHERE trim(full_name) ILIKE '%Gabriel%Carrara%'
   OR full_name = 'Gabriel Costa Carrara';

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
  full_name_from_slug := trim(initcap(replace(slug_input, '-', ' ')));

  SELECT * INTO profile_row FROM profiles
  WHERE portfolio_slug = slug_input
     OR trim(full_name) = full_name_from_slug
     OR trim(full_name) ILIKE full_name_from_slug
     OR trim(regexp_replace(full_name, '\s+', ' ', 'g')) = full_name_from_slug
  LIMIT 1;

  -- Fallback: slug gabriel-costa-carrara — busca por Gabriel + Carrara no nome
  IF profile_row.id IS NULL AND slug_input = 'gabriel-costa-carrara' THEN
    SELECT * INTO profile_row FROM profiles
    WHERE trim(full_name) ILIKE '%Gabriel%Carrara%'
    LIMIT 1;
    IF profile_row.id IS NOT NULL THEN
      UPDATE profiles SET portfolio_slug = 'gabriel-costa-carrara' WHERE id = profile_row.id;
    END IF;
  END IF;

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
