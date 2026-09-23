import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import { syncPendingCharges } from '@/lib/cobranca-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization')?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true

  const notifySecret = process.env.TELEGRAM_NOTIFY_SECRET?.trim()
  if (!notifySecret) return false

  const header = request.headers.get('x-notify-secret')?.trim()
  if (header && header === notifySecret) return true
  if (auth === `Bearer ${notifySecret}`) return true

  return false
}

/** Cron: sincroniza boletos/cartões pendentes com o Mercado Pago (fallback do webhook). */
async function run() {
  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 503 })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' }, { status: 503 })
  }

  try {
    const results = await syncPendingCharges(supabase, { allPending: true })
    const ok = results.filter((r) => r.ok).length
    const paid = results.filter((r) => r.becamePaid).length
    const failed = results.filter((r) => !r.ok)

    return NextResponse.json({
      ok: true,
      checked: results.length,
      synced: ok,
      becamePaid: paid,
      errors: failed.length ? failed.slice(0, 10) : undefined,
    })
  } catch (err) {
    console.error('[cron cobranca-sync]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no sync de cobranças.' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  return run()
}

export async function POST(request: Request) {
  return GET(request)
}
