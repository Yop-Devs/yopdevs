'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  AdminPaymentInstallment,
  AdminPaymentWithSystem,
  OPERATION_FEE_PERIODS,
  periodLabel,
} from '@/lib/admin-payments'
import { clientDisplayName } from '@/lib/admin-clients'
import { daysUntil, formatBrl, formatDateBr } from '@/lib/admin-systems'

type DraftInstallment = {
  id?: string
  installment_number: number
  due_date: string
  amount: string
  is_paid: boolean
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(',', '.').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function reminderTone(days: number | null): string {
  if (days == null) return 'bg-slate-100 text-slate-600'
  if (days < 0) return 'bg-rose-100 text-rose-800'
  if (days <= 7) return 'bg-amber-100 text-amber-900'
  if (days <= 30) return 'bg-orange-100 text-orange-900'
  return 'bg-emerald-100 text-emerald-800'
}

export default function AdminPagamentosPage() {
  const [payments, setPayments] = useState<AdminPaymentWithSystem[]>([])
  const [installmentsByPayment, setInstallmentsByPayment] = useState<Record<string, AdminPaymentInstallment[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPaymentWithSystem | null>(null)
  const [query, setQuery] = useState('')

  const [isQuitado, setIsQuitado] = useState(false)
  const [hasOperationFee, setHasOperationFee] = useState(false)
  const [periodDays, setPeriodDays] = useState('30')
  const [customPeriod, setCustomPeriod] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [chargeDay, setChargeDay] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [notes, setNotes] = useState('')
  const [parcelCount, setParcelCount] = useState('2')
  const [drafts, setDrafts] = useState<DraftInstallment[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, linksRes] = await Promise.all([
      supabase
        .from('yop_admin_payments')
        .select('*, system:yop_admin_systems(id, name, company_name, link, logo_url)')
        .order('created_at', { ascending: false }),
      supabase.from('yop_admin_client_systems').select(
        'system_id, client:yop_admin_clients(id, full_name, person_name, company_name)',
      ),
    ])

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (linksRes.error) {
      toast.error(linksRes.error.message)
    }

    const clientsBySystem: Record<
      string,
      { id: string; full_name: string | null; person_name: string | null; company_name: string | null }[]
    > = {}
    for (const row of (linksRes.data ?? []) as unknown as {
      system_id: string
      client:
        | { id: string; full_name: string | null; person_name: string | null; company_name: string | null }
        | { id: string; full_name: string | null; person_name: string | null; company_name: string | null }[]
        | null
    }[]) {
      const client = Array.isArray(row.client) ? (row.client[0] ?? null) : row.client
      if (!client) continue
      if (!clientsBySystem[row.system_id]) clientsBySystem[row.system_id] = []
      clientsBySystem[row.system_id].push(client)
    }

    const list: AdminPaymentWithSystem[] = ((data ?? []) as unknown as (AdminPaymentWithSystem & {
      system: AdminPaymentWithSystem['system'] | NonNullable<AdminPaymentWithSystem['system']>[] | null
    })[]).map((raw) => {
      const system = Array.isArray(raw.system) ? (raw.system[0] ?? null) : raw.system
      return {
        ...raw,
        system,
        clients: clientsBySystem[raw.system_id] ?? [],
      }
    })
    setPayments(list)

    if (list.length) {
      const ids = list.map((p) => p.id)
      const { data: installments, error: instError } = await supabase
        .from('yop_admin_payment_installments')
        .select('*')
        .in('payment_id', ids)
        .order('installment_number', { ascending: true })

      if (instError) {
        toast.error(instError.message)
      } else {
        const map: Record<string, AdminPaymentInstallment[]> = {}
        for (const item of (installments ?? []) as AdminPaymentInstallment[]) {
          if (!map[item.payment_id]) map[item.payment_id] = []
          map[item.payment_id].push(item)
        }
        setInstallmentsByPayment(map)
      }
    } else {
      setInstallmentsByPayment({})
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return payments
    return payments.filter((p) => {
      const clientsHay = (p.clients ?? []).map((c) => clientDisplayName(c)).join(' ')
      const hay = [p.system?.name, p.system?.company_name, p.system?.link, clientsHay]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [payments, query])

  function openEdit(payment: AdminPaymentWithSystem) {
    setEditing(payment)
    setIsQuitado(payment.is_quitado)
    setHasOperationFee(payment.has_operation_fee)
    const period = payment.operation_fee_period_days
    const known = OPERATION_FEE_PERIODS.some((p) => p.days === period)
    setPeriodDays(known && period ? String(period) : period ? 'custom' : '30')
    setCustomPeriod(!known && period ? String(period) : '')
    setFeeAmount(payment.operation_fee_amount != null ? String(payment.operation_fee_amount) : '')
    setChargeDay(payment.operation_fee_charge_day != null ? String(payment.operation_fee_charge_day) : '')
    setNextDue(payment.operation_next_due ?? '')
    setNotes(payment.notes ?? '')

    const existing = installmentsByPayment[payment.id] ?? []
    setDrafts(
      existing.map((i) => ({
        id: i.id,
        installment_number: i.installment_number,
        due_date: i.due_date,
        amount: String(i.amount),
        is_paid: i.is_paid,
      }))
    )
    setParcelCount(String(Math.max(existing.length || 2, 1)))
    setEditorOpen(true)
  }

  function generateParcels() {
    const count = Math.max(1, Math.min(36, Number.parseInt(parcelCount, 10) || 1))
    const today = new Date()
    const next: DraftInstallment[] = []
    for (let i = 0; i < count; i++) {
      const d = new Date(today)
      d.setMonth(d.getMonth() + i)
      const iso = d.toISOString().slice(0, 10)
      const prev = drafts[i]
      next.push({
        id: prev?.id,
        installment_number: i + 1,
        due_date: prev?.due_date || iso,
        amount: prev?.amount || '',
        is_paid: prev?.is_paid || false,
      })
    }
    setDrafts(next)
    setParcelCount(String(count))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return

    const resolvedPeriod =
      periodDays === 'custom' ? Number.parseInt(customPeriod, 10) : Number.parseInt(periodDays, 10)

    if (hasOperationFee) {
      if (!Number.isFinite(resolvedPeriod) || resolvedPeriod <= 0) {
        toast.error('Informe o período da cobrança de operação.')
        return
      }
      if (!toNumber(feeAmount)) {
        toast.error('Informe o valor da mensalidade de operação.')
        return
      }
    }

    if (!isQuitado) {
      for (const draft of drafts) {
        if (!draft.due_date || !toNumber(draft.amount)) {
          toast.error('Preencha data e valor de todas as parcelas.')
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        is_quitado: isQuitado,
        has_operation_fee: hasOperationFee,
        operation_fee_period_days: hasOperationFee ? resolvedPeriod : null,
        operation_fee_amount: hasOperationFee ? toNumber(feeAmount) : null,
        operation_fee_charge_day: hasOperationFee ? Number.parseInt(chargeDay, 10) || null : null,
        operation_next_due: hasOperationFee ? nextDue || null : null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('yop_admin_payments').update(payload).eq('id', editing.id)
      if (error) throw error

      // Replace installments when not quitado; clear when quitado
      await supabase.from('yop_admin_payment_installments').delete().eq('payment_id', editing.id)

      if (!isQuitado && drafts.length) {
        const rows = drafts.map((d, idx) => ({
          payment_id: editing.id,
          installment_number: idx + 1,
          due_date: d.due_date,
          amount: toNumber(d.amount),
          is_paid: d.is_paid,
        }))
        const { error: instError } = await supabase.from('yop_admin_payment_installments').insert(rows)
        if (instError) throw instError
      }

      toast.success('Pagamento atualizado.')
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Pagamentos</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por sistema, empresa, cliente ou link..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Carregando pagamentos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Nenhum pagamento encontrado. Cadastre um sistema para gerar o card automaticamente.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((payment) => {
            const installments = installmentsByPayment[payment.id] ?? []
            const openParcels = installments.filter((i) => !i.is_paid)
            const nextParcel = openParcels[0]
            const opDays = daysUntil(payment.operation_next_due)

            return (
              <article
                key={payment.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="border-b border-slate-100 bg-slate-950 px-4 py-4">
                  <h3 className="line-clamp-2 text-base font-bold text-white">
                    {payment.system?.company_name || payment.system?.name || 'Sistema'}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/55">{payment.system?.name}</p>
                  {(payment.clients ?? []).length ? (
                    <p className="mt-2 text-xs text-violet-200">
                      Cliente{(payment.clients ?? []).length > 1 ? 's' : ''}:{' '}
                      {(payment.clients ?? []).map((c) => clientDisplayName(c)).join(', ')}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-white/40">Sem cliente vinculado</p>
                  )}
                  {payment.system?.link ? (
                    <a
                      href={payment.system.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-sm text-violet-200 hover:underline"
                    >
                      {payment.system.link.replace(/^https?:\/\//, '')}
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {payment.is_quitado ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Quitado
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Em pagamento
                      </span>
                    )}
                    {payment.has_operation_fee ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                        Mensalidade operação
                      </span>
                    ) : null}
                  </div>

                  {!payment.is_quitado ? (
                    <div className="space-y-1 text-xs text-slate-600">
                      <p>
                        Parcelas: <strong>{installments.length}</strong>
                        {openParcels.length ? ` · ${openParcels.length} em aberto` : ''}
                      </p>
                      {nextParcel ? (
                        <p>
                          Próxima: {formatDateBr(nextParcel.due_date)} · {formatBrl(nextParcel.amount)}
                        </p>
                      ) : (
                        <p className="text-slate-400">Nenhuma parcela cadastrada.</p>
                      )}
                    </div>
                  ) : null}

                  {payment.has_operation_fee ? (
                    <div className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${reminderTone(opDays)}`}>
                      {periodLabel(payment.operation_fee_period_days)} · {formatBrl(payment.operation_fee_amount)}
                      {payment.operation_fee_charge_day ? ` · dia ${payment.operation_fee_charge_day}` : ''}
                      {payment.operation_next_due ? ` · próximo ${formatDateBr(payment.operation_next_due)}` : ''}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openEdit(payment)}
                    className="mt-auto rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                  >
                    Gerenciar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editorOpen && editing ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editing.system?.company_name || editing.system?.name}
                </h3>
                {(editing.clients ?? []).length ? (
                  <p className="text-sm text-slate-600">
                    Cliente{(editing.clients ?? []).length > 1 ? 's' : ''}:{' '}
                    {(editing.clients ?? []).map((c) => clientDisplayName(c)).join(', ')}
                  </p>
                ) : null}
                <p className="text-sm text-slate-500">Configure quitação, parcelas e mensalidade de operação.</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar">
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={isQuitado} onChange={(e) => setIsQuitado(e.target.checked)} />
                Sistema já está quitado
              </label>

              {!isQuitado ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Parcelas do desenvolvimento</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Qtd. parcelas</span>
                      <input
                        value={parcelCount}
                        onChange={(e) => setParcelCount(e.target.value)}
                        className={inputClass}
                        inputMode="numeric"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={generateParcels}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Gerar parcelas
                    </button>
                  </div>

                  {drafts.length === 0 ? (
                    <p className="text-xs text-slate-500">Gere as parcelas para informar vencimento e valor de cada uma.</p>
                  ) : (
                    <div className="space-y-2">
                      {drafts.map((draft, idx) => (
                        <div key={draft.id ?? idx} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[auto_1fr_1fr_auto]">
                          <span className="self-center text-xs font-bold text-slate-500">#{idx + 1}</span>
                          <input
                            type="date"
                            value={draft.due_date}
                            onChange={(e) =>
                              setDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, due_date: e.target.value } : r)))
                            }
                            className={inputClass}
                          />
                          <input
                            value={draft.amount}
                            onChange={(e) =>
                              setDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                            }
                            className={inputClass}
                            placeholder="Valor"
                          />
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={draft.is_paid}
                              onChange={(e) =>
                                setDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, is_paid: e.target.checked } : r)))
                              }
                            />
                            Paga
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={hasOperationFee} onChange={(e) => setHasOperationFee(e.target.checked)} />
                  Possui mensalidade de operação
                </label>

                {hasOperationFee ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Período de cobrança</span>
                      <select
                        value={periodDays}
                        onChange={(e) => setPeriodDays(e.target.value)}
                        className={inputClass}
                      >
                        {OPERATION_FEE_PERIODS.map((p) => (
                          <option key={p.days} value={p.days}>
                            {p.label}
                          </option>
                        ))}
                        <option value="custom">Personalizado (dias)</option>
                      </select>
                    </label>
                    {periodDays === 'custom' ? (
                      <label className="text-sm">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Dias</span>
                        <input value={customPeriod} onChange={(e) => setCustomPeriod(e.target.value)} className={inputClass} placeholder="Ex: 20" />
                      </label>
                    ) : null}
                    <label className="text-sm">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Valor</span>
                      <input value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className={inputClass} placeholder="0,00" />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Dia de cobrança (1–31)</span>
                      <input value={chargeDay} onChange={(e) => setChargeDay(e.target.value)} className={inputClass} placeholder="10" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Próximo vencimento</span>
                      <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={inputClass} />
                    </label>
                  </div>
                ) : null}
              </div>

              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Observações</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'
