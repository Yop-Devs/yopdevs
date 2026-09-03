import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import {
  buildFinanceAlertMessage,
  collectFinanceDueToday,
  todayIsoInCuiaba,
} from '@/lib/finance-daily-alerts'
import { sendTelegramAlert } from '@/lib/telegram'

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

  const query = new URL(request.url).searchParams.get('secret')?.trim()
  return Boolean(query && query === notifySecret)
}

async function runFinanceAlerts() {
  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
      { status: 503 },
    )
  }

  const todayIso = todayIsoInCuiaba()
  const lines = await collectFinanceDueToday(supabase, todayIso)
  const message = buildFinanceAlertMessage(lines, todayIso)

  if (!message) {
    return NextResponse.json({
      ok: true,
      today: todayIso,
      count: 0,
      skipped: true,
      reason: 'Nenhum lançamento com data de hoje.',
    })
  }

  const sent = await sendTelegramAlert(message)
  if (!sent.ok) {
    return NextResponse.json(
      { error: sent.error, today: todayIso, count: lines.length },
      { status: sent.status ?? 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    today: todayIso,
    count: lines.length,
    skipped: false,
  })
}

/** Cron Vercel: 08:00 Cuiabá-MT (12:00 UTC). Também aceita trigger manual com secret. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    return await runFinanceAlerts()
  } catch (err) {
    console.error('[finance-alerts]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha nos alertas financeiros.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
