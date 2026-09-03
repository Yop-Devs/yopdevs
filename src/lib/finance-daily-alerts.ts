import type { SupabaseClient } from '@supabase/supabase-js'
import {
  expandFinanceEntries,
  toNumberAmount,
  type FinanceEntry,
} from '@/lib/admin-finance'
import { formatBrl, formatDateBr } from '@/lib/admin-systems'

export type FinanceAlertLine = {
  section: 'sistema' | 'pessoal' | 'despesa'
  description: string
  amount: number
}

/** Data de hoje no fuso de Cuiabá-MT (America/Cuiaba). */
export function todayIsoInCuiaba(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function systemLabel(
  system:
    | { name?: string | null; company_name?: string | null }
    | { name?: string | null; company_name?: string | null }[]
    | null
    | undefined,
): string {
  const s = Array.isArray(system) ? system[0] : system
  return (s?.company_name || s?.name || 'Sistema').trim() || 'Sistema'
}

export async function collectFinanceDueToday(
  supabase: SupabaseClient,
  todayIso = todayIsoInCuiaba(),
): Promise<FinanceAlertLine[]> {
  const lines: FinanceAlertLine[] = []

  const { data: paymentsRaw, error: paymentsError } = await supabase
    .from('yop_admin_payments')
    .select(
      'id, system_id, has_operation_fee, operation_fee_amount, operation_next_due, system:yop_admin_systems(id, name, company_name)',
    )

  if (paymentsError) throw new Error(paymentsError.message)

  type PaymentRow = {
    id: string
    system_id: string
    has_operation_fee: boolean
    operation_fee_amount: number | null
    operation_next_due: string | null
    system:
      | { id: string; name: string; company_name: string }
      | { id: string; name: string; company_name: string }[]
      | null
  }

  const payments = (paymentsRaw ?? []) as unknown as PaymentRow[]
  const paymentIds = payments.map((p) => p.id)

  if (paymentIds.length) {
    const { data: instRows, error: instError } = await supabase
      .from('yop_admin_payment_installments')
      .select('id, payment_id, installment_number, due_date, amount, is_paid')
      .in('payment_id', paymentIds)
      .eq('is_paid', false)
      .eq('due_date', todayIso)

    if (instError) throw new Error(instError.message)

    const byPayment = new Map(payments.map((p) => [p.id, p]))
    for (const row of instRows ?? []) {
      const payment = byPayment.get(row.payment_id)
      const name = systemLabel(payment?.system)
      lines.push({
        section: 'sistema',
        description: `${name} — Parcela ${row.installment_number} (desenvolvimento)`,
        amount: toNumberAmount(row.amount),
      })
    }
  }

  for (const payment of payments) {
    if (!payment.has_operation_fee || payment.operation_next_due !== todayIso) continue
    const name = systemLabel(payment.system)
    lines.push({
      section: 'sistema',
      description: `${name} — Mensalidade`,
      amount: toNumberAmount(payment.operation_fee_amount),
    })
  }

  const { data: entriesRaw, error: entriesError } = await supabase
    .from('yop_admin_finance_entries')
    .select(
      'id, kind, title, amount, entry_date, notes, is_recurring, recurrence_interval_days, recurrence_ends_on, created_at, updated_at',
    )

  if (entriesError) throw new Error(entriesError.message)

  const entries = (entriesRaw ?? []) as FinanceEntry[]
  const occurrences = expandFinanceEntries(entries, todayIso, todayIso)

  for (const occ of occurrences) {
    const title = (occ.entry.title || 'Sem descrição').trim()
    if (occ.entry.kind === 'entrada') {
      lines.push({
        section: 'pessoal',
        description: title,
        amount: toNumberAmount(occ.entry.amount),
      })
    } else {
      lines.push({
        section: 'despesa',
        description: title,
        amount: toNumberAmount(occ.entry.amount),
      })
    }
  }

  return lines
}

export function buildFinanceAlertMessage(lines: FinanceAlertLine[], todayIso: string): string | null {
  if (!lines.length) return null

  const dateBr = formatDateBr(todayIso)
  const sistemas = lines.filter((l) => l.section === 'sistema')
  const pessoais = lines.filter((l) => l.section === 'pessoal')
  const despesas = lines.filter((l) => l.section === 'despesa')

  const parts: string[] = [`📅 Financeiro — ${dateBr} (Cuiabá-MT)`, '']

  const pushSection = (title: string, items: FinanceAlertLine[]) => {
    if (!items.length) return
    parts.push(title)
    for (const item of items) {
      parts.push(`• ${item.description}: ${formatBrl(item.amount)}`)
    }
    parts.push('')
  }

  pushSection('🟢 Recebimentos de sistemas', sistemas)
  pushSection('🟢 Recebimentos pessoais', pessoais)
  pushSection('🔴 Despesas', despesas)

  return parts.join('\n').trim()
}
