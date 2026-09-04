import { clientDisplayName } from '@/lib/admin-clients'
import type { AdminBoleto, BoletoStatus } from '@/lib/admin-cobranca'
import { PAYMENT_METHOD_LABEL, toNumberAmount } from '@/lib/admin-cobranca'
import { formatBrl, formatDateBr } from '@/lib/admin-systems'
import { sendTelegramAlert } from '@/lib/telegram'
import { todayIsoInCuiaba } from '@/lib/finance-daily-alerts'
import type { SupabaseClient } from '@supabase/supabase-js'

type ChargeNotifyRow = Pick<
  AdminBoleto,
  'id' | 'description' | 'amount' | 'status' | 'payment_method' | 'client_id'
> & {
  client?: {
    person_name?: string | null
    company_name?: string | null
    full_name?: string | null
  } | null
}

/** Dispara Telegram só na transição para PAGO (approved). */
export async function notifyIfChargeBecamePaid(
  previousStatus: BoletoStatus | string | null | undefined,
  charge: ChargeNotifyRow,
  nextStatus: BoletoStatus | string,
): Promise<void> {
  if (nextStatus !== 'approved' || previousStatus === 'approved') return

  const method =
    charge.payment_method === 'credit_card'
      ? PAYMENT_METHOD_LABEL.credit_card
      : PAYMENT_METHOD_LABEL.boleto
  const clientName = charge.client ? clientDisplayName(charge.client as never) : null
  const lines = [
    '✅ Pagamento recebido (PAGO)',
    `Tipo: ${method}`,
    `Descrição: ${charge.description || 'Sem descrição'}`,
    `Valor: ${formatBrl(toNumberAmount(charge.amount))}`,
  ]
  if (clientName) lines.splice(2, 0, `Cliente: ${clientName}`)

  const result = await sendTelegramAlert(lines.join('\n'))
  if (!result.ok) {
    console.error('[notify-charge-paid]', result.error)
  }
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Domínios que vencem exatamente em N dias (data Cuiabá). */
export async function collectDomainsExpiringInDays(
  supabase: SupabaseClient,
  daysAhead = 7,
  todayIso = todayIsoInCuiaba(),
): Promise<{ name: string; company_name: string; domain_expires_at: string }[]> {
  const target = addDaysIso(todayIso, daysAhead)
  const { data, error } = await supabase
    .from('yop_admin_systems')
    .select('name, company_name, domain_expires_at')
    .eq('domain_expires_at', target)

  if (error) throw new Error(error.message)
  return (data ?? []).filter((row) => Boolean(row.domain_expires_at)) as {
    name: string
    company_name: string
    domain_expires_at: string
  }[]
}

export function buildDomainExpiryMessage(
  rows: { name: string; company_name: string; domain_expires_at: string }[],
  daysAhead = 7,
): string | null {
  if (!rows.length) return null
  const lines = [
    `🌐 Domínio vence em ${daysAhead} dia(s)`,
    '',
    ...rows.map((row) => {
      const label = (row.company_name || row.name || 'Sistema').trim()
      return `• ${label} — vencimento ${formatDateBr(row.domain_expires_at)}`
    }),
  ]
  return lines.join('\n')
}
