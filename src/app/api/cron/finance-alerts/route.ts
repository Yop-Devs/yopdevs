import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import {
  buildDomainExpiryMessage,
  collectDomainsExpiringInDays,
} from '@/lib/admin-telegram-alerts'
import {
  buildFinanceAlertMessage,
  collectFinanceDueToday,
  advanceOperationFeesPastDue,
  todayIsoInCuiaba,
} from '@/lib/finance-daily-alerts'
import { syncAllSystemsInfra } from '@/lib/system-infra-sync'
import { processAgendaNotifications } from '@/lib/agenda-notifications'
import { syncPendingCharges } from '@/lib/cobranca-sync'
import { sendTelegramAlert } from '@/lib/telegram'

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
  const financeMessage = buildFinanceAlertMessage(lines, todayIso)

  const domains = await collectDomainsExpiringInDays(supabase, 7, todayIso)
  const domainMessage = buildDomainExpiryMessage(domains, 7)

  const sentMessages: string[] = []
  const errors: string[] = []

  if (financeMessage) {
    const sent = await sendTelegramAlert(financeMessage)
    if (sent.ok) sentMessages.push('finance')
    else errors.push(sent.error)
  }

  // Depois do alerta do dia: gera o próximo vencimento no dia de cobrança
  let feesAdvanced = 0
  try {
    feesAdvanced = await advanceOperationFeesPastDue(supabase, todayIso)
    if (feesAdvanced > 0) sentMessages.push('fees-advanced')
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Falha ao avançar mensalidades')
  }

  // Fallback diário: sync cobranças pendentes (webhook às vezes falha)
  let chargesSynced = 0
  let chargesPaid = 0
  try {
    if (process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
      const chargeResults = await syncPendingCharges(supabase, { allPending: true })
      chargesSynced = chargeResults.filter((r) => r.ok).length
      chargesPaid = chargeResults.filter((r) => r.becamePaid).length
      if (chargeResults.length) sentMessages.push('cobranca-sync')
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Falha no sync de cobranças')
  }

  if (domainMessage) {
    const sent = await sendTelegramAlert(domainMessage)
    if (sent.ok) sentMessages.push('domain')
    else errors.push(sent.error)
  }

  let infraSynced = 0
  let infraAlerts = 0
  try {
    const infra = await syncAllSystemsInfra(supabase)
    infraSynced = infra.synced
    infraAlerts = infra.alerts.length
    if (infra.alerts.length) sentMessages.push('infra')
    if (infra.errors.length) {
      errors.push(...infra.errors.slice(0, 5))
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Falha no sync de infra')
  }

  let agendaSent = 0
  try {
    const agenda = await processAgendaNotifications(supabase)
    agendaSent = agenda.sent
    if (agenda.sent > 0) sentMessages.push('agenda')
    if (agenda.errors.length) errors.push(...agenda.errors.slice(0, 5))
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Falha nos avisos da agenda')
  }

  if (errors.length && sentMessages.length === 0) {
    return NextResponse.json(
      {
        error: errors.join('; '),
        today: todayIso,
        financeCount: lines.length,
        domainCount: domains.length,
        feesAdvanced,
        chargesSynced,
        chargesPaid,
        infraSynced,
        infraAlerts,
        agendaSent,
        sent: sentMessages,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    today: todayIso,
    financeCount: lines.length,
    domainCount: domains.length,
    feesAdvanced,
    chargesSynced,
    chargesPaid,
    infraSynced,
    infraAlerts,
    agendaSent,
    sent: sentMessages,
    warnings: errors.length ? errors : undefined,
    skipped: sentMessages.length === 0,
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
