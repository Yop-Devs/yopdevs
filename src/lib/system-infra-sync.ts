import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_SYSTEM_BUCKET } from '@/lib/admin-systems'
import { todayIsoInCuiaba } from '@/lib/finance-daily-alerts'
import { flagsFromParsedEnv, parseSystemEnv, projectRefFromSupabaseUrl, decodeEnvBuffer, buildEnvParseReport, type EnvParseReport, type ParsedSystemEnv } from '@/lib/system-env-parse'
import {
  formatBytes,
  isTracked,
  toPublicIntegration,
  usagePct,
  type SystemIntegrationPublic,
  type SystemIntegrationRow,
  type UsageSnapshotPublic,
} from '@/lib/system-infra-types'
import { sendTelegramAlert } from '@/lib/telegram'

export type { SystemIntegrationPublic, SystemIntegrationRow }
export { formatBytes, toPublicIntegration, usagePct }

async function downloadLatestEnv(
  yop: SupabaseClient,
  systemId: string,
): Promise<{ content: string; fileName: string } | null> {
  const { data: files, error } = await yop
    .from('yop_admin_system_files')
    .select('file_path, file_name, kind, created_at')
    .eq('system_id', systemId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!files?.length) return null

  // Prefere kind=env; senão arquivo cujo nome parece .env
  const file =
    files.find((f) => f.kind === 'env') ||
    files.find((f) => /\.env/i.test(f.file_name || '') || /^env/i.test(f.file_name || '')) ||
    null

  if (!file?.file_path) return null

  const { data: blob, error: dlError } = await yop.storage.from(ADMIN_SYSTEM_BUCKET).download(file.file_path)
  if (dlError || !blob) throw new Error(dlError?.message || 'Falha ao baixar .env')
  const buf = Buffer.from(await blob.arrayBuffer())
  const content = decodeEnvBuffer(buf)
  return { content, fileName: file.file_name }
}

export async function importEnvForSystem(
  yop: SupabaseClient,
  systemId: string,
): Promise<{
  parsed: ParsedSystemEnv
  flags: ReturnType<typeof flagsFromParsedEnv>
  report: EnvParseReport
}> {
  const downloaded = await downloadLatestEnv(yop, systemId)
  if (!downloaded) {
    throw new Error('Nenhum arquivo .env anexado a este sistema.')
  }

  const { data: existing } = await yop
    .from('yop_admin_system_integrations')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle()

  const report = buildEnvParseReport(downloaded.content, downloaded.fileName)
  const parsed = parseSystemEnv(downloaded.content)
  const now = new Date().toISOString()
  const prev = (existing ?? null) as SystemIntegrationRow | null

  const merged = {
    cf_account_id: parsed.cf_account_id ?? prev?.cf_account_id ?? null,
    cf_api_token: parsed.cf_api_token ?? prev?.cf_api_token ?? null,
    cf_r2_bucket: parsed.cf_r2_bucket ?? prev?.cf_r2_bucket ?? null,
    sb_url: normalizeSupabaseUrl(parsed.sb_url ?? prev?.sb_url ?? null),
    sb_anon_key: parsed.sb_anon_key ?? prev?.sb_anon_key ?? null,
    sb_service_role_key: parsed.sb_service_role_key ?? prev?.sb_service_role_key ?? null,
    sb_project_ref: parsed.sb_project_ref ?? prev?.sb_project_ref ?? null,
    // Não apaga secrets já salvos se o .env do cliente não tiver essas chaves
    sb_access_token: parsed.sb_access_token ?? prev?.sb_access_token ?? null,
    resend_api_key: parsed.resend_api_key ?? prev?.resend_api_key ?? null,
  }

  const flags = flagsFromParsedEnv(merged)

  // Só liga tracking se achou credenciais; se não achou, mantém o que o usuário definiu (ou off)
  const track_cloudflare = flags.has_cloudflare ? true : Boolean(prev?.track_cloudflare)
  const track_supabase = flags.has_supabase
    ? true
    : prev?.track_supabase != null
      ? Boolean(prev.track_supabase)
      : true
  const track_resend = flags.has_resend ? true : Boolean(prev?.track_resend)

  const payload = {
    system_id: systemId,
    ...flags,
    track_cloudflare,
    track_supabase,
    track_resend,
    ...merged,
    env_parsed_at: now,
    last_error:
      report.hints.length && !flags.has_supabase && !flags.has_cloudflare && !flags.has_resend
        ? report.hints.join(' | ')
        : null,
    updated_at: now,
  }

  const { error } = await yop.from('yop_admin_system_integrations').upsert(payload, { onConflict: 'system_id' })
  if (error) throw new Error(error.message)

  return { parsed, flags, report }
}

export type ManualCredentialsInput = {
  cf_account_id?: string | null
  cf_api_token?: string | null
  cf_r2_bucket?: string | null
  sb_url?: string | null
  sb_anon_key?: string | null
  sb_service_role_key?: string | null
  sb_access_token?: string | null
  resend_api_key?: string | null
  track_cloudflare?: boolean
  track_supabase?: boolean
  track_resend?: boolean
  clear_cf_api_token?: boolean
  clear_sb_service_role_key?: boolean
  clear_sb_access_token?: boolean
  clear_sb_anon_key?: boolean
  clear_resend_api_key?: boolean
}

function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t === '••••' || t.startsWith('••••')) return null
  return t
}

/** Corrige typos comuns (ex.: .supabase.cc) e remove barra final. */
export function normalizeSupabaseUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  let u = url.trim().replace(/\/+$/, '')
  u = u.replace(/\.supabase\.cc\b/gi, '.supabase.co')
  try {
    const parsed = new URL(u)
    if (!parsed.hostname.toLowerCase().endsWith('.supabase.co')) {
      // ainda aceita; projectRefFromSupabaseUrl valida o ref
    }
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return u
  }
}

/** Salva credenciais digitadas no painel (sem .env). Campos vazios / •••• mantêm o valor atual. */
export async function saveManualCredentials(
  yop: SupabaseClient,
  systemId: string,
  input: ManualCredentialsInput,
): Promise<SystemIntegrationPublic> {
  const { data: existing } = await yop
    .from('yop_admin_system_integrations')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle()

  const prev = (existing ?? null) as SystemIntegrationRow | null
  const now = new Date().toISOString()

  const cf_account_id = cleanText(input.cf_account_id) ?? prev?.cf_account_id ?? null
  const cf_r2_bucket = cleanText(input.cf_r2_bucket) ?? prev?.cf_r2_bucket ?? null
  const cf_api_token = input.clear_cf_api_token
    ? null
    : cleanText(input.cf_api_token) ?? prev?.cf_api_token ?? null

  const sb_url = normalizeSupabaseUrl(cleanText(input.sb_url) ?? prev?.sb_url ?? null)
  const sb_anon_key = input.clear_sb_anon_key
    ? null
    : cleanText(input.sb_anon_key) ?? prev?.sb_anon_key ?? null
  const sb_service_role_key = input.clear_sb_service_role_key
    ? null
    : cleanText(input.sb_service_role_key) ?? prev?.sb_service_role_key ?? null
  const sb_access_token = input.clear_sb_access_token
    ? null
    : cleanText(input.sb_access_token) ?? prev?.sb_access_token ?? null
  const sb_project_ref = projectRefFromSupabaseUrl(sb_url) ?? prev?.sb_project_ref ?? null

  const resend_api_key = input.clear_resend_api_key
    ? null
    : cleanText(input.resend_api_key) ?? prev?.resend_api_key ?? null

  const flags = flagsFromParsedEnv({
    cf_account_id,
    cf_api_token,
    cf_r2_bucket,
    sb_url,
    sb_anon_key,
    sb_service_role_key,
    sb_project_ref,
    sb_access_token,
    resend_api_key,
  })

  const track_cloudflare =
    typeof input.track_cloudflare === 'boolean'
      ? input.track_cloudflare
      : flags.has_cloudflare || isTracked(prev?.track_cloudflare, false)
  const track_supabase =
    typeof input.track_supabase === 'boolean'
      ? input.track_supabase
      : flags.has_supabase || isTracked(prev?.track_supabase, true)
  const track_resend =
    typeof input.track_resend === 'boolean'
      ? input.track_resend
      : flags.has_resend || isTracked(prev?.track_resend, false)

  const payload = {
    system_id: systemId,
    ...flags,
    track_cloudflare,
    track_supabase,
    track_resend,
    cf_account_id,
    cf_api_token,
    cf_r2_bucket,
    sb_url,
    sb_anon_key,
    sb_service_role_key,
    sb_project_ref,
    sb_access_token,
    resend_api_key,
    last_error: null,
    updated_at: now,
    resend_daily_limit: prev?.resend_daily_limit ?? 100,
    resend_monthly_limit: prev?.resend_monthly_limit ?? 3000,
  }

  const { error } = await yop.from('yop_admin_system_integrations').upsert(payload, { onConflict: 'system_id' })
  if (error) throw new Error(error.message)

  const pub = await getPublicIntegration(yop, systemId)
  if (!pub) throw new Error('Falha ao salvar credenciais.')
  return pub
}

async function loadSnapshots(
  yop: SupabaseClient,
  systemId: string,
  days = 45,
): Promise<UsageSnapshotPublic[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const sinceIso = since.toISOString().slice(0, 10)

  const { data, error } = await yop
    .from('yop_admin_system_usage_snapshots')
    .select('day, cf_storage_used_bytes, sb_storage_used_bytes, sb_db_used_bytes, resend_sent_today')
    .eq('system_id', systemId)
    .gte('day', sinceIso)
    .order('day', { ascending: true })

  if (error) {
    // Tabela ainda não criada
    console.warn('[usage-snapshots]', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    day: String(row.day),
    cf_storage_used_bytes: row.cf_storage_used_bytes != null ? Number(row.cf_storage_used_bytes) : null,
    sb_storage_used_bytes: row.sb_storage_used_bytes != null ? Number(row.sb_storage_used_bytes) : null,
    sb_db_used_bytes: row.sb_db_used_bytes != null ? Number(row.sb_db_used_bytes) : null,
    resend_sent_today: row.resend_sent_today != null ? Number(row.resend_sent_today) : null,
  }))
}

async function saveSnapshot(
  yop: SupabaseClient,
  systemId: string,
  day: string,
  snapshot: {
    cf_storage_used_bytes: number | null
    sb_storage_used_bytes: number | null
    sb_db_used_bytes: number | null
    resend_sent_today: number | null
  },
) {
  const { error } = await yop.from('yop_admin_system_usage_snapshots').upsert(
    {
      system_id: systemId,
      day,
      ...snapshot,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'system_id,day' },
  )
  if (error) console.warn('[usage-snapshots upsert]', error.message)
}

/** Preferência: endpoint /usage (rápido e preciso). Fallback: listagem de objetos. */
async function measureR2Usage(input: {
  accountId: string
  apiToken: string
  bucket: string
}): Promise<number> {
  const usageUrl = `https://api.cloudflare.com/client/v4/accounts/${input.accountId}/r2/buckets/${encodeURIComponent(input.bucket)}/usage`
  const usageRes = await fetch(usageUrl, {
    headers: { Authorization: `Bearer ${input.apiToken}` },
  })
  const usageJson = (await usageRes.json()) as {
    success?: boolean
    errors?: { message?: string }[]
    result?: { payloadSize?: string | number; metadataSize?: string | number }
  }

  if (usageRes.ok && usageJson.success !== false && usageJson.result) {
    const payload = Number(usageJson.result.payloadSize ?? 0)
    const meta = Number(usageJson.result.metadataSize ?? 0)
    if (Number.isFinite(payload)) return payload + (Number.isFinite(meta) ? meta : 0)
  }

  // Fallback: listar objetos
  let cursor: string | undefined
  let total = 0
  let guard = 0
  const listErrors: string[] = []

  do {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${input.accountId}/r2/buckets/${encodeURIComponent(input.bucket)}/objects`,
    )
    url.searchParams.set('per_page', '1000')
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${input.apiToken}` },
    })
    const json = (await res.json()) as {
      success?: boolean
      errors?: { message?: string }[]
      result?: { objects?: { size?: number }[]; truncated?: boolean; cursors?: { after?: string } }
    }

    if (!res.ok || json.success === false) {
      const msg =
        json.errors?.[0]?.message ||
        usageJson.errors?.[0]?.message ||
        `Cloudflare R2 HTTP ${res.status}`
      listErrors.push(msg)
      break
    }

    for (const obj of json.result?.objects ?? []) {
      total += Number(obj.size ?? 0)
    }

    cursor = json.result?.truncated ? json.result?.cursors?.after : undefined
    guard += 1
  } while (cursor && guard < 50)

  if (listErrors.length && total === 0) {
    throw new Error(listErrors[0])
  }

  return total
}

async function sumStorageBucket(
  client: SupabaseClient,
  bucket: string,
  prefix = '',
): Promise<number> {
  let total = 0
  let offset = 0
  const limit = 100
  let guard = 0
  while (guard < 80) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const item of data) {
      // Pastas: sem id; arquivos: com id
      const isFolder = item.id == null
      if (isFolder && item.name) {
        total += await sumStorageBucket(client, bucket, prefix ? `${prefix}/${item.name}` : item.name)
      } else {
        const size = Number((item.metadata as { size?: number } | null)?.size ?? 0)
        if (Number.isFinite(size)) total += size
      }
    }
    if (data.length < limit) break
    offset += limit
    guard += 1
  }
  return total
}

async function measureSupabaseStorage(serviceUrl: string, serviceKey: string): Promise<number> {
  const url = serviceUrl.trim().replace(/\.supabase\.cc\b/gi, '.supabase.co').replace(/\/+$/, '')
  const run = async () => {
    const client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1) Tenta schema storage.objects (mais preciso)
    const storageClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'storage' },
    })

    const pageSize = 1000
    let offset = 0
    let total = 0
    let guard = 0
    let usedObjectsTable = false

    while (guard < 30) {
      const { data: rows, error: qError } = await storageClient
        .from('objects')
        .select('metadata')
        .range(offset, offset + pageSize - 1)

      if (qError) break
      usedObjectsTable = true
      if (!rows?.length) break

      for (const row of rows as { metadata?: { size?: number | string } | null }[]) {
        const size = Number(row.metadata?.size ?? 0)
        if (Number.isFinite(size)) total += size
      }

      if (rows.length < pageSize) break
      offset += pageSize
      guard += 1
    }

    if (usedObjectsTable) return total

    // 2) Fallback: listBuckets + list recursivo
    const { data: buckets, error: bErr } = await client.storage.listBuckets()
    if (bErr) throw new Error(bErr.message)
    for (const bucket of buckets ?? []) {
      total += await sumStorageBucket(client, bucket.name)
    }
    return total
  }

  return Promise.race([
    run(),
    new Promise<number>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase storage: timeout ao medir bucket (25s)')), 25_000)
    }),
  ])
}

async function runSupabaseManagementQuery(
  projectRef: string,
  accessToken: string,
  query: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, read_only: true }),
    signal: AbortSignal.timeout(20_000),
  })

  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`Supabase query: ${res.status} ${text.slice(0, 180)}`)
  }

  try {
    const json = JSON.parse(text) as
      | Record<string, unknown>[]
      | { data?: Record<string, unknown>[] }
      | { result?: Record<string, unknown>[] }

    const rows = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown[] }).data)
        ? (json as { data: Record<string, unknown>[] }).data
        : Array.isArray((json as { result?: unknown[] }).result)
          ? (json as { result: Record<string, unknown>[] }).result
          : []

    return rows[0] ?? null
  } catch {
    throw new Error('Supabase query: resposta inválida')
  }
}

/** Mede DB + Storage numa query só (Management API / PAT) — bem mais rápido que listar buckets. */
async function measureSupabaseViaPat(
  projectRef: string | null,
  accessToken: string | null,
): Promise<{ dbBytes: number | null; storageBytes: number | null }> {
  if (!projectRef || !accessToken) return { dbBytes: null, storageBytes: null }

  const row = await runSupabaseManagementQuery(
    projectRef,
    accessToken,
    `
      select
        pg_database_size(current_database())::bigint as db_size,
        coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0)::bigint as storage_size;
    `.replace(/\s+/g, ' ').trim(),
  )

  const dbBytes = Number(row?.db_size)
  const storageBytes = Number(row?.storage_size)
  return {
    dbBytes: Number.isFinite(dbBytes) ? dbBytes : null,
    storageBytes: Number.isFinite(storageBytes) ? storageBytes : null,
  }
}

async function measureSupabaseDbBytes(
  projectRef: string | null,
  accessToken: string | null,
): Promise<number | null> {
  if (!projectRef || !accessToken) return null
  const row = await runSupabaseManagementQuery(
    projectRef,
    accessToken,
    'select pg_database_size(current_database())::bigint as size;',
  )
  const size = Number(row?.size)
  if (Number.isFinite(size)) return size
  throw new Error('Supabase DB: resposta sem tamanho reconhecível')
}

/** PAT da conta YOP (Management API) — mede DB de qualquer projeto acessível. */
export function getYopSupabaseAccessToken(): string | null {
  const token =
    process.env.YOP_SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    ''
  return token || null
}

function resolveSbAccessToken(integ: SystemIntegrationRow): string | null {
  return integ.sb_access_token?.trim() || getYopSupabaseAccessToken()
}

async function measureResendUsage(
  apiKey: string,
  dayIso: string,
): Promise<{ today: number; month: number }> {
  const startDay = new Date(`${dayIso}T00:00:00-04:00`)
  const endDay = new Date(`${dayIso}T23:59:59.999-04:00`)
  const monthStart = new Date(startDay)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  let today = 0
  let month = 0
  let after: string | undefined
  let guard = 0

  // Pagina até ~1000 e-mails recentes (suficiente para cotas free)
  do {
    const url = new URL('https://api.resend.com/emails')
    url.searchParams.set('limit', '100')
    if (after) url.searchParams.set('after', after)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Resend auth: ${text.slice(0, 200) || res.status}`)
      }
      // Listagem pode ser restrita — não zera sync
      console.warn('[resend]', res.status, text.slice(0, 200))
      break
    }

    const json = (await res.json()) as {
      data?: { id?: string; created_at?: string }[]
      has_more?: boolean
    }
    const batch = json.data ?? []
    if (!batch.length) break

    for (const item of batch) {
      if (!item.created_at) continue
      const t = new Date(item.created_at).getTime()
      if (t >= startDay.getTime() && t <= endDay.getTime()) today += 1
      if (t >= monthStart.getTime() && t <= endDay.getTime()) month += 1
    }

    const oldest = batch[batch.length - 1]
    // Se o mais antigo já é antes do mês, para
    if (oldest?.created_at && new Date(oldest.created_at).getTime() < monthStart.getTime()) break

    after = oldest?.id
    guard += 1
    if (!json.has_more && batch.length < 100) break
  } while (after && guard < 10)

  return { today, month }
}

function monthSentFromSnapshots(snapshots: UsageSnapshotPublic[], dayIso: string, todayCount: number): number {
  const monthPrefix = dayIso.slice(0, 7) // YYYY-MM
  let sum = 0
  for (const s of snapshots) {
    if (!s.day.startsWith(monthPrefix)) continue
    if (s.day === dayIso) continue
    sum += Number(s.resend_sent_today ?? 0)
  }
  return sum + todayCount
}

export async function getPublicIntegration(
  yop: SupabaseClient,
  systemId: string,
): Promise<SystemIntegrationPublic | null> {
  const { data, error } = await yop
    .from('yop_admin_system_integrations')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const snapshots = await loadSnapshots(yop, systemId)
  return toPublicIntegration(data as SystemIntegrationRow, snapshots)
}

export async function syncInfraForSystem(
  yop: SupabaseClient,
  systemId: string,
  options?: { importEnvFirst?: boolean },
): Promise<SystemIntegrationPublic> {
  const errors: string[] = []

  // Só tenta .env se pedido e se existir arquivo anexado
  if (options?.importEnvFirst !== false) {
    try {
      const downloaded = await downloadLatestEnv(yop, systemId)
      if (downloaded) {
        await importEnvForSystem(yop, systemId)
      }
    } catch (err) {
      const { data: existing } = await yop
        .from('yop_admin_system_integrations')
        .select('system_id')
        .eq('system_id', systemId)
        .maybeSingle()
      if (!existing) throw err
      errors.push(err instanceof Error ? err.message : 'Falha ao importar .env')
    }
  }

  const { data: row, error } = await yop
    .from('yop_admin_system_integrations')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!row) throw new Error('Integração não encontrada. Anexe um .env e importe.')

  const integ = row as SystemIntegrationRow
  const trackCf = isTracked(integ.track_cloudflare, false)
  const trackSb = isTracked(integ.track_supabase, true)
  const trackResend = isTracked(integ.track_resend, false)

  const patch: Partial<SystemIntegrationRow> = {
    updated_at: new Date().toISOString(),
  }
  const now = new Date().toISOString()
  const today = todayIsoInCuiaba()
  let resendToday: number | null = null

  if (trackCf) {
    const canCf = Boolean(integ.cf_account_id && integ.cf_api_token && integ.cf_r2_bucket)
    if (canCf) {
      try {
        const used = await measureR2Usage({
          accountId: integ.cf_account_id!,
          apiToken: integ.cf_api_token!,
          bucket: integ.cf_r2_bucket!,
        })
        patch.cf_storage_used_bytes = used
        patch.cf_synced_at = now
        patch.has_cloudflare = true
      } catch (err) {
        errors.push(`Cloudflare: ${err instanceof Error ? err.message : 'erro'}`)
      }
    } else {
      const miss = [
        !integ.cf_account_id ? 'account id' : null,
        !integ.cf_api_token ? 'API token' : null,
        !integ.cf_r2_bucket ? 'bucket' : null,
      ].filter(Boolean)
      errors.push(`Cloudflare: faltam chaves (${miss.join(', ')})`)
    }
  }

  if (trackSb) {
    const projectRef = integ.sb_project_ref || projectRefFromSupabaseUrl(integ.sb_url)
    const accessToken = resolveSbAccessToken(integ)
    let measuredViaPat = false

    // Caminho rápido: PAT + SQL (DB + Storage juntos)
    if (projectRef && accessToken) {
      try {
        const { dbBytes, storageBytes } = await measureSupabaseViaPat(projectRef, accessToken)
        if (dbBytes != null) patch.sb_db_used_bytes = dbBytes
        if (storageBytes != null) patch.sb_storage_used_bytes = storageBytes
        if (dbBytes != null || storageBytes != null) {
          patch.sb_project_ref = projectRef
          patch.sb_synced_at = now
          patch.has_supabase = true
          measuredViaPat = true
        }
      } catch (err) {
        errors.push(`Supabase (PAT): ${err instanceof Error ? err.message : 'erro'}`)
      }
    }

    // Fallback Storage: service role listando objetos (pode ser lento)
    if (patch.sb_storage_used_bytes == null) {
      const canSbStorage = Boolean(integ.sb_url && integ.sb_service_role_key)
      if (canSbStorage) {
        try {
          const used = await measureSupabaseStorage(integ.sb_url!, integ.sb_service_role_key!)
          patch.sb_storage_used_bytes = used
          patch.sb_synced_at = now
          patch.has_supabase = true
        } catch (err) {
          errors.push(`Supabase storage: ${err instanceof Error ? err.message : 'erro'}`)
        }
      } else if (!measuredViaPat) {
        errors.push('Supabase storage: falta SUPABASE_SERVICE_ROLE_KEY ou PAT')
      }
    }

    // Fallback DB só se PAT path não preencheu
    if (patch.sb_db_used_bytes == null && projectRef && accessToken && !measuredViaPat) {
      try {
        const dbUsed = await measureSupabaseDbBytes(projectRef, accessToken)
        if (dbUsed != null) {
          patch.sb_db_used_bytes = dbUsed
          patch.sb_project_ref = projectRef
          patch.sb_synced_at = now
          patch.has_supabase = true
        }
      } catch (err) {
        errors.push(`Supabase DB: ${err instanceof Error ? err.message : 'erro'}`)
      }
    } else if (patch.sb_db_used_bytes == null && (integ.sb_url || integ.has_supabase) && !accessToken) {
      errors.push(
        'Supabase DB: cole o Access Token (PAT sbp_...) da MESMA conta deste projeto — Account → Access Tokens',
      )
    }
  }

  if (trackResend) {
    if (integ.resend_api_key) {
      try {
        const usage = await measureResendUsage(integ.resend_api_key, today)
        resendToday = usage.today
        patch.resend_sent_today = usage.today
        patch.resend_day = today
        patch.resend_synced_at = now
        patch.has_resend = true

        const snaps = await loadSnapshots(yop, systemId)
        const fromSnaps = monthSentFromSnapshots(snaps, today, usage.today)
        patch.resend_sent_month = Math.max(fromSnaps, usage.month)
        if (!integ.resend_monthly_limit) patch.resend_monthly_limit = 3000
        if (!integ.resend_daily_limit) patch.resend_daily_limit = 100
      } catch (err) {
        if (integ.resend_day !== today) {
          patch.resend_sent_today = 0
          patch.resend_day = today
        }
        errors.push(`Resend: ${err instanceof Error ? err.message : 'erro'}`)
      }
    } else {
      errors.push('Resend: falta RESEND_API_KEY')
    }
  }

  patch.last_error = errors.length ? errors.join(' | ') : null

  const { data: updated, error: upError } = await yop
    .from('yop_admin_system_integrations')
    .update(patch)
    .eq('system_id', systemId)
    .select('*')
    .single()

  if (upError) throw new Error(upError.message)

  const finalRow = updated as SystemIntegrationRow
  await saveSnapshot(yop, systemId, today, {
    cf_storage_used_bytes: finalRow.cf_storage_used_bytes,
    sb_storage_used_bytes: finalRow.sb_storage_used_bytes,
    sb_db_used_bytes: finalRow.sb_db_used_bytes,
    resend_sent_today: resendToday ?? finalRow.resend_sent_today,
  })

  const snapshots = await loadSnapshots(yop, systemId)
  return toPublicIntegration(finalRow, snapshots)
}

export async function syncAllSystemsInfra(yop: SupabaseClient): Promise<{
  synced: number
  alerts: string[]
  errors: string[]
}> {
  const { data: systems, error } = await yop.from('yop_admin_systems').select('id, name, company_name')
  if (error) throw new Error(error.message)

  let synced = 0
  const alerts: string[] = []
  const errors: string[] = []

  for (const system of systems ?? []) {
    try {
      const pub = await syncInfraForSystem(yop, system.id, { importEnvFirst: true })
      synced += 1
      const label = system.company_name || system.name

      const cfPct = usagePct(pub.cf_storage_used_bytes, pub.cf_storage_limit_bytes)
      if (pub.track_cloudflare && pub.has_cloudflare && cfPct != null && cfPct >= 80) {
        alerts.push(
          `☁️ Cloudflare R2 · ${label}\nUso: ${formatBytes(pub.cf_storage_used_bytes)} / ${formatBytes(pub.cf_storage_limit_bytes)} (${cfPct}%)`,
        )
      }

      const sbStorPct = usagePct(pub.sb_storage_used_bytes, pub.sb_storage_limit_bytes)
      if (pub.track_supabase && pub.has_supabase && sbStorPct != null && sbStorPct >= 80) {
        alerts.push(
          `🗄️ Supabase Storage · ${label}\nUso: ${formatBytes(pub.sb_storage_used_bytes)} / ${formatBytes(pub.sb_storage_limit_bytes)} (${sbStorPct}%)`,
        )
      }

      const sbDbPct = usagePct(pub.sb_db_used_bytes, pub.sb_db_limit_bytes)
      if (pub.track_supabase && pub.has_supabase && sbDbPct != null && sbDbPct >= 80) {
        alerts.push(
          `🗃️ Supabase DB · ${label}\nUso: ${formatBytes(pub.sb_db_used_bytes)} / ${formatBytes(pub.sb_db_limit_bytes)} (${sbDbPct}%)`,
        )
      }

      const resPct = usagePct(pub.resend_sent_today, pub.resend_daily_limit)
      if (pub.track_resend && pub.has_resend && resPct != null && resPct >= 80) {
        alerts.push(
          `✉️ Resend · ${label}\nE-mails hoje: ${pub.resend_sent_today} / ${pub.resend_daily_limit} (${resPct}%)`,
        )
      }

      const resMonthPct = usagePct(pub.resend_sent_month, pub.resend_monthly_limit)
      if (pub.track_resend && pub.has_resend && resMonthPct != null && resMonthPct >= 80) {
        alerts.push(
          `✉️ Resend mês · ${label}\nE-mails no mês: ${pub.resend_sent_month} / ${pub.resend_monthly_limit} (${resMonthPct}%)`,
        )
      }
    } catch (err) {
      errors.push(`${system.company_name || system.name}: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  for (const msg of alerts) {
    await sendTelegramAlert(`⚠️ Infra perto do limite\n\n${msg}`)
  }

  return { synced, alerts, errors }
}
