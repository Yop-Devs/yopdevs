/** Parser de arquivos .env anexados aos sistemas. */

export type ParsedSystemEnv = {
  // Cloudflare
  cf_account_id: string | null
  cf_api_token: string | null
  cf_r2_bucket: string | null
  // Supabase
  sb_url: string | null
  sb_anon_key: string | null
  sb_service_role_key: string | null
  sb_project_ref: string | null
  sb_access_token: string | null
  // Resend
  resend_api_key: string | null
}

const ALIASES: Record<keyof Omit<ParsedSystemEnv, 'sb_project_ref'>, string[]> = {
  cf_account_id: ['CF_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCOUNT_ID'],
  cf_api_token: ['CF_API_TOKEN', 'CLOUDFLARE_API_TOKEN', 'R2_API_TOKEN', 'CF_R2_TOKEN'],
  cf_r2_bucket: ['CF_R2_BUCKET', 'R2_BUCKET', 'CLOUDFLARE_R2_BUCKET', 'R2_BUCKET_NAME'],
  sb_url: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
  sb_anon_key: ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
  sb_service_role_key: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'],
  sb_access_token: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PAT', 'SUPABASE_MANAGEMENT_TOKEN'],
  resend_api_key: ['RESEND_API_KEY'],
}

function stripQuotes(value: string): string {
  const v = value.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  return v
}

/** Converte texto .env em mapa KEY -> value. */
export function parseEnvText(content: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const cleaned = line.startsWith('export ') ? line.slice(7).trim() : line
    const eq = cleaned.indexOf('=')
    if (eq <= 0) continue
    const key = cleaned.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    map[key] = stripQuotes(cleaned.slice(eq + 1))
  }
  return map
}

function pick(map: Record<string, string>, aliases: string[]): string | null {
  for (const key of aliases) {
    const v = map[key]?.trim()
    if (v) return v
  }
  return null
}

export function projectRefFromSupabaseUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

export function parseSystemEnv(content: string): ParsedSystemEnv {
  const map = parseEnvText(content)
  const sb_url = pick(map, ALIASES.sb_url)
  return {
    cf_account_id: pick(map, ALIASES.cf_account_id),
    cf_api_token: pick(map, ALIASES.cf_api_token),
    cf_r2_bucket: pick(map, ALIASES.cf_r2_bucket),
    sb_url,
    sb_anon_key: pick(map, ALIASES.sb_anon_key),
    sb_service_role_key: pick(map, ALIASES.sb_service_role_key),
    sb_project_ref: projectRefFromSupabaseUrl(sb_url),
    sb_access_token: pick(map, ALIASES.sb_access_token),
    resend_api_key: pick(map, ALIASES.resend_api_key),
  }
}

export function flagsFromParsedEnv(parsed: ParsedSystemEnv) {
  return {
    has_cloudflare: Boolean(parsed.cf_account_id && parsed.cf_api_token && parsed.cf_r2_bucket),
    has_supabase: Boolean(parsed.sb_url && (parsed.sb_service_role_key || parsed.sb_anon_key)),
    has_resend: Boolean(parsed.resend_api_key),
  }
}
