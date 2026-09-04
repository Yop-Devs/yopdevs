/** Helpers de uso / restante / projeção de dias (client-safe). */

export type StorageRunway = {
  used: number | null
  limit: number
  remaining: number | null
  pct: number | null
  avgDailyGrowth: number | null
  daysLeft: number | null
  coversDays: number
  coversHorizon: boolean | null
  sampleDays: number
}

export type SystemIntegrationRow = {
  system_id: string
  has_cloudflare: boolean
  has_supabase: boolean
  has_resend: boolean
  track_cloudflare: boolean
  track_supabase: boolean
  track_resend: boolean
  cf_account_id: string | null
  cf_api_token: string | null
  cf_r2_bucket: string | null
  cf_storage_limit_bytes: number
  cf_storage_used_bytes: number | null
  cf_synced_at: string | null
  sb_url: string | null
  sb_anon_key: string | null
  sb_service_role_key: string | null
  sb_project_ref: string | null
  sb_access_token: string | null
  sb_db_limit_bytes: number
  sb_db_used_bytes: number | null
  sb_storage_limit_bytes: number
  sb_storage_used_bytes: number | null
  sb_synced_at: string | null
  resend_api_key: string | null
  resend_daily_limit: number
  resend_sent_today: number
  resend_day: string | null
  resend_monthly_limit: number
  resend_sent_month: number
  resend_synced_at: string | null
  env_parsed_at: string | null
  last_error: string | null
  updated_at: string
}

export type UsageSnapshotPublic = {
  day: string
  cf_storage_used_bytes: number | null
  sb_storage_used_bytes: number | null
  sb_db_used_bytes: number | null
  resend_sent_today: number | null
}

/** Visão pública (sem secrets) para a UI. */
export type SystemIntegrationPublic = {
  system_id: string
  has_cloudflare: boolean
  has_supabase: boolean
  has_resend: boolean
  track_cloudflare: boolean
  track_supabase: boolean
  track_resend: boolean
  cf_account_id: string | null
  cf_r2_bucket: string | null
  cf_storage_limit_bytes: number
  cf_storage_used_bytes: number | null
  cf_synced_at: string | null
  sb_url: string | null
  sb_project_ref: string | null
  sb_db_limit_bytes: number
  sb_db_used_bytes: number | null
  sb_storage_limit_bytes: number
  sb_storage_used_bytes: number | null
  sb_synced_at: string | null
  resend_daily_limit: number
  resend_sent_today: number
  resend_day: string | null
  resend_monthly_limit: number
  resend_sent_month: number
  resend_synced_at: string | null
  env_parsed_at: string | null
  last_error: string | null
  updated_at: string
  secrets: {
    cf_api_token: boolean
    cf_account_id: boolean
    cf_r2_bucket: boolean
    sb_service_role_key: boolean
    sb_access_token: boolean
    sb_anon_key: boolean
    resend_api_key: boolean
  }
  missing: {
    cloudflare: string[]
    supabase: string[]
    resend: string[]
  }
  runway: {
    cloudflare: StorageRunway
    sb_storage: StorageRunway
    sb_db: StorageRunway
  }
  snapshots: UsageSnapshotPublic[]
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let n = bytes / 1024
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`
}

export function usagePct(used: number | null | undefined, limit: number | null | undefined): number | null {
  if (used == null || limit == null || limit <= 0) return null
  return Math.min(999, Math.round((used / limit) * 100))
}

function dayDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T12:00:00Z`)
  const tb = Date.parse(`${b}T12:00:00Z`)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0
  return Math.max(0, Math.round(Math.abs(tb - ta) / 86_400_000))
}

export function computeStorageRunway(
  used: number | null | undefined,
  limit: number,
  history: { day: string; value: number | null }[],
  coversDays = 30,
): StorageRunway {
  const usedN = used != null && Number.isFinite(used) ? Number(used) : null
  const remaining = usedN != null ? Math.max(0, limit - usedN) : null
  const pct = usagePct(usedN, limit)

  const points = history
    .map((h) => ({ day: h.day, value: h.value != null && Number.isFinite(h.value) ? Number(h.value) : null }))
    .filter((h): h is { day: string; value: number } => h.value != null)
    .sort((a, b) => a.day.localeCompare(b.day))

  let avgDailyGrowth: number | null = null
  let sampleDays = 0

  if (points.length >= 2) {
    const first = points[0]
    const last = points[points.length - 1]
    sampleDays = Math.max(1, dayDiff(first.day, last.day))
    avgDailyGrowth = (last.value - first.value) / sampleDays
  }

  let daysLeft: number | null = null
  if (remaining != null && avgDailyGrowth != null && avgDailyGrowth > 0) {
    daysLeft = Math.floor(remaining / avgDailyGrowth)
  } else if (remaining != null && avgDailyGrowth != null && avgDailyGrowth <= 0 && usedN != null) {
    daysLeft = null // uso estável ou caindo
  }

  let coversHorizon: boolean | null = null
  if (remaining != null && avgDailyGrowth != null) {
    if (avgDailyGrowth <= 0) coversHorizon = true
    else coversHorizon = remaining >= avgDailyGrowth * coversDays
  }

  return {
    used: usedN,
    limit,
    remaining,
    pct,
    avgDailyGrowth,
    daysLeft,
    coversDays,
    coversHorizon,
    sampleDays,
  }
}

function missingCloudflare(row: SystemIntegrationRow): string[] {
  if (!isTracked(row.track_cloudflare, false)) return []
  const m: string[] = []
  if (!row.cf_account_id) m.push('CF_ACCOUNT_ID / CLOUDFLARE_ACCOUNT_ID')
  if (!row.cf_api_token) m.push('CF_API_TOKEN / CLOUDFLARE_API_TOKEN')
  if (!row.cf_r2_bucket) m.push('CF_R2_BUCKET / R2_BUCKET')
  return m
}

function missingSupabase(row: SystemIntegrationRow): string[] {
  if (!isTracked(row.track_supabase, true)) return []
  const m: string[] = []
  if (!row.sb_url) m.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!row.sb_service_role_key) m.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!row.sb_access_token) m.push('SUPABASE_ACCESS_TOKEN (PAT da conta deste projeto, para tamanho do DB)')
  return m
}

function missingResend(row: SystemIntegrationRow): string[] {
  if (!isTracked(row.track_resend, false)) return []
  return row.resend_api_key ? [] : ['RESEND_API_KEY']
}

/** track_* pode faltar até a migration; defaults: CF/Resend off, Supabase on. */
export function isTracked(value: boolean | null | undefined, defaultOn: boolean): boolean {
  if (value == null) return defaultOn
  return Boolean(value)
}

export function toPublicIntegration(
  row: SystemIntegrationRow,
  snapshots: UsageSnapshotPublic[] = [],
): SystemIntegrationPublic {
  const snaps = [...snapshots].sort((a, b) => a.day.localeCompare(b.day))
  const track_cloudflare = isTracked(row.track_cloudflare, false)
  const track_supabase = isTracked(row.track_supabase, true)
  const track_resend = isTracked(row.track_resend, false)

  return {
    system_id: row.system_id,
    has_cloudflare: row.has_cloudflare,
    has_supabase: row.has_supabase,
    has_resend: row.has_resend,
    track_cloudflare,
    track_supabase,
    track_resend,
    cf_account_id: row.cf_account_id,
    cf_r2_bucket: row.cf_r2_bucket,
    cf_storage_limit_bytes: Number(row.cf_storage_limit_bytes),
    cf_storage_used_bytes: row.cf_storage_used_bytes != null ? Number(row.cf_storage_used_bytes) : null,
    cf_synced_at: row.cf_synced_at,
    sb_url: row.sb_url,
    sb_project_ref: row.sb_project_ref,
    sb_db_limit_bytes: Number(row.sb_db_limit_bytes),
    sb_db_used_bytes: row.sb_db_used_bytes != null ? Number(row.sb_db_used_bytes) : null,
    sb_storage_limit_bytes: Number(row.sb_storage_limit_bytes),
    sb_storage_used_bytes: row.sb_storage_used_bytes != null ? Number(row.sb_storage_used_bytes) : null,
    sb_synced_at: row.sb_synced_at,
    resend_daily_limit: Number(row.resend_daily_limit ?? 100),
    resend_sent_today: Number(row.resend_sent_today ?? 0),
    resend_day: row.resend_day,
    resend_monthly_limit: Number(row.resend_monthly_limit ?? 3000),
    resend_sent_month: Number(row.resend_sent_month ?? 0),
    resend_synced_at: row.resend_synced_at,
    env_parsed_at: row.env_parsed_at,
    last_error: row.last_error,
    updated_at: row.updated_at,
    secrets: {
      cf_api_token: Boolean(row.cf_api_token),
      cf_account_id: Boolean(row.cf_account_id),
      cf_r2_bucket: Boolean(row.cf_r2_bucket),
      sb_service_role_key: Boolean(row.sb_service_role_key),
      sb_access_token: Boolean(row.sb_access_token),
      sb_anon_key: Boolean(row.sb_anon_key),
      resend_api_key: Boolean(row.resend_api_key),
    },
    missing: {
      cloudflare: missingCloudflare({ ...row, track_cloudflare }),
      supabase: missingSupabase({ ...row, track_supabase }),
      resend: missingResend({ ...row, track_resend }),
    },
    runway: {
      cloudflare: computeStorageRunway(
        row.cf_storage_used_bytes,
        Number(row.cf_storage_limit_bytes),
        snaps.map((s) => ({ day: s.day, value: s.cf_storage_used_bytes })),
      ),
      sb_storage: computeStorageRunway(
        row.sb_storage_used_bytes,
        Number(row.sb_storage_limit_bytes),
        snaps.map((s) => ({ day: s.day, value: s.sb_storage_used_bytes })),
      ),
      sb_db: computeStorageRunway(
        row.sb_db_used_bytes,
        Number(row.sb_db_limit_bytes),
        snaps.map((s) => ({ day: s.day, value: s.sb_db_used_bytes })),
      ),
    },
    snapshots: snaps,
  }
}
