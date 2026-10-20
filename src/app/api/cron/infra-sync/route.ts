import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import { syncAllSystemsInfra } from '@/lib/system-infra-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

async function run() {
  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente.' }, { status: 503 })
  }

  const result = await syncAllSystemsInfra(yop, {
    telegramSupabaseDown: 'on-new',
    telegramUsageAlerts: false,
  })

  return NextResponse.json({
    ok: true,
    ...result,
  })
}

/** Mede uso CF / Supabase / Resend de todos os sistemas. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  try {
    return await run()
  } catch (err) {
    console.error('[infra-sync]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no sync de infra.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
