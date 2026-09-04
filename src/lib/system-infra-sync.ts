import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_SYSTEM_BUCKET } from '@/lib/admin-systems'
import { todayIsoInCuiaba } from '@/lib/finance-daily-alerts'
import { flagsFromParsedEnv, parseSystemEnv, type ParsedSystemEnv } from '@/lib/system-env-parse'
import {
  formatBytes,
  toPublicIntegration,
  usagePct,
  type SystemIntegrationPublic,
  type SystemIntegrationRow,
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
    .select('file_path, file_name, created_at')
    .eq('system_id', systemId)
    .eq('kind', 'env')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  const file = files?.[0]
  if (!file?.file_path) return null

  const { data: blob, error: dlError } = await yop.storage.from(ADMIN_SYSTEM_BUCKET).download(file.file_path)
  if (dlError || !blob) throw new Error(dlError?.message || 'Falha ao baixar .env')
  const content = await blob.text()
  return { content, fileName: file.file_name }
}

export async function importEnvForSystem(
  yop: SupabaseClient,
  systemId: string,
): Promise<{ parsed: ParsedSystemEnv; flags: ReturnType<typeof flagsFromParsedEnv> }> {
  const downloaded = await downloadLatestEnv(yop, systemId)
  if (!downloaded) {
    throw new Error('Nenhum arquivo .env anexado a este sistema.')
  }

  const parsed = parseSystemEnv(downloaded.content)
  const flags = flagsFromParsedEnv(parsed)
  const now = new Date().toISOString()

  const payload = {
    system_id: systemId,
    ...flags,
    cf_account_id: parsed.cf_account_id,
    cf_api_token: parsed.cf_api_token,
    cf_r2_bucket: parsed.cf_r2_bucket,
    sb_url: parsed.sb_url,
    sb_anon_key: parsed.sb_anon_key,
    sb_service_role_key: parsed.sb_service_role_key,
    sb_project_ref: parsed.sb_project_ref,
    sb_access_token: parsed.sb_access_token,
    resend_api_key: parsed.resend_api_key,
    env_parsed_at: now,
    last_error: null,
    updated_at: now,
  }

  const { error } = await yop.from('yop_admin_system_integrations').upsert(payload, { onConflict: 'system_id' })
  if (error) throw new Error(error.message)

  return { parsed, flags }
}

async function measureR2Usage(input: {
  accountId: string
  apiToken: string
  bucket: string
}): Promise<number> {
  let cursor: string | undefined
  let total = 0
  let guard = 0

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
      const msg = json.errors?.[0]?.message || `Cloudflare R2 HTTP ${res.status}`
      throw new Error(msg)
    }

    for (const obj of json.result?.objects ?? []) {
      total += Number(obj.size ?? 0)
    }

    cursor = json.result?.truncated ? json.result?.cursors?.after : undefined
    guard += 1
  } while (cursor && guard < 50)

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
  while (guard < 50) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit, offset })
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const item of data) {
      if (item.id == null && item.name) {
        total += await sumStorageBucket(client, bucket, prefix ? `${prefix}/${item.name}` : item.name)
      } else {
        total += Number(item.metadata?.size ?? 0)
      }
    }
    if (data.length < limit) break
    offset += limit
    guard += 1
  }
  return total
}

async function measureSupabaseStorage(serviceUrl: string, serviceKey: string): Promise<number> {
  const client = createClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const storageClient = createClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'storage' },
  })

  const pageSize = 1000
  let offset = 0
  let total = 0
  let guard = 0
  let usedObjectsTable = false

  while (guard < 100) {
    const { data: rows, error: qError } = await storageClient
      .from('objects')
      .select('metadata')
      .range(offset, offset + pageSize - 1)

    if (qError) break
    usedObjectsTable = true
    if (!rows?.length) break

    for (const row of rows as { metadata?: { size?: number } | null }[]) {
      const size = Number(row.metadata?.size ?? 0)
      if (Number.isFinite(size)) total += size
    }

    if (rows.length < pageSize) break
    offset += pageSize
    guard += 1
  }

  if (!usedObjectsTable) {
    const { data: buckets, error: bErr } = await client.storage.listBuckets()
    if (bErr) throw new Error(bErr.message)
    for (const bucket of buckets ?? []) {
      total += await sumStorageBucket(client, bucket.name)
    }
  }

  return total
}

async function measureSupabaseDbBytes(
  projectRef: string | null,
  accessToken: string | null,
): Promise<number | null> {
  if (!projectRef || !accessToken) return null

  const usageRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!usageRes.ok) {
    const text = await usageRes.text().catch(() => '')
    throw new Error(`Supabase Management API: ${usageRes.status} ${text.slice(0, 200)}`)
  }

  // Sem campo de tamanho estável em todos os planos
  return null
}

async function measureResendSentToday(apiKey: string, dayIso: string): Promise<number> {
  const start = new Date(`${dayIso}T00:00:00-04:00`)
  const end = new Date(`${dayIso}T23:59:59.999-04:00`)

  const res = await fetch('https://api.resend.com/emails?limit=100', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Resend auth: ${text.slice(0, 200) || res.status}`)
    }
    console.warn('[resend]', res.status, text.slice(0, 200))
    return 0
  }

  const json = (await res.json()) as { data?: { created_at?: string }[] }
  let count = 0
  for (const item of json.data ?? []) {
    if (!item.created_at) continue
    const t = new Date(item.created_at).getTime()
    if (t >= start.getTime() && t <= end.getTime()) count += 1
  }
  return count
}

export async function syncInfraForSystem(
  yop: SupabaseClient,
  systemId: string,
  options?: { importEnvFirst?: boolean },
): Promise<SystemIntegrationPublic> {
  const errors: string[] = []

  if (options?.importEnvFirst !== false) {
    try {
      await importEnvForSystem(yop, systemId)
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
  const patch: Partial<SystemIntegrationRow> = {
    updated_at: new Date().toISOString(),
  }
  const now = new Date().toISOString()
  const today = todayIsoInCuiaba()

  if (integ.has_cloudflare && integ.cf_account_id && integ.cf_api_token && integ.cf_r2_bucket) {
    try {
      const used = await measureR2Usage({
        accountId: integ.cf_account_id,
        apiToken: integ.cf_api_token,
        bucket: integ.cf_r2_bucket,
      })
      patch.cf_storage_used_bytes = used
      patch.cf_synced_at = now
    } catch (err) {
      errors.push(`Cloudflare: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  if (integ.has_supabase && integ.sb_url && integ.sb_service_role_key) {
    try {
      const used = await measureSupabaseStorage(integ.sb_url, integ.sb_service_role_key)
      patch.sb_storage_used_bytes = used
      patch.sb_synced_at = now
    } catch (err) {
      errors.push(`Supabase storage: ${err instanceof Error ? err.message : 'erro'}`)
    }

    try {
      const dbUsed = await measureSupabaseDbBytes(integ.sb_project_ref, integ.sb_access_token)
      if (dbUsed != null) {
        patch.sb_db_used_bytes = dbUsed
        patch.sb_synced_at = now
      } else if (!integ.sb_access_token) {
        errors.push('Supabase DB: adicione SUPABASE_ACCESS_TOKEN no .env para medir tamanho do banco')
      } else {
        errors.push('Supabase DB: tamanho não disponível via Management API neste plano')
      }
    } catch (err) {
      errors.push(`Supabase DB: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  if (integ.has_resend && integ.resend_api_key) {
    try {
      const sent = await measureResendSentToday(integ.resend_api_key, today)
      patch.resend_sent_today = sent
      patch.resend_day = today
      patch.resend_synced_at = now
    } catch (err) {
      if (integ.resend_day !== today) {
        patch.resend_sent_today = 0
        patch.resend_day = today
      }
      errors.push(`Resend: ${err instanceof Error ? err.message : 'erro'}`)
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
  return toPublicIntegration(updated as SystemIntegrationRow)
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
      if (pub.has_cloudflare && cfPct != null && cfPct >= 80) {
        alerts.push(
          `☁️ Cloudflare R2 · ${label}\nUso: ${formatBytes(pub.cf_storage_used_bytes)} / ${formatBytes(pub.cf_storage_limit_bytes)} (${cfPct}%)`,
        )
      }

      const sbStorPct = usagePct(pub.sb_storage_used_bytes, pub.sb_storage_limit_bytes)
      if (pub.has_supabase && sbStorPct != null && sbStorPct >= 80) {
        alerts.push(
          `🗄️ Supabase Storage · ${label}\nUso: ${formatBytes(pub.sb_storage_used_bytes)} / ${formatBytes(pub.sb_storage_limit_bytes)} (${sbStorPct}%)`,
        )
      }

      const sbDbPct = usagePct(pub.sb_db_used_bytes, pub.sb_db_limit_bytes)
      if (pub.has_supabase && sbDbPct != null && sbDbPct >= 80) {
        alerts.push(
          `🗃️ Supabase DB · ${label}\nUso: ${formatBytes(pub.sb_db_used_bytes)} / ${formatBytes(pub.sb_db_limit_bytes)} (${sbDbPct}%)`,
        )
      }

      const resPct = usagePct(pub.resend_sent_today, pub.resend_daily_limit)
      if (pub.has_resend && resPct != null && resPct >= 80) {
        alerts.push(
          `✉️ Resend · ${label}\nE-mails hoje: ${pub.resend_sent_today} / ${pub.resend_daily_limit} (${resPct}%)`,
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
