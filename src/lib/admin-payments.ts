export type AdminPayment = {
  id: string
  system_id: string
  is_quitado: boolean
  has_operation_fee: boolean
  operation_fee_period_days: number | null
  operation_fee_amount: number | null
  operation_fee_charge_day: number | null
  operation_next_due: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AdminPaymentInstallment = {
  id: string
  payment_id: string
  installment_number: number
  due_date: string
  amount: number
  is_paid: boolean
  created_at: string
}

export type AdminPaymentWithSystem = AdminPayment & {
  system: {
    id: string
    name: string
    company_name: string
    link: string | null
    logo_url: string | null
  } | null
  clients?: { id: string; full_name: string | null; person_name: string | null; company_name: string | null }[]
}

export const OPERATION_FEE_PERIODS = [
  { days: 15, label: 'A cada 15 dias' },
  { days: 30, label: 'A cada 30 dias' },
  { days: 45, label: 'A cada 45 dias' },
  { days: 60, label: 'A cada 60 dias' },
  { days: 90, label: 'A cada 90 dias' },
] as const

export function periodLabel(days: number | null | undefined): string {
  if (days == null) return '—'
  const found = OPERATION_FEE_PERIODS.find((p) => p.days === days)
  return found?.label ?? `A cada ${days} dias`
}

/**
 * Aceita valores no padrão BR (1.500,00 / 1.500) e US (1500.50).
 * Corrige o caso em que "1.500" virava 1.5 no Number().
 */
export function parseBrlAmount(value: string | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  let s = value.trim().replace(/R\$\s?/gi, '').replace(/\s/g, '')
  if (!s) return null

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // milhar BR sem decimais: 1.500 → 1500
    s = s.replace(/\./g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Exibe valor para input no padrão BR. */
export function formatBrlInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Próximo vencimento mensal no dia de cobrança (1–31),
 * no mês seguinte à data de referência.
 * Ex.: após 2026-04-09 com dia 10 → 2026-05-10
 */
export function nextMonthlyDueOnChargeDay(afterIso: string, chargeDay: number): string {
  const [y, m] = afterIso.split('-').map(Number)
  let year = y
  let month = m + 1
  if (month > 12) {
    month = 1
    year += 1
  }
  const dayRaw = Number.isFinite(chargeDay) && chargeDay >= 1 ? Math.floor(chargeDay) : 1
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(Math.max(1, dayRaw), lastDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
