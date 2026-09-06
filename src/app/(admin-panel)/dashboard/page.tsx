'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  DashboardAgendaItem,
  DashboardInstallment,
  DashboardPayment,
  DashboardSystem,
  alertBadgeClass,
  alertKindLabel,
  alertToneClass,
  buildInfraUsageAlerts,
  summarizeDashboard,
} from '@/lib/admin-dashboard'
import { addDaysIso, formatTimeBr, todayIsoInCuiaba } from '@/lib/admin-agenda'
import { formatBrl, formatDateBr } from '@/lib/admin-systems'
import { periodLabel } from '@/lib/admin-payments'
import { adminPaths } from '@/lib/admin-host'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [systems, setSystems] = useState<DashboardSystem[]>([])
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [installments, setInstallments] = useState<DashboardInstallment[]>([])
  const [infraAlerts, setInfraAlerts] = useState<ReturnType<typeof buildInfraUsageAlerts>>([])
  const [agendaSoon, setAgendaSoon] = useState<DashboardAgendaItem[]>([])
  const [unreadMail, setUnreadMail] = useState(0)
  const [starredMail, setStarredMail] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const today = todayIsoInCuiaba()
    const horizon = addDaysIso(today, 14)

    const [systemsRes, paymentsRes, integRes, agendaRes, mailRes] = await Promise.all([
      supabase
        .from('yop_admin_systems')
        .select('id, name, company_name, domain_expires_at')
        .order('company_name', { ascending: true }),
      supabase
        .from('yop_admin_payments')
        .select(
          'id, system_id, is_quitado, has_operation_fee, operation_fee_period_days, operation_fee_amount, operation_next_due, system:yop_admin_systems(id, name, company_name, domain_expires_at)',
        ),
      supabase
        .from('yop_admin_system_integrations')
        .select(
          'system_id, track_cloudflare, track_supabase, track_resend, has_cloudflare, has_supabase, has_resend, cf_storage_used_bytes, cf_storage_limit_bytes, sb_storage_used_bytes, sb_storage_limit_bytes, sb_db_used_bytes, sb_db_limit_bytes, resend_sent_today, resend_daily_limit, last_error',
        ),
      supabase
        .from('yop_admin_agenda_events')
        .select('id, title, event_date, event_time, category')
        .gte('event_date', today)
        .lte('event_date', horizon)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(8),
      supabase.from('yop_admin_mailbox_threads').select('unread_count, starred'),
    ])

    if (systemsRes.error) {
      toast.error(systemsRes.error.message)
      setLoading(false)
      return
    }
    if (paymentsRes.error) {
      toast.error(paymentsRes.error.message)
      setLoading(false)
      return
    }

    const systemList = (systemsRes.data ?? []) as DashboardSystem[]
    const paymentList: DashboardPayment[] = (paymentsRes.data ?? []).map((row) => {
      const raw = row as {
        id: string
        system_id: string
        is_quitado: boolean
        has_operation_fee: boolean
        operation_fee_period_days: number | null
        operation_fee_amount: number | null
        operation_next_due: string | null
        system: DashboardSystem | DashboardSystem[] | null
      }
      const system = Array.isArray(raw.system) ? (raw.system[0] ?? null) : raw.system
      return {
        id: raw.id,
        system_id: raw.system_id,
        is_quitado: Boolean(raw.is_quitado),
        has_operation_fee: Boolean(raw.has_operation_fee),
        operation_fee_period_days: raw.operation_fee_period_days,
        operation_fee_amount: raw.operation_fee_amount != null ? Number(raw.operation_fee_amount) : null,
        operation_next_due: raw.operation_next_due,
        system,
      }
    })
    setSystems(systemList)
    setPayments(paymentList)

    const bySystem = new Map(systemList.map((s) => [s.id, s]))
    if (integRes.error) {
      toast.error(integRes.error.message)
      setInfraAlerts([])
    } else {
      setInfraAlerts(
        buildInfraUsageAlerts(
          (integRes.data ?? []).map((row) => {
            const sys = bySystem.get(row.system_id as string)
            return {
              system_id: String(row.system_id),
              company_name: sys?.company_name || sys?.name || 'Sistema',
              track_cloudflare: row.track_cloudflare as boolean | null,
              track_supabase: row.track_supabase as boolean | null,
              track_resend: row.track_resend as boolean | null,
              has_cloudflare: Boolean(row.has_cloudflare),
              has_supabase: Boolean(row.has_supabase),
              has_resend: Boolean(row.has_resend),
              cf_storage_used_bytes:
                row.cf_storage_used_bytes != null ? Number(row.cf_storage_used_bytes) : null,
              cf_storage_limit_bytes:
                row.cf_storage_limit_bytes != null ? Number(row.cf_storage_limit_bytes) : null,
              sb_storage_used_bytes:
                row.sb_storage_used_bytes != null ? Number(row.sb_storage_used_bytes) : null,
              sb_storage_limit_bytes:
                row.sb_storage_limit_bytes != null ? Number(row.sb_storage_limit_bytes) : null,
              sb_db_used_bytes: row.sb_db_used_bytes != null ? Number(row.sb_db_used_bytes) : null,
              sb_db_limit_bytes: row.sb_db_limit_bytes != null ? Number(row.sb_db_limit_bytes) : null,
              resend_sent_today: row.resend_sent_today != null ? Number(row.resend_sent_today) : null,
              resend_daily_limit: row.resend_daily_limit != null ? Number(row.resend_daily_limit) : null,
              last_error: (row.last_error as string | null) ?? null,
            }
          }),
        ),
      )
    }

    if (agendaRes.error) {
      toast.error(agendaRes.error.message)
      setAgendaSoon([])
    } else {
      setAgendaSoon((agendaRes.data ?? []) as DashboardAgendaItem[])
    }

    if (mailRes.error) {
      toast.error(mailRes.error.message)
      setUnreadMail(0)
      setStarredMail(0)
    } else {
      const threads = (mailRes.data ?? []) as { unread_count: number; starred?: boolean }[]
      setUnreadMail(threads.reduce((sum, t) => sum + Number(t.unread_count || 0), 0))
      setStarredMail(threads.filter((t) => t.starred).length)
    }

    const paymentIds = paymentList.map((p) => p.id)
    if (paymentIds.length) {
      const { data: instRows, error: instError } = await supabase
        .from('yop_admin_payment_installments')
        .select('id, payment_id, installment_number, due_date, amount, is_paid')
        .in('payment_id', paymentIds)
        .order('due_date', { ascending: true })

      if (instError) {
        toast.error(instError.message)
        setInstallments([])
      } else {
        const byPayment = new Map(paymentList.map((p) => [p.id, p]))
        const mapped: DashboardInstallment[] = (
          (instRows ?? []) as Omit<DashboardInstallment, 'system_id' | 'system_name' | 'company_name'>[]
        ).map((row) => {
          const payment = byPayment.get(row.payment_id)
          return {
            ...row,
            amount: Number(row.amount),
            system_id: payment?.system_id ?? '',
            system_name: payment?.system?.name ?? 'Sistema',
            company_name: payment?.system?.company_name ?? payment?.system?.name ?? 'Sistema',
          }
        })
        setInstallments(mapped)
      }
    } else {
      setInstallments([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(
    () => summarizeDashboard({ systems, payments, installments }),
    [systems, payments, installments],
  )

  const allAlerts = useMemo(() => {
    return [...infraAlerts, ...summary.alerts]
  }, [infraAlerts, summary.alerts])

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const today = todayIsoInCuiaba()

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">
            Visão geral · agenda, e-mail, sistemas e finanças · {monthLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
        >
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink
          href={adminPaths.agenda}
          title="Agenda pessoal"
          hint={
            agendaSoon.length
              ? `${agendaSoon.length} compromisso(s) nos próximos 14 dias`
              : 'Nenhum compromisso próximo'
          }
          accent="violet"
        />
        <QuickLink
          href={adminPaths.emails}
          title="Caixa de e-mail"
          hint={
            unreadMail > 0
              ? `${unreadMail} não lida(s)${starredMail ? ` · ${starredMail} importante(s)` : ''}`
              : starredMail
                ? `${starredMail} importante(s) · inbox em dia`
                : 'Inbox em dia'
          }
          accent="sky"
          badge={unreadMail > 0 ? String(unreadMail) : undefined}
        />
        <QuickLink
          href={adminPaths.sistemas}
          title="Avisos de sistemas"
          hint={
            infraAlerts.length
              ? `${infraAlerts.length} alerta(s) de uso / sync`
              : 'Infra dentro do esperado'
          }
          accent="amber"
          badge={infraAlerts.length ? String(infraAlerts.length) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sistemas criados" value={String(summary.systemsCount)} hint="Total cadastrados" />
        <StatCard
          label="Dev. a receber"
          value={String(summary.pendingDev.length)}
          hint={formatBrl(summary.openDevTotal)}
          tone={summary.pendingDev.length ? 'warn' : 'ok'}
        />
        <StatCard
          label="Com mensalidade"
          value={String(summary.withFee.length)}
          hint={`${formatBrl(summary.monthlyRecurring)} / mês (equiv.)`}
          tone={summary.withFee.length ? 'info' : 'ok'}
        />
        <StatCard
          label="A receber este mês"
          value={formatBrl(summary.receiveThisMonthTotal)}
          hint={`Parcelas ${formatBrl(summary.parcelsThisMonthTotal)} + mensal. ${formatBrl(summary.feesThisMonthTotal)}`}
          tone={summary.receiveThisMonthTotal > 0 ? 'warn' : 'ok'}
        />
      </div>

      {(allAlerts.some((a) => a.tone === 'danger') || allAlerts.some((a) => a.tone === 'warn')) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>
            {allAlerts.filter((a) => a.tone === 'danger').length > 0
              ? `${allAlerts.filter((a) => a.tone === 'danger').length} alerta(s) urgente(s)`
              : 'Atenção'}
          </strong>
          {allAlerts.filter((a) => a.tone === 'warn').length > 0
            ? ` · ${allAlerts.filter((a) => a.tone === 'warn').length} aviso(s)`
            : null}
          . Inclui domínio, parcelas, mensalidades e uso de infra.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Próximos da agenda</h3>
            <Link href={adminPaths.agenda} className="text-xs font-semibold text-violet-700 hover:underline">
              Abrir agenda
            </Link>
          </div>
          {agendaSoon.length === 0 ? (
            <p className="text-sm text-slate-500">Nada marcado nos próximos 14 dias.</p>
          ) : (
            <ul className="space-y-2">
              {agendaSoon.map((ev) => (
                <li key={ev.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-500">
                    {ev.event_date === today ? 'Hoje' : formatDateBr(ev.event_date)} ·{' '}
                    {formatTimeBr(ev.event_time)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Alertas ({allAlerts.length})
            </h3>
            <span className="text-xs text-slate-400">vencimentos + infra</span>
          </div>
          {allAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum alerta crítico no momento.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {allAlerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href}
                    className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 transition hover:opacity-90 sm:flex-row sm:items-center sm:justify-between ${alertToneClass[alert.tone]}`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="text-xs opacity-80">{alert.detail}</p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${alertBadgeClass[alert.tone]}`}
                    >
                      {alertKindLabel(alert.kind)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Desenvolvimento a receber ({summary.pendingDev.length})
            </h3>
            <Link href={adminPaths.pagamentos} className="text-xs font-semibold text-violet-700 hover:underline">
              Ver pagamentos
            </Link>
          </div>
          {summary.pendingDev.length === 0 ? (
            <p className="text-sm text-slate-500">Todos os sistemas estão quitados no desenvolvimento.</p>
          ) : (
            <ul className="space-y-2">
              {summary.pendingDev.map((payment) => {
                const open = summary.openInstallments.filter((i) => i.payment_id === payment.id)
                const openTotal = open.reduce((s, i) => s + Number(i.amount || 0), 0)
                const next = open[0]
                return (
                  <li key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {payment.system?.company_name || payment.system?.name || 'Sistema'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {open.length
                        ? `${open.length} parcela(s) em aberto · ${formatBrl(openTotal)}`
                        : 'Sem parcelas cadastradas'}
                      {next ? ` · próxima ${formatDateBr(next.due_date)}` : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Mensalidades de operação ({summary.withFee.length})
            </h3>
            <Link href={adminPaths.pagamentos} className="text-xs font-semibold text-violet-700 hover:underline">
              Ver pagamentos
            </Link>
          </div>
          {summary.withFee.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum sistema com mensalidade de operação ativa.</p>
          ) : (
            <ul className="space-y-2">
              {summary.withFee.map((payment) => (
                <li key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">
                    {payment.system?.company_name || payment.system?.name || 'Sistema'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatBrl(payment.operation_fee_amount)} · {periodLabel(payment.operation_fee_period_days)}
                    {payment.operation_next_due ? ` · próximo ${formatDateBr(payment.operation_next_due)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
            Parcelas deste mês ({summary.openInstallmentsThisMonth.length})
          </h3>
          {summary.openInstallmentsThisMonth.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma parcela em aberto com vencimento neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {summary.openInstallmentsThisMonth.map((inst) => (
                <li
                  key={inst.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{inst.company_name}</p>
                    <p className="text-xs text-slate-500">
                      Parcela {inst.installment_number} · {formatDateBr(inst.due_date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatBrl(inst.amount)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-800">
            Total parcelas: {formatBrl(summary.parcelsThisMonthTotal)}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
            Mensalidades deste mês ({summary.feesDueThisMonth.length})
          </h3>
          {summary.feesDueThisMonth.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma mensalidade com próximo vencimento neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {summary.feesDueThisMonth.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {payment.system?.company_name || payment.system?.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateBr(payment.operation_next_due)}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatBrl(payment.operation_fee_amount)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-800">
            Total mensalidades: {formatBrl(summary.feesThisMonthTotal)}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Resumo financeiro</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/45">Este mês (parcelas + mensal.)</p>
            <p className="mt-1 text-xl font-black">{formatBrl(summary.receiveThisMonthTotal)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/45">Recorrente mensal (equiv.)</p>
            <p className="mt-1 text-xl font-black">{formatBrl(summary.monthlyRecurring)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/45">Dev. em aberto (todas parcelas)</p>
            <p className="mt-1 text-xl font-black">{formatBrl(summary.openDevTotal)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function QuickLink({
  href,
  title,
  hint,
  accent,
  badge,
}: {
  href: string
  title: string
  hint: string
  accent: 'violet' | 'sky' | 'amber'
  badge?: string
}) {
  const accentClass =
    accent === 'violet'
      ? 'border-violet-200 bg-violet-50 hover:border-violet-300'
      : accent === 'sky'
        ? 'border-sky-200 bg-sky-50 hover:border-sky-300'
        : 'border-amber-200 bg-amber-50 hover:border-amber-300'

  return (
    <Link href={href} className={`relative rounded-2xl border p-4 transition ${accentClass}`}>
      {badge ? (
        <span className="absolute right-3 top-3 rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-snug text-slate-600">{hint}</p>
    </Link>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'warn' | 'info' | 'ok'
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'info'
        ? 'border-sky-200 bg-sky-50'
        : tone === 'ok'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white'

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
    </div>
  )
}
