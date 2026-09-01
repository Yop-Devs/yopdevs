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
