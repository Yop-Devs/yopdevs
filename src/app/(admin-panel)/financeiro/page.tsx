'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { adminPaths } from '@/lib/admin-host'
import {
  FinanceEntry,
  FinanceKind,
  FinancePeriodPreset,
  SystemFinanceItem,
  dayBeforeIso,
  expandFinanceEntries,
  isDateInPeriod,
  isRecurringEntry,
  periodBounds,
  toNumberAmount,
} from '@/lib/admin-finance'
import { formatBrl, formatDateBr } from '@/lib/admin-systems'
import { periodLabel } from '@/lib/admin-payments'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'

type FormState = {
  kind: FinanceKind
  title: string
  amount: string
  entry_date: string
  notes: string
  is_recurring: boolean
  recurrence_interval_days: string
}

const emptyForm: FormState = {
  kind: 'entrada',
  title: '',
  amount: '',
  entry_date: new Date().toISOString().slice(0, 10),
  notes: '',
  is_recurring: false,
  recurrence_interval_days: '30',
}

const PERIOD_OPTIONS: { value: FinancePeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'next_30', label: 'Próximos 30 dias' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'all', label: 'Todo o período' },
]

export default function AdminFinanceiroPage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [systemItems, setSystemItems] = useState<SystemFinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  /** Data da ocorrência aberta para editar (a partir dela o futuro muda; o passado fica). */
  const [editingFromDate, setEditingFromDate] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const [periodPreset, setPeriodPreset] = useState<FinancePeriodPreset>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const load = useCallback(async () => {
    setLoading(true)

    const [entriesRes, paymentsRes] = await Promise.all([
      supabase.from('yop_admin_finance_entries').select('*').order('entry_date', { ascending: false }),
      supabase
        .from('yop_admin_payments')
        .select(
          'id, system_id, is_quitado, has_operation_fee, operation_fee_period_days, operation_fee_amount, operation_next_due, system:yop_admin_systems(id, name, company_name)',
        ),
    ])

    if (entriesRes.error) {
      toast.error(entriesRes.error.message)
      setLoading(false)
      return
    }
    if (paymentsRes.error) {
      toast.error(paymentsRes.error.message)
    }

    const mappedEntries: FinanceEntry[] = ((entriesRes.data ?? []) as FinanceEntry[]).map((e) => ({
      ...e,
      amount: toNumberAmount(e.amount),
      is_recurring: Boolean(e.is_recurring),
      recurrence_interval_days:
        e.recurrence_interval_days == null ? null : Number(e.recurrence_interval_days) || null,
      recurrence_ends_on: e.recurrence_ends_on ?? null,
    }))
    setEntries(mappedEntries)

    type PaymentRow = {
      id: string
      system_id: string
      is_quitado: boolean
      has_operation_fee: boolean
      operation_fee_period_days: number | null
      operation_fee_amount: number | null
      operation_next_due: string | null
      system:
        | { id: string; name: string; company_name: string }
        | { id: string; name: string; company_name: string }[]
        | null
    }

    const payments = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map((raw) => {
      const system = Array.isArray(raw.system) ? (raw.system[0] ?? null) : raw.system
      return { ...raw, system }
    })

    const paymentIds = payments.map((p) => p.id)
    const systemList: SystemFinanceItem[] = []

    if (paymentIds.length) {
      const { data: instRows, error: instError } = await supabase
        .from('yop_admin_payment_installments')
        .select('id, payment_id, installment_number, due_date, amount, is_paid')
        .in('payment_id', paymentIds)
        .eq('is_paid', false)
        .order('due_date', { ascending: true })

      if (instError) {
        toast.error(instError.message)
      } else {
        const byPayment = new Map(payments.map((p) => [p.id, p]))
        for (const row of instRows ?? []) {
          const payment = byPayment.get(row.payment_id)
          const name = payment?.system?.company_name || payment?.system?.name || 'Sistema'
          systemList.push({
            id: `parcel-${row.id}`,
            source: 'parcel',
            title: name,
            subtitle: `Parcela ${row.installment_number} · Desenvolvimento`,
            amount: toNumberAmount(row.amount),
            date: row.due_date,
            system_id: payment?.system_id ?? '',
          })
        }
      }
    }

    for (const payment of payments.filter((p) => p.has_operation_fee && p.operation_next_due)) {
      const name = payment.system?.company_name || payment.system?.name || 'Sistema'
      systemList.push({
        id: `fee-${payment.id}`,
        source: 'fee',
        title: name,
        subtitle: `Mensalidade · ${periodLabel(payment.operation_fee_period_days)}`,
        amount: toNumberAmount(payment.operation_fee_amount),
        date: payment.operation_next_due!,
        system_id: payment.system_id,
      })
    }

    systemList.sort((a, b) => a.date.localeCompare(b.date))
    setSystemItems(systemList)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const bounds = useMemo(
    () => periodBounds(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo],
  )

  const filteredSystem = useMemo(
    () => systemItems.filter((i) => isDateInPeriod(i.date, bounds.from, bounds.to)),
    [systemItems, bounds],
  )
  const filteredPersonal = useMemo(
    () =>
      expandFinanceEntries(
        entries.filter((e) => e.kind === 'entrada'),
        bounds.from,
        bounds.to,
      ),
    [entries, bounds],
  )
  const filteredSaidas = useMemo(
    () =>
      expandFinanceEntries(
        entries.filter((e) => e.kind === 'saida'),
        bounds.from,
        bounds.to,
      ),
    [entries, bounds],
  )

  const totals = useMemo(() => {
    const systemDev = filteredSystem.filter((i) => i.source === 'parcel').reduce((s, i) => s + i.amount, 0)
    const systemFees = filteredSystem.filter((i) => i.source === 'fee').reduce((s, i) => s + i.amount, 0)
    const systemTotal = systemDev + systemFees
    const personalTotal = filteredPersonal.reduce((s, row) => s + row.entry.amount, 0)
    const saidasTotal = filteredSaidas.reduce((s, row) => s + row.entry.amount, 0)
    return {
      systemDev,
      systemFees,
      systemTotal,
      personalTotal,
      saidasTotal,
      receiveTotal: systemTotal + personalTotal,
      balance: systemTotal + personalTotal - saidasTotal,
    }
  }, [filteredSystem, filteredPersonal, filteredSaidas])

  function openCreate(kind: FinanceKind = 'entrada') {
    setEditing(null)
    setEditingFromDate(null)
    setForm({
      ...emptyForm,
      kind,
      entry_date: new Date().toISOString().slice(0, 10),
      is_recurring: false,
      recurrence_interval_days: '30',
    })
    setEditorOpen(true)
  }

  function openEdit(entry: FinanceEntry, occurrenceDate?: string) {
    const fromDate = occurrenceDate || entry.entry_date
    setEditing(entry)
    setEditingFromDate(fromDate)
    setForm({
      kind: entry.kind,
      title: entry.title,
      amount: String(entry.amount),
      entry_date: fromDate,
      notes: entry.notes ?? '',
      is_recurring: Boolean(entry.is_recurring),
      recurrence_interval_days: String(entry.recurrence_interval_days || 30),
    })
    setEditorOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    const amount = Number(form.amount.replace(',', '.'))
    if (!title) {
      toast.error('Informe o nome/descrição.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    if (!form.entry_date) {
      toast.error('Informe a data.')
      return
    }

    const wantsRecurring = form.is_recurring
    const intervalDays = Number(form.recurrence_interval_days)
    if (wantsRecurring && (!Number.isFinite(intervalDays) || intervalDays < 1)) {
      toast.error('Informe o intervalo em dias (mínimo 1).')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      const nowIso = new Date().toISOString()

      const basePayload = {
        kind: form.kind,
        title,
        amount,
        notes: form.notes.trim() || null,
        is_recurring: wantsRecurring,
        recurrence_interval_days: wantsRecurring ? Math.floor(intervalDays) : null,
        updated_at: nowIso,
      }

      if (!editing) {
        const { error } = await supabase.from('yop_admin_finance_entries').insert({
          ...basePayload,
          entry_date: form.entry_date,
          recurrence_ends_on: null,
          created_by: userId,
        })
        if (error) throw error
        toast.success(form.kind === 'entrada' ? 'Entrada cadastrada.' : 'Saída cadastrada.')
      } else {
        const fromDate = editingFromDate || form.entry_date
        const wasRecurring = isRecurringEntry(editing)

        if (!wasRecurring) {
          const { error } = await supabase
            .from('yop_admin_finance_entries')
            .update({
              ...basePayload,
              entry_date: form.entry_date,
              recurrence_ends_on: null,
            })
            .eq('id', editing.id)
          if (error) throw error
          toast.success(form.kind === 'entrada' ? 'Entrada atualizada.' : 'Saída atualizada.')
        } else if (fromDate <= editing.entry_date) {
          // Edita a série desde o início deste segmento
          const { error } = await supabase
            .from('yop_admin_finance_entries')
            .update({
              ...basePayload,
              entry_date: form.entry_date,
              recurrence_ends_on: wantsRecurring ? editing.recurrence_ends_on : null,
            })
            .eq('id', editing.id)
          if (error) throw error
          toast.success(
            wantsRecurring
              ? 'Série atualizada a partir desta data.'
              : 'Recorrência desativada. Fica só este lançamento.',
          )
        } else {
          // Congela o passado e cria novo segmento a partir de fromDate
          const endPast = dayBeforeIso(fromDate)
          const { error: endError } = await supabase
            .from('yop_admin_finance_entries')
            .update({
              recurrence_ends_on: endPast,
              updated_at: nowIso,
            })
            .eq('id', editing.id)
          if (endError) throw endError

          const { error: insertError } = await supabase.from('yop_admin_finance_entries').insert({
            ...basePayload,
            entry_date: fromDate,
            recurrence_ends_on: null,
            created_by: userId,
          })
          if (insertError) throw insertError

          toast.success(
            wantsRecurring
              ? 'Atualizado a partir desta data. Meses anteriores permanecem.'
              : 'Recorrência encerrada a partir desta data. Histórico anterior preservado.',
          )
        }
      }

      setEditorOpen(false)
      setEditing(null)
      setEditingFromDate(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function removeOccurrence(entry: FinanceEntry, occurrenceDate: string) {
    const label = entry.kind === 'entrada' ? 'entrada' : 'saída'
    const dateLabel = formatDateBr(occurrenceDate)

    if (!isRecurringEntry(entry)) {
      const ok = await confirm({
        title: `Excluir ${label}?`,
        description: `"${entry.title}" será removida permanentemente.`,
        confirmLabel: 'Excluir',
        tone: 'danger',
      })
      if (!ok) return
      const { error } = await supabase.from('yop_admin_finance_entries').delete().eq('id', entry.id)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Registro excluído.')
      await load()
      return
    }

    if (occurrenceDate <= entry.entry_date) {
      const ok = await confirm({
        title: `Excluir ${label} a partir de ${dateLabel}?`,
        description: `Remove esta data e as próximas desta série. Datas anteriores (se houver em outro período) permanecem.`,
        confirmLabel: 'Excluir a partir daqui',
        tone: 'danger',
      })
      if (!ok) return
      const { error } = await supabase.from('yop_admin_finance_entries').delete().eq('id', entry.id)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Série removida a partir desta data.')
      await load()
      return
    }

    const ok = await confirm({
      title: `Excluir ${label} a partir de ${dateLabel}?`,
      description:
        'Os meses anteriores continuam como estavam; esta data e as próximas saem da planilha.',
      confirmLabel: 'Excluir a partir daqui',
      tone: 'danger',
    })
    if (!ok) return

    const { error } = await supabase
      .from('yop_admin_finance_entries')
      .update({
        recurrence_ends_on: dayBeforeIso(occurrenceDate),
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Removido a partir desta data. Histórico anterior preservado.')
    await load()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Carregando controle financeiro...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {confirmDialog}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Controle Financeiro</h2>
          <p className="text-sm text-slate-500">Planilha de sistemas, recebimentos pessoais e despesas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreate('entrada')}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            + Entrada
          </button>
          <button
            type="button"
            onClick={() => openCreate('saida')}
            className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
          >
            + Saída
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Filtro por período</p>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriodPreset(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                periodPreset === opt.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {periodPreset === 'custom' ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">De</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          Exibindo: <strong className="text-slate-700">{bounds.label}</strong>
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Resumo do período</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total a receber"
            hint="Sistema + pessoais"
            value={totals.receiveTotal}
            tone="sky"
          />
          <SummaryCard
            label="Entradas pessoais"
            hint="Recebimentos manuais"
            value={totals.personalTotal}
            tone="emerald"
          />
          <SummaryCard
            label="Sistemas — desenvolvimento"
            hint="Parcelas em aberto"
            value={totals.systemDev}
            tone="amber"
          />
          <SummaryCard
            label="Sistemas — mensalidades"
            hint="Próximos vencimentos"
            value={totals.systemFees}
            tone="violet"
          />
          <SummaryCard
            label="Saídas / despesas"
            hint="Pagamentos no período"
            value={totals.saidasTotal}
            tone="rose"
          />
          <SummaryCard
            label="Saldo estimado"
            hint="Receber − saídas"
            value={totals.balance}
            tone={totals.balance >= 0 ? 'balancePositive' : 'balanceNegative'}
            emphasize
          />
        </div>
      </div>

      <SheetBlock
        title="1. Recebimentos de sistemas"
        subtitle="Automático · Gerenciamento de Pagamentos"
        count={filteredSystem.length}
        total={totals.systemTotal}
        action={
          <Link href={adminPaths.pagamentos} className="text-xs font-semibold text-violet-700 hover:underline">
            Abrir pagamentos
          </Link>
        }
      >
        {filteredSystem.length === 0 ? (
          <EmptyRow message="Nenhum recebimento de sistema neste período." />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Sistema</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Detalhe</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredSystem.map((item, idx) => (
                <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateBr(item.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{item.title}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.source === 'parcel' ? 'bg-amber-100 text-amber-900' : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {item.source === 'parcel' ? 'Dev' : 'Mensalidade'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{item.subtitle}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatBrl(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-900">
                <td className="px-4 py-2.5" colSpan={4}>
                  Subtotal sistemas
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBrl(totals.systemTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </SheetBlock>

      <SheetBlock
        title="2. Recebimentos pessoais"
        subtitle="Entradas manuais · recorrentes aparecem em cada data do período"
        count={filteredPersonal.length}
        total={totals.personalTotal}
        action={
          <button type="button" onClick={() => openCreate('entrada')} className="text-xs font-semibold text-emerald-700 hover:underline">
            + Nova entrada
          </button>
        }
      >
        {filteredPersonal.length === 0 ? (
          <EmptyRow message="Nenhuma entrada pessoal neste período." />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Recebimento</th>
                <th className="px-4 py-2.5">Descrição</th>
                <th className="px-4 py-2.5">Observações</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonal.map((row, idx) => (
                <tr key={row.key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateBr(row.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    <span>{row.entry.title}</span>
                    {row.entry.is_recurring && row.entry.recurrence_interval_days ? (
                      <span className="ml-2 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        A cada {row.entry.recurrence_interval_days}d
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2.5 text-slate-500">{row.entry.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-800">
                    {formatBrl(row.entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row.entry, row.date)}
                      className="mr-3 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOccurrence(row.entry, row.date)}
                      className="text-[10px] font-bold uppercase tracking-wide text-rose-700 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 font-semibold text-emerald-950">
                <td className="px-4 py-2.5" colSpan={3}>
                  Subtotal pessoais
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBrl(totals.personalTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </SheetBlock>

      <SheetBlock
        title="3. Despesas / saídas"
        subtitle="Saídas manuais · recorrentes aparecem em cada data do período"
        count={filteredSaidas.length}
        total={totals.saidasTotal}
        action={
          <button type="button" onClick={() => openCreate('saida')} className="text-xs font-semibold text-rose-700 hover:underline">
            + Nova saída
          </button>
        }
      >
        {filteredSaidas.length === 0 ? (
          <EmptyRow message="Nenhuma despesa neste período." />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Pagamento</th>
                <th className="px-4 py-2.5">Descrição</th>
                <th className="px-4 py-2.5">Observações</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSaidas.map((row, idx) => (
                <tr key={row.key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateBr(row.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    <span>{row.entry.title}</span>
                    {row.entry.is_recurring && row.entry.recurrence_interval_days ? (
                      <span className="ml-2 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                        A cada {row.entry.recurrence_interval_days}d
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2.5 text-slate-500">{row.entry.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-rose-800">
                    {formatBrl(row.entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row.entry, row.date)}
                      className="mr-3 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOccurrence(row.entry, row.date)}
                      className="text-[10px] font-bold uppercase tracking-wide text-rose-700 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-rose-50 font-semibold text-rose-950">
                <td className="px-4 py-2.5" colSpan={3}>
                  Subtotal saídas
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBrl(totals.saidasTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </SheetBlock>

      {editorOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => {
            if (saving) return
            setEditorOpen(false)
            setEditing(null)
            setEditingFromDate(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editing
                  ? form.kind === 'entrada'
                    ? 'Editar entrada'
                    : 'Editar saída'
                  : form.kind === 'entrada'
                    ? 'Nova entrada'
                    : 'Nova saída'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false)
                  setEditing(null)
                  setEditingFromDate(null)
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {!editing ? (
                <div className="grid grid-cols-2 gap-2">
                  {(['entrada', 'saida'] as FinanceKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, kind }))}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        form.kind === kind
                          ? kind === 'entrada'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-rose-300 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {kind === 'entrada' ? 'Entrada' : 'Saída'}
                    </button>
                  ))}
                </div>
              ) : null}

              {editing && editingFromDate && isRecurringEntry(editing) ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Alterações valem <strong>a partir de {formatDateBr(editingFromDate)}</strong>. Datas
                  anteriores desta série permanecem como estavam. Desmarcar recorrência encerra só o
                  futuro.
                </p>
              ) : null}

              <Field label="Descrição">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                  placeholder={form.kind === 'entrada' ? 'Ex.: Freelance, reembolso...' : 'Ex.: Hosting, domínio...'}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Valor (R$)">
                  <input
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={inputClass}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </Field>
                <Field
                  label={
                    form.is_recurring
                      ? editing
                        ? 'Válido a partir de'
                        : form.kind === 'entrada'
                          ? 'Primeira data de recebimento'
                          : 'Primeira data de pagamento'
                      : form.kind === 'entrada'
                        ? 'Data de recebimento'
                        : 'Data de pagamento'
                  }
                >
                  <input
                    required
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                    disabled={Boolean(
                      editing &&
                        editingFromDate &&
                        isRecurringEntry(editing) &&
                        editingFromDate > editing.entry_date,
                    )}
                    className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                  />
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-semibold">
                      {form.kind === 'entrada' ? 'Recebimento recorrente' : 'Despesa recorrente'}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Repete o mesmo valor a cada X dias. Os próximos períodos já entram na planilha
                      automaticamente.
                    </span>
                  </span>
                </label>
                {form.is_recurring ? (
                  <Field label="Repetir a cada (dias)">
                    <input
                      required
                      type="number"
                      min={1}
                      max={365}
                      value={form.recurrence_interval_days}
                      onChange={(e) => setForm((f) => ({ ...f, recurrence_interval_days: e.target.value }))}
                      className={inputClass}
                      placeholder="30"
                    />
                  </Field>
                ) : null}
              </div>

              <Field label="Observações">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={inputClass}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditorOpen(false)
                    setEditing(null)
                    setEditingFromDate(null)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SheetBlock({
  title,
  subtitle,
  count,
  total,
  action,
  children,
}: {
  title: string
  subtitle: string
  count: number
  total: number
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">
            {subtitle} · {count} linha(s) · {formatBrl(total)}
          </p>
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function EmptyRow({ message }: { message: string }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-500">{message}</p>
}

function SummaryCard({
  label,
  hint,
  value,
  tone,
  emphasize,
}: {
  label: string
  hint: string
  value: number
  tone: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'balancePositive' | 'balanceNegative'
  emphasize?: boolean
}) {
  const styles: Record<typeof tone, string> = {
    sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
    emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white',
    rose: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white',
    balancePositive: 'border-slate-800 bg-slate-950 text-white',
    balanceNegative: 'border-rose-900 bg-rose-950 text-white',
  }

  const valueClass =
    tone === 'balancePositive'
      ? 'text-emerald-300'
      : tone === 'balanceNegative'
        ? 'text-rose-300'
        : tone === 'rose'
          ? 'text-rose-700'
          : tone === 'emerald'
            ? 'text-emerald-800'
            : 'text-slate-900'

  const mutedClass = tone.startsWith('balance') ? 'text-white/55' : 'text-slate-500'

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles[tone]} ${emphasize ? 'sm:col-span-2 xl:col-span-1' : ''}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight tabular-nums ${valueClass}`}>{formatBrl(value)}</p>
      <p className={`mt-1 text-[11px] ${mutedClass}`}>{hint}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'
