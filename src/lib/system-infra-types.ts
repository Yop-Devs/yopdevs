export type SystemIntegrationRow = {
  system_id: string
  has_cloudflare: boolean
  has_supabase: boolean
  has_resend: boolean
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
  resend_synced_at: string | null
  env_parsed_at: string | null
  last_error: string | null
  updated_at: string
}

/** Visão pública (sem secrets) para a UI. */
export type SystemIntegrationPublic = {
  system_id: string
  has_cloudflare: boolean
  has_supabase: boolean
  has_resend: boolean
  cf_r2_bucket: string | null
  cf_storage_limit_bytes: number
  cf_storage_used_bytes: number | null
  cf_synced_at: string | null
  sb_project_ref: string | null
  sb_db_limit_bytes: number
  sb_db_used_bytes: number | null
  sb_storage_limit_bytes: number
  sb_storage_used_bytes: number | null
  sb_synced_at: string | null
  resend_daily_limit: number
  resend_sent_today: number
  resend_day: string | null
  resend_synced_at: string | null
  env_parsed_at: string | null
  last_error: string | null
  updated_at: string
  secrets: {
    cf_api_token: boolean
    sb_service_role_key: boolean
    resend_api_key: boolean
  }
}

export function toPublicIntegration(row: SystemIntegrationRow): SystemIntegrationPublic {
  return {
    system_id: row.system_id,
    has_cloudflare: row.has_cloudflare,
    has_supabase: row.has_supabase,
    has_resend: row.has_resend,
    cf_r2_bucket: row.cf_r2_bucket,
    cf_storage_limit_bytes: Number(row.cf_storage_limit_bytes),
    cf_storage_used_bytes: row.cf_storage_used_bytes != null ? Number(row.cf_storage_used_bytes) : null,
    cf_synced_at: row.cf_synced_at,
    sb_project_ref: row.sb_project_ref,
    sb_db_limit_bytes: Number(row.sb_db_limit_bytes),
    sb_db_used_bytes: row.sb_db_used_bytes != null ? Number(row.sb_db_used_bytes) : null,
    sb_storage_limit_bytes: Number(row.sb_storage_limit_bytes),
    sb_storage_used_bytes: row.sb_storage_used_bytes != null ? Number(row.sb_storage_used_bytes) : null,
    sb_synced_at: row.sb_synced_at,
    resend_daily_limit: Number(row.resend_daily_limit),
    resend_sent_today: Number(row.resend_sent_today),
    resend_day: row.resend_day,
    resend_synced_at: row.resend_synced_at,
    env_parsed_at: row.env_parsed_at,
    last_error: row.last_error,
    updated_at: row.updated_at,
    secrets: {
      cf_api_token: Boolean(row.cf_api_token),
      sb_service_role_key: Boolean(row.sb_service_role_key),
      resend_api_key: Boolean(row.resend_api_key),
    },
  }
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
