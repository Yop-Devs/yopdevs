import { adminPaths } from '@/lib/admin-host'
import { daysUntil, formatBrl, formatDateBr } from '@/lib/admin-systems'
import { periodLabel } from '@/lib/admin-payments'

export type DashboardSystem = {
  id: string
  name: string
  company_name: string
  domain_expires_at: string | null
}

export type DashboardPayment = {
  id: string
  system_id: string
  is_quitado: boolean
  has_operation_fee: boolean
  operation_fee_period_days: number | null
  operation_fee_amount: number | null
  operation_next_due: string | null
  system: DashboardSystem | null
}

export type DashboardInstallment = {
  id: string
  payment_id: string
  installment_number: number
  due_date: string
  amount: number
  is_paid: boolean
  system_id: string
  system_name: string
  company_name: string
}

export type AlertTone = 'danger' | 'warn' | 'info' | 'ok'

export type DashboardAlert = {
  id: string
  tone: AlertTone
  kind: 'domain' | 'parcel' | 'fee'
  title: string
  detail: string
  days: number | null
  href: string
}

function alertToneFromDays(days: number | null, warnAt = 30, dangerAt = 7): AlertTone {
  if (days == null) return 'info'
  if (days < 0) return 'danger'
  if (days <= dangerAt) return 'danger'
  if (days <= warnAt) return 'warn'
  return 'info'
}

/** Converte mensalidade com período variável para equivalente mensal (30 dias). */
export function monthlyEquivalent(amount: number | null | undefined, periodDays: number | null | undefined): number {
  if (amount == null || !Number.isFinite(Number(amount))) return 0
  const days = periodDays && periodDays > 0 ? periodDays : 30
  return (Number(amount) * 30) / days
}

export function sameMonth(dateIso: string, ref = new Date()): boolean {
  const d = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return false
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function buildDashboardAlerts(input: {
  systems: DashboardSystem[]
  payments: DashboardPayment[]
  installments: DashboardInstallment[]
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  for (const system of input.systems) {
    const days = daysUntil(system.domain_expires_at)
    if (days == null) continue
    if (days > 60) continue
    const tone = alertToneFromDays(days, 60, 15)
    alerts.push({
      id: `domain-${system.id}`,
      tone,
      kind: 'domain',
      title: `Domínio · ${system.company_name || system.name}`,
      detail:
        days < 0
          ? `Vencido há ${Math.abs(days)} dia(s) · ${formatDateBr(system.domain_expires_at)}`
          : days === 0
            ? `Vence hoje · ${formatDateBr(system.domain_expires_at)}`
            : `Vence em ${days} dia(s) · ${formatDateBr(system.domain_expires_at)}`,
      days,
      href: adminPaths.sistemas,
    })
  }

  for (const inst of input.installments.filter((i) => !i.is_paid)) {
    const days = daysUntil(inst.due_date)
    if (days == null) continue
    if (days > 30) continue
    alerts.push({
      id: `parcel-${inst.id}`,
      tone: alertToneFromDays(days, 30, 7),
      kind: 'parcel',
      title: `Parcela ${inst.installment_number} · ${inst.company_name || inst.system_name}`,
      detail:
        days < 0
          ? `Atrasada · ${formatBrl(inst.amount)} · ${formatDateBr(inst.due_date)}`
          : days === 0
            ? `Vence hoje · ${formatBrl(inst.amount)}`
            : `Em ${days} dia(s) · ${formatBrl(inst.amount)} · ${formatDateBr(inst.due_date)}`,
      days,
      href: adminPaths.pagamentos,
    })
  }

  for (const payment of input.payments.filter((p) => p.has_operation_fee)) {
    const days = daysUntil(payment.operation_next_due)
    if (days == null) continue
    if (days > 30) continue
    const name = payment.system?.company_name || payment.system?.name || 'Sistema'
    alerts.push({
      id: `fee-${payment.id}`,
      tone: alertToneFromDays(days, 30, 7),
      kind: 'fee',
      title: `Mensalidade · ${name}`,
      detail:
        days < 0
          ? `Atrasada · ${formatBrl(payment.operation_fee_amount)} · ${periodLabel(payment.operation_fee_period_days)}`
          : days === 0
            ? `Vence hoje · ${formatBrl(payment.operation_fee_amount)}`
            : `Em ${days} dia(s) · ${formatBrl(payment.operation_fee_amount)} · ${formatDateBr(payment.operation_next_due)}`,
      days,
      href: adminPaths.pagamentos,
    })
  }

  const rank: Record<AlertTone, number> = { danger: 0, warn: 1, info: 2, ok: 3 }
  return alerts.sort((a, b) => {
    const toneDiff = rank[a.tone] - rank[b.tone]
    if (toneDiff !== 0) return toneDiff
    const ad = a.days ?? 9999
    const bd = b.days ?? 9999
    return ad - bd
  })
}

export function summarizeDashboard(input: {
  systems: DashboardSystem[]
  payments: DashboardPayment[]
  installments: DashboardInstallment[]
}) {
  const pendingDev = input.payments.filter((p) => !p.is_quitado)
  const withFee = input.payments.filter((p) => p.has_operation_fee)
  const openInstallments = input.installments.filter((i) => !i.is_paid)

  const openInstallmentsThisMonth = openInstallments.filter((i) => sameMonth(i.due_date))
  const feesDueThisMonth = withFee.filter((p) => p.operation_next_due && sameMonth(p.operation_next_due))

  const parcelsThisMonthTotal = openInstallmentsThisMonth.reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const feesThisMonthTotal = feesDueThisMonth.reduce((sum, p) => sum + Number(p.operation_fee_amount || 0), 0)
  const monthlyRecurring = withFee.reduce(
    (sum, p) => sum + monthlyEquivalent(p.operation_fee_amount, p.operation_fee_period_days),
    0,
  )
  const openDevTotal = openInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const alerts = buildDashboardAlerts(input)

  return {
    systemsCount: input.systems.length,
    pendingDev,
    withFee,
    openInstallments,
    openInstallmentsThisMonth,
    feesDueThisMonth,
    parcelsThisMonthTotal,
    feesThisMonthTotal,
    receiveThisMonthTotal: parcelsThisMonthTotal + feesThisMonthTotal,
    monthlyRecurring,
    openDevTotal,
    alerts,
    alertDangerCount: alerts.filter((a) => a.tone === 'danger').length,
    alertWarnCount: alerts.filter((a) => a.tone === 'warn').length,
  }
}

export const alertToneClass: Record<AlertTone, string> = {
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export const alertBadgeClass: Record<AlertTone, string> = {
  danger: 'bg-rose-100 text-rose-800',
  warn: 'bg-amber-100 text-amber-900',
  info: 'bg-sky-100 text-sky-800',
  ok: 'bg-emerald-100 text-emerald-800',
}
