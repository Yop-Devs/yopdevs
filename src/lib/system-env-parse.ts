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

export type EnvParseReport = {
  fileName: string | null
  keyCount: number
  keyNames: string[]
  matched: Record<keyof ParsedSystemEnv, boolean>
  flags: ReturnType<typeof flagsFromParsedEnv>
  hints: string[]
}

const ALIASES: Record<keyof Omit<ParsedSystemEnv, 'sb_project_ref'>, string[]> = {
  cf_account_id: ['CF_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCOUNT_ID', 'ACCOUNT_ID'],
  cf_api_token: [
    'CF_API_TOKEN',
    'CLOUDFLARE_API_TOKEN',
    'R2_API_TOKEN',
    'CF_R2_TOKEN',
    'CLOUDFLARE_TOKEN',
    'CF_TOKEN',
  ],
  cf_r2_bucket: [
    'CF_R2_BUCKET',
    'R2_BUCKET',
    'CLOUDFLARE_R2_BUCKET',
    'R2_BUCKET_NAME',
    'S3_BUCKET',
    'BUCKET_NAME',
  ],
  sb_url: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'PUBLIC_SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
    'REACT_APP_SUPABASE_URL',
    'SUPABASE_PROJECT_URL',
    'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
  ],
  sb_anon_key: [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_KEY',
    'SUPABASE_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'REACT_APP_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLIC_KEY',
    'NEXT_PUBLIC_ANON_KEY',
  ],
  sb_service_role_key: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', // raro, mas alguns .env errados usam
    'SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SECRET',
    'SERVICE_KEY',
  ],
  sb_access_token: [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_PAT',
    'SUPABASE_MANAGEMENT_TOKEN',
    'SUPABASE_TOKEN',
    'SUPABASE_PERSONAL_ACCESS_TOKEN',
    'YOP_SUPABASE_ACCESS_TOKEN',
  ],
  resend_api_key: ['RESEND_API_KEY', 'RESEND_KEY'],
}

function stripQuotes(value: string): string {
  let v = value.trim()
  // remove comentário inline simples: KEY=value # comment
  const hash = v.search(/\s+#/)
  if (hash > 0 && !(v.startsWith('"') || v.startsWith("'"))) {
    v = v.slice(0, hash).trim()
  }
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  return v
}

/** Normaliza bytes do arquivo (.env Windows UTF-16 / BOM). */
export function decodeEnvBuffer(buf: ArrayBuffer | Buffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf)

  // UTF-16 LE BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return Buffer.from(bytes).toString('utf16le').replace(/^\uFEFF/, '')
  }
  // UTF-16 BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes)
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const a = swapped[i]
      swapped[i] = swapped[i + 1]
      swapped[i + 1] = a
    }
    return swapped.toString('utf16le').replace(/^\uFEFF/, '')
  }

  // Muitos .env salvos no Notepad como UTF-16 sem BOM (padrão: null bytes entre ASCII)
  let nulls = 0
  const sample = Math.min(bytes.length, 200)
  for (let i = 0; i < sample; i += 1) if (bytes[i] === 0) nulls += 1
  if (sample > 20 && nulls > sample * 0.3) {
    return Buffer.from(bytes).toString('utf16le').replace(/^\uFEFF/, '')
  }

  return Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, '')
}

/** Converte texto .env em mapa KEY -> value (case-insensitive nas chaves). */
export function parseEnvText(content: string): Record<string, string> {
  const map: Record<string, string> = {}
  const normalized = content.replace(/^\uFEFF/, '').replace(/\0/g, '')

  for (const rawLine of normalized.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7).trim()

    const eq = line.indexOf('=')
    if (eq <= 0) continue

    // Aceita KEY, Key, key; remove espaços e caracteres invisíveis
    let key = line.slice(0, eq).trim().replace(/[^\w]/g, '')
    if (!key) continue
    // Normaliza para UPPER_SNAKE para matching
    const upper = key.toUpperCase()
    if (!/^[A-Z_][A-Z0-9_]*$/.test(upper)) continue

    const value = stripQuotes(line.slice(eq + 1))
    if (!value) continue
    map[upper] = value
    // também guarda original se diferente (aliases já são upper)
    map[key] = value
  }
  return map
}

function pick(map: Record<string, string>, aliases: string[]): string | null {
  for (const key of aliases) {
    const v = map[key]?.trim() || map[key.toUpperCase()]?.trim()
    if (v) return v
  }
  return null
}

/** Fallback fuzzy: procura qualquer chave que “pareça” a variável desejada. */
function pickFuzzy(map: Record<string, string>, kind: 'url' | 'anon' | 'service' | 'access' | 'resend'): string | null {
  const entries = Object.entries(map)
  for (const [rawKey, value] of entries) {
    const key = rawKey.toUpperCase()
    if (!value?.trim()) continue

    if (kind === 'url') {
      if (key.includes('SUPABASE') && key.includes('URL') && !key.includes('STORAGE')) return value.trim()
      if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value.trim())) return value.trim()
    }
    if (kind === 'anon') {
      if (key.includes('SUPABASE') && (key.includes('ANON') || key.includes('PUBLIC')) && !key.includes('SERVICE')) {
        return value.trim()
      }
    }
    if (kind === 'service') {
      if (
        (key.includes('SERVICE') && key.includes('ROLE')) ||
        (key.includes('SUPABASE') && key.includes('SERVICE') && !key.includes('URL'))
      ) {
        return value.trim()
      }
    }
    if (kind === 'access') {
      if (key.includes('SUPABASE') && (key.includes('ACCESS') || key.includes('PAT') || key.includes('MANAGEMENT'))) {
        return value.trim()
      }
    }
    if (kind === 'resend') {
      if (key.includes('RESEND') && key.includes('KEY')) return value.trim()
    }
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
  const sb_url = pick(map, ALIASES.sb_url) || pickFuzzy(map, 'url')
  return {
    cf_account_id: pick(map, ALIASES.cf_account_id),
    cf_api_token: pick(map, ALIASES.cf_api_token),
    cf_r2_bucket: pick(map, ALIASES.cf_r2_bucket),
    sb_url,
    sb_anon_key: pick(map, ALIASES.sb_anon_key) || pickFuzzy(map, 'anon'),
    sb_service_role_key: pick(map, ALIASES.sb_service_role_key) || pickFuzzy(map, 'service'),
    sb_project_ref: projectRefFromSupabaseUrl(sb_url),
    sb_access_token: pick(map, ALIASES.sb_access_token) || pickFuzzy(map, 'access'),
    resend_api_key: pick(map, ALIASES.resend_api_key) || pickFuzzy(map, 'resend'),
  }
}

export function flagsFromParsedEnv(parsed: ParsedSystemEnv) {
  return {
    has_cloudflare: Boolean(parsed.cf_account_id && parsed.cf_api_token && parsed.cf_r2_bucket),
    has_supabase: Boolean(parsed.sb_url && (parsed.sb_service_role_key || parsed.sb_anon_key)),
    has_resend: Boolean(parsed.resend_api_key),
  }
}

export function buildEnvParseReport(content: string, fileName: string | null = null): EnvParseReport {
  const map = parseEnvText(content)
  const keyNames = [...new Set(Object.keys(map).filter((k) => /^[A-Z_][A-Z0-9_]*$/.test(k)))].sort()
  const parsed = parseSystemEnv(content)
  const flags = flagsFromParsedEnv(parsed)
  const matched = {
    cf_account_id: Boolean(parsed.cf_account_id),
    cf_api_token: Boolean(parsed.cf_api_token),
    cf_r2_bucket: Boolean(parsed.cf_r2_bucket),
    sb_url: Boolean(parsed.sb_url),
    sb_anon_key: Boolean(parsed.sb_anon_key),
    sb_service_role_key: Boolean(parsed.sb_service_role_key),
    sb_project_ref: Boolean(parsed.sb_project_ref),
    sb_access_token: Boolean(parsed.sb_access_token),
    resend_api_key: Boolean(parsed.resend_api_key),
  }

  const hints: string[] = []
  if (keyNames.length === 0) {
    hints.push('Arquivo sem chaves KEY=valor legíveis (encoding ou formato inválido).')
  }
  if (!matched.sb_url) {
    hints.push('Não achei URL do Supabase (ex.: NEXT_PUBLIC_SUPABASE_URL).')
  }
  if (!matched.sb_service_role_key) {
    hints.push('Não achei SUPABASE_SERVICE_ROLE_KEY (necessário para medir Storage).')
  }
  if (matched.sb_url && matched.sb_service_role_key && !matched.sb_access_token) {
    hints.push(
      'Storage ok. Para medir o DB, cole o PAT (sbp_...) da conta deste projeto no painel — .env de app quase nunca traz isso.',
    )
  }
  if (matched.sb_url && !matched.sb_service_role_key && !matched.sb_anon_key) {
    hints.push('Há URL, mas falta anon key ou service role.')
  }
  if (matched.sb_url && matched.sb_anon_key && !matched.sb_service_role_key) {
    hints.push('Só anon key: Storage pode falhar; cole a service role no painel.')
  }

  return {
    fileName,
    keyCount: keyNames.length,
    keyNames,
    matched,
    flags,
    hints,
  }
}
