import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import {
  importEnvForSystem,
  syncInfraForSystem,
  toPublicIntegration,
  type SystemIntegrationRow,
} from '@/lib/system-infra-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

async function getSystemId(ctx: Ctx): Promise<string> {
  const { id } = await ctx.params
  return id
}

/** Retorna integração pública (sem secrets). */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const systemId = await getSystemId(ctx)
  const yop = getSupabaseServiceRole() ?? auth.supabase

  const { data, error } = await yop
    .from('yop_admin_system_integrations')
    .select('*')
    .eq('system_id', systemId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ integration: null })

  return NextResponse.json({
    integration: toPublicIntegration(data as SystemIntegrationRow),
  })
}

/**
 * body.action:
 * - import: só parse do .env
 * - sync: importa .env (se houver) + mede uso
 * - limits: atualiza limites editáveis (GB / e-mails/dia)
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

  let body: {
    action?: unknown
    cf_storage_limit_gb?: unknown
    sb_db_limit_gb?: unknown
    sb_storage_limit_gb?: unknown
    resend_daily_limit?: unknown
  }
  try {
    body = await request.json()
  } catch {
    body = { action: 'sync' }
  }

  const action =
    body.action === 'import' || body.action === 'limits' || body.action === 'sync'
      ? body.action
      : 'sync'

  try {
    if (action === 'import') {
      const { flags } = await importEnvForSystem(yop, systemId)
      const { data, error } = await yop
        .from('yop_admin_system_integrations')
        .select('*')
        .eq('system_id', systemId)
        .single()
      if (error) throw new Error(error.message)
      return NextResponse.json({
        ok: true,
        flags,
        integration: toPublicIntegration(data as SystemIntegrationRow),
      })
    }

    if (action === 'limits') {
      const patch: Record<string, number | string> = {
        updated_at: new Date().toISOString(),
      }

      const gb = (v: unknown) => {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v * 1024 ** 3)
        if (typeof v === 'string' && v.trim()) {
          const n = Number(v.replace(',', '.'))
          if (Number.isFinite(n) && n > 0) return Math.round(n * 1024 ** 3)
        }
        return null
      }

      const cf = gb(body.cf_storage_limit_gb)
      if (cf != null) patch.cf_storage_limit_bytes = cf
      const sbDb = gb(body.sb_db_limit_gb)
      if (sbDb != null) patch.sb_db_limit_bytes = sbDb
      const sbStor = gb(body.sb_storage_limit_gb)
      if (sbStor != null) patch.sb_storage_limit_bytes = sbStor

      if (typeof body.resend_daily_limit === 'number' && body.resend_daily_limit > 0) {
        patch.resend_daily_limit = Math.floor(body.resend_daily_limit)
      } else if (typeof body.resend_daily_limit === 'string' && body.resend_daily_limit.trim()) {
        const n = Number(body.resend_daily_limit)
        if (Number.isFinite(n) && n > 0) patch.resend_daily_limit = Math.floor(n)
      }

      const { data, error } = await yop
        .from('yop_admin_system_integrations')
        .update(patch)
        .eq('system_id', systemId)
        .select('*')
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        return NextResponse.json(
          { error: 'Integração ainda não existe. Importe o .env primeiro.' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        ok: true,
        integration: toPublicIntegration(data as SystemIntegrationRow),
      })
    }

    const integration = await syncInfraForSystem(yop, systemId, { importEnvFirst: true })
    return NextResponse.json({ ok: true, integration })
  } catch (err) {
    console.error('[sync-infra]', systemId, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao sincronizar infra.' },
      { status: 500 },
    )
  }
}
