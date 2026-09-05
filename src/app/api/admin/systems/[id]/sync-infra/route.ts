import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import {
  getPublicIntegration,
  importEnvForSystem,
  saveManualCredentials,
  syncInfraForSystem,
} from '@/lib/system-infra-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

async function getSystemId(ctx: Ctx): Promise<string> {
  const { id } = await ctx.params
  return id
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'))
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return null
}

function parseGbToBytes(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v * 1024 ** 3)
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'))
    if (Number.isFinite(n) && n > 0) return Math.round(n * 1024 ** 3)
  }
  return null
}

function asOptionalString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'string') return v
  return undefined
}

/** Retorna integração pública (sem secrets). */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const systemId = await getSystemId(ctx)
  const yop = getSupabaseServiceRole() ?? auth.supabase

  try {
    const integration = await getPublicIntegration(yop, systemId)
    return NextResponse.json({ integration })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao carregar integração.' },
      { status: 500 },
    )
  }
}

/**
 * body.action:
 * - import: parse do .env
 * - credentials: salva chaves digitadas no painel
 * - sync: mede uso (usa .env se houver; senão credenciais salvas)
 * - limits: atualiza limites editáveis
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const systemId = await getSystemId(ctx)
  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    body = { action: 'sync' }
  }

  const action =
    body.action === 'import' ||
    body.action === 'limits' ||
    body.action === 'credentials' ||
    body.action === 'sync'
      ? body.action
      : 'sync'

  try {
    if (action === 'import') {
      const { flags, report } = await importEnvForSystem(yop, systemId)
      // Após importar, mede uso automaticamente
      let integration = await getPublicIntegration(yop, systemId)
      try {
        integration = await syncInfraForSystem(yop, systemId, { importEnvFirst: false })
      } catch {
        // mantém integração importada mesmo se medição falhar
      }
      return NextResponse.json({ ok: true, flags, report, integration })
    }

    if (action === 'credentials') {
      const integration = await saveManualCredentials(yop, systemId, {
        cf_account_id: asOptionalString(body.cf_account_id),
        cf_api_token: asOptionalString(body.cf_api_token),
        cf_r2_bucket: asOptionalString(body.cf_r2_bucket),
        sb_url: asOptionalString(body.sb_url),
        sb_anon_key: asOptionalString(body.sb_anon_key),
        sb_service_role_key: asOptionalString(body.sb_service_role_key),
        sb_access_token: asOptionalString(body.sb_access_token),
        resend_api_key: asOptionalString(body.resend_api_key),
        track_cloudflare: typeof body.track_cloudflare === 'boolean' ? body.track_cloudflare : undefined,
        track_supabase: typeof body.track_supabase === 'boolean' ? body.track_supabase : undefined,
        track_resend: typeof body.track_resend === 'boolean' ? body.track_resend : undefined,
        clear_cf_api_token: body.clear_cf_api_token === true,
        clear_sb_service_role_key: body.clear_sb_service_role_key === true,
        clear_sb_access_token: body.clear_sb_access_token === true,
        clear_sb_anon_key: body.clear_sb_anon_key === true,
        clear_resend_api_key: body.clear_resend_api_key === true,
      })

      const shouldSync = body.sync_after !== false
      if (shouldSync) {
        try {
          const synced = await syncInfraForSystem(yop, systemId, { importEnvFirst: false })
          return NextResponse.json({ ok: true, integration: synced })
        } catch (syncErr) {
          // Chaves já foram salvas — não devolve 500 HTML/timeout confuso
          const msg = syncErr instanceof Error ? syncErr.message : 'Falha ao medir uso'
          const fallback = await getPublicIntegration(yop, systemId).catch(() => integration)
          return NextResponse.json({
            ok: true,
            integration: fallback,
            warning: `Chaves salvas, mas a sincronização falhou: ${msg}`,
          })
        }
      }

      return NextResponse.json({ ok: true, integration })
    }

    if (action === 'limits') {
      const patch: Record<string, number | string | boolean | null> = {
        updated_at: new Date().toISOString(),
      }

      const cf = parseGbToBytes(body.cf_storage_limit_gb)
      if (cf != null) patch.cf_storage_limit_bytes = cf
      const sbDb = parseGbToBytes(body.sb_db_limit_gb)
      if (sbDb != null) patch.sb_db_limit_bytes = sbDb
      const sbStor = parseGbToBytes(body.sb_storage_limit_gb)
      if (sbStor != null) patch.sb_storage_limit_bytes = sbStor

      const daily = parsePositiveInt(body.resend_daily_limit)
      if (daily != null) patch.resend_daily_limit = daily
      const monthly = parsePositiveInt(body.resend_monthly_limit)
      if (monthly != null) patch.resend_monthly_limit = monthly

      if (typeof body.track_cloudflare === 'boolean') patch.track_cloudflare = body.track_cloudflare
      if (typeof body.track_supabase === 'boolean') patch.track_supabase = body.track_supabase
      if (typeof body.track_resend === 'boolean') patch.track_resend = body.track_resend

      // Limpa erros de provedores desligados
      if (body.track_cloudflare === false || body.track_supabase === false || body.track_resend === false) {
        patch.last_error = null
      }

      const { data, error } = await yop
        .from('yop_admin_system_integrations')
        .update(patch)
        .eq('system_id', systemId)
        .select('system_id')
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        return NextResponse.json(
          { error: 'Integração ainda não existe. Salve as chaves ou importe o .env primeiro.' },
          { status: 404 },
        )
      }

      const integration = await getPublicIntegration(yop, systemId)
      return NextResponse.json({ ok: true, integration })
    }

    const integration = await Promise.race([
      syncInfraForSystem(yop, systemId, { importEnvFirst: true }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sync demorou demais (45s). Verifique URL (.supabase.co) e o PAT.')), 45_000)
      }),
    ])
    return NextResponse.json({ ok: true, integration })
  } catch (err) {
    console.error('[sync-infra]', systemId, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao sincronizar infra.' },
      { status: 500 },
    )
  }
}
