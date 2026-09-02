'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  AdminClient,
  clientDisplayName,
  formatCnpj,
  formatCpf,
  onlyDigits,
} from '@/lib/admin-clients'
import {
  AdminBoleto,
  BOLETO_STATUS_LABEL,
  BOLETO_STATUS_TONE,
  BoletoStatus,
  ChargePaymentMethod,
  PAYMENT_METHOD_LABEL,
  formatDateTimeBr,
  toNumberAmount,
} from '@/lib/admin-cobranca'
import { formatBrl } from '@/lib/admin-systems'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'

type StatusFilter = 'all' | BoletoStatus
type MethodFilter = 'all' | ChargePaymentMethod

type FormState = {
  payment_method: ChargePaymentMethod
  client_id: string
  amount: string
  description: string
  notes: string
  expiration_days: string
  max_installments: string
  prefer_doc: 'auto' | 'cpf' | 'cnpj'
}

const emptyForm: FormState = {
  payment_method: 'boleto',
  client_id: '',
  amount: '',
  description: '',
  notes: '',
  expiration_days: '3',
  max_installments: '12',
  prefer_doc: 'auto',
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function normalizeCharge(
  raw: AdminBoleto & { client?: AdminBoleto['client'] | AdminBoleto['client'][] },
): AdminBoleto {
  const client = Array.isArray(raw.client) ? (raw.client[0] ?? null) : raw.client
  return {
    ...raw,
    amount: toNumberAmount(raw.amount),
    payment_method: raw.payment_method === 'credit_card' ? 'credit_card' : 'boleto',
    installments: raw.installments != null ? Number(raw.installments) : null,
    client,
  }
}

function payLink(b: AdminBoleto): string | null {
  if (b.payment_method === 'credit_card') return b.checkout_url || null
  return b.ticket_url || null
}

export default function AdminCobrancaPage() {
  const [charges, setCharges] = useState<AdminBoleto[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [detail, setDetail] = useState<AdminBoleto | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all')
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const load = useCallback(async () => {
    setLoading(true)
    const [chargesRes, clientsRes] = await Promise.all([
      supabase
        .from('yop_admin_boletos')
        .select(
          '*, client:yop_admin_clients(id, person_name, company_name, full_name, email, cpf, cnpj, phone)',
        )
        .order('created_at', { ascending: false }),
      supabase.from('yop_admin_clients').select('*').order('full_name', { ascending: true }),
    ])

    if (chargesRes.error) toast.error(chargesRes.error.message)
    else {
      setCharges(((chargesRes.data ?? []) as unknown as AdminBoleto[]).map((row) => normalizeCharge(row)))
    }

    if (clientsRes.error) toast.error(clientsRes.error.message)
    else setClients((clientsRes.data ?? []) as AdminClient[])

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.client_id) ?? null,
    [clients, form.client_id],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return charges.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (methodFilter !== 'all' && b.payment_method !== methodFilter) return false
      if (!q) return true
      const hay = [
        b.description,
        b.payer_name,
        b.payer_email,
        b.mp_payment_id,
        b.mp_preference_id,
        b.digitable_line,
        b.checkout_url,
        PAYMENT_METHOD_LABEL[b.payment_method],
        clientDisplayName(b.client ?? { person_name: b.payer_name, company_name: null, full_name: null }),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [charges, query, statusFilter, methodFilter])

  const summary = useMemo(() => {
    const pending = charges.filter((b) => b.status === 'pending')
    const approved = charges.filter((b) => b.status === 'approved')
    const expired = charges.filter((b) => b.status === 'expired')
    const cancelled = charges.filter((b) => b.status === 'cancelled')
    const cards = charges.filter((b) => b.payment_method === 'credit_card')
    const boletos = charges.filter((b) => b.payment_method === 'boleto')
    return {
      total: charges.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, b) => s + b.amount, 0),
      paidCount: approved.length,
      paidAmount: approved.reduce((s, b) => s + b.amount, 0),
      expiredCount: expired.length,
      cancelledCount: cancelled.length,
      cardCount: cards.length,
      boletoCount: boletos.length,
    }
  }, [charges])

  function openCreate(method: ChargePaymentMethod = 'boleto') {
    setForm({
      ...emptyForm,
      payment_method: method,
      expiration_days: method === 'credit_card' ? '7' : '3',
    })
    setEditorOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/cobranca', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payment_method: form.payment_method,
          client_id: form.client_id,
          amount: form.amount,
          description: form.description,
          notes: form.notes || null,
          expiration_days: Number(form.expiration_days) || (form.payment_method === 'credit_card' ? 7 : 3),
          max_installments: Number(form.max_installments) || 12,
          prefer_doc: form.prefer_doc === 'auto' ? undefined : form.prefer_doc,
        }),
      })
      const json = (await res.json()) as { error?: string; boleto?: AdminBoleto }
      if (!res.ok) throw new Error(json.error || 'Falha ao criar cobrança.')
      toast.success(
        form.payment_method === 'credit_card'
          ? 'Link de cartão gerado. Envie ao cliente.'
          : 'Boleto emitido no Mercado Pago.',
      )
      setEditorOpen(false)
      if (json.boleto) setDetail(normalizeCharge(json.boleto as AdminBoleto))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao emitir.')
    } finally {
      setSaving(false)
    }
  }

  async function syncOne(id: string) {
    setSyncing(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/cobranca/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id }),
      })
      const json = (await res.json()) as { error?: string; results?: { ok: boolean; error?: string }[] }
      if (!res.ok) throw new Error(json.error || 'Falha ao sincronizar.')
      const first = json.results?.[0]
      if (first && !first.ok) throw new Error(first.error || 'Falha ao sincronizar.')
      toast.success('Status atualizado.')
      await load()
      const { data } = await supabase
        .from('yop_admin_boletos')
        .select(
          '*, client:yop_admin_clients(id, person_name, company_name, full_name, email, cpf, cnpj, phone)',
        )
        .eq('id', id)
        .maybeSingle()
      if (data) setDetail(normalizeCharge(data as unknown as AdminBoleto))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  async function syncAllPending() {
    setSyncing(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/cobranca/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ all_pending: true }),
      })
      const json = (await res.json()) as { error?: string; results?: { ok: boolean }[] }
      if (!res.ok) throw new Error(json.error || 'Falha ao sincronizar.')
      const ok = (json.results ?? []).filter((r) => r.ok).length
      toast.success(`Sincronizados: ${ok}/${json.results?.length ?? 0}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  async function cancelCharge(id: string) {
    const ok = await confirm({
      title: 'Cancelar esta cobrança?',
      description: 'Ela deixa de valer para o cliente. Cobranças já pagas não podem ser canceladas por aqui.',
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Voltar',
      tone: 'danger',
    })
    if (!ok) return
    setSyncing(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/cobranca/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao cancelar.')
      toast.success('Cobrança cancelada.')
      setDetail(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar.')
    } finally {
      setSyncing(false)
    }
  }

  async function copyText(label: string, value: string | null | undefined) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado.`)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const clientHasBothDocs =
    selectedClient &&
    onlyDigits(selectedClient.cpf ?? '').length === 11 &&
    onlyDigits(selectedClient.cnpj ?? '').length === 14

  const isCard = form.payment_method === 'credit_card'

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {confirmDialog}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Cobrança</h2>
          <p className="mt-1 text-sm text-slate-500">
            Boleto e cartão de crédito via Mercado Pago — emissão, link e acompanhamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncAllPending}
            disabled={syncing || loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Sincronizar pendentes
          </button>
          <button
            type="button"
            onClick={() => openCreate('boleto')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Emitir boleto
          </button>
          <button
            type="button"
            onClick={() => openCreate('credit_card')}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Link cartão
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Aguardando" value={formatBrl(summary.pendingAmount)} hint={`${summary.pendingCount} cobrança(s)`} />
        <SummaryCard label="Pagos" value={formatBrl(summary.paidAmount)} hint={`${summary.paidCount} cobrança(s)`} />
        <SummaryCard label="Cartão" value={String(summary.cardCount)} hint={`${summary.boletoCount} boleto(s)`} />
        <SummaryCard label="Emitidos" value={String(summary.total)} hint={`${summary.cancelledCount} cancelado(s) · ${summary.expiredCount} vencido(s)`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente, descrição, ID..."
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:max-w-sm"
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        >
          <option value="all">Todos os meios</option>
          <option value="boleto">Boleto</option>
          <option value="credit_card">Cartão</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        >
          <option value="all">Todos os status</option>
          {(Object.keys(BOLETO_STATUS_LABEL) as BoletoStatus[]).map((s) => (
            <option key={s} value={s}>
              {BOLETO_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Carregando cobranças...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhuma cobrança encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Meio</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Vencimento</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const link = payLink(b)
                  return (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {clientDisplayName(
                            b.client ?? { person_name: b.payer_name, company_name: null, full_name: null },
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{b.payer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{b.description}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            b.payment_method === 'credit_card'
                              ? 'bg-sky-100 text-sky-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {PAYMENT_METHOD_LABEL[b.payment_method]}
                          {b.installments && b.installments > 1 ? ` · ${b.installments}x` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatBrl(b.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${BOLETO_STATUS_TONE[b.status]}`}
                        >
                          {BOLETO_STATUS_LABEL[b.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTimeBr(b.date_of_expiration)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDetail(b)}
                            className="text-xs font-semibold text-slate-900 underline-offset-2 hover:underline"
                          >
                            Detalhes
                          </button>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                            >
                              {b.payment_method === 'credit_card' ? 'Abrir link' : 'Abrir boleto'}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <form
            onSubmit={onSubmit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {isCard ? 'Criar link de cartão' : 'Emitir boleto'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {isCard
                ? 'Gera um link do Mercado Pago. O cliente abre, escolhe cartão e parcela. Os juros do parcelamento ficam com ele — não saem do seu líquido.'
                : 'Os dados do pagador (documento e endereço) vêm do cadastro do cliente.'}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['boleto', 'credit_card'] as ChargePaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      payment_method: method,
                      expiration_days: method === 'credit_card' ? '7' : '3',
                    }))
                  }
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    form.payment_method === method
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {PAYMENT_METHOD_LABEL[method]}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Cliente</span>
                <select
                  required
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value, prefer_doc: 'auto' }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                >
                  <option value="">Selecione...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientDisplayName(c)}
                      {c.email ? ` — ${c.email}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {selectedClient && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>
                    Doc:{' '}
                    {selectedClient.cpf ? `CPF ${formatCpf(selectedClient.cpf)}` : '—'}
                    {selectedClient.cnpj ? ` · CNPJ ${formatCnpj(selectedClient.cnpj)}` : ''}
                  </p>
                  <p>E-mail: {selectedClient.email || '—'}</p>
                  {!isCard && (
                    <p>
                      {[selectedClient.street, selectedClient.address_number, selectedClient.city, selectedClient.state]
                        .filter(Boolean)
                        .join(', ') || 'Endereço incompleto (obrigatório no boleto)'}
                    </p>
                  )}
                </div>
              )}

              {clientHasBothDocs && (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Documento na cobrança</span>
                  <select
                    value={form.prefer_doc}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, prefer_doc: e.target.value as FormState['prefer_doc'] }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                  >
                    <option value="auto">Automático</option>
                    <option value="cpf">CPF (pessoa)</option>
                    <option value="cnpj">CNPJ (empresa)</option>
                  </select>
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Valor (R$)</span>
                <input
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="1500,00"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">
                  {isCard ? 'Descrição do produto / serviço' : 'Descrição'}
                </span>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mensalidade sistema X — março/2026"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Validade do link (dias)</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.expiration_days}
                    onChange={(e) => setForm((f) => ({ ...f, expiration_days: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                  />
                </label>
                {isCard ? (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Máx. parcelas</span>
                    <input
                      type="number"
                      min={1}
                      max={18}
                      value={form.max_installments}
                      onChange={(e) => setForm((f) => ({ ...f, max_installments: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                    />
                  </label>
                ) : null}
              </div>

              {isCard ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                  <p className="font-semibold">Juros no cliente (parcelado comprador)</p>
                  <p>
                    O valor que você cadastrar aqui é o que deve entrar pra você (antes da taxa normal do MP). Se o
                    cliente parcelar, o Mercado Pago calcula e soma os juros na parcela dele.
                  </p>
                  <p>
                    No painel do MP procure por <strong>“Taxas e parcelas”</strong>, <strong>“Custos”</strong> ou{' '}
                    <strong>“Oferecer parcelas sem acréscimo”</strong> (às vezes em Seu negócio → Configurações). Deixe{' '}
                    <strong>desligado</strong> o parcelado vendedor / sem acréscimos. Se não achar e no checkout o total
                    do cliente sobe ao parcelar, já está no modo certo.
                  </p>
                </div>
              ) : null}

              {isCard ? (
                <p className="text-xs text-slate-500">
                  Máximo de parcelas: o cliente escolhe 1x até esse limite. Quanto mais parcelas, mais juros ele vê no
                  checkout (não você).
                </p>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Observações internas</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Gerando...' : isCard ? 'Gerar link' : 'Emitir boleto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detalhes da cobrança</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${BOLETO_STATUS_TONE[detail.status]}`}
                  >
                    {BOLETO_STATUS_LABEL[detail.status]}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      detail.payment_method === 'credit_card'
                        ? 'bg-sky-100 text-sky-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {PAYMENT_METHOD_LABEL[detail.payment_method]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <DetailRow
                label="Cliente"
                value={clientDisplayName(
                  detail.client ?? {
                    person_name: detail.payer_name,
                    company_name: null,
                    full_name: null,
                  },
                )}
              />
              <DetailRow label="Valor" value={formatBrl(detail.amount)} />
              <DetailRow label="Descrição" value={detail.description} />
              <DetailRow
                label="Parcelas"
                value={
                  detail.installments && detail.installments > 1
                    ? `${detail.installments}x`
                    : detail.payment_method === 'credit_card'
                      ? 'À vista ou ainda não pago'
                      : '—'
                }
              />
              <DetailRow label="Vencimento" value={formatDateTimeBr(detail.date_of_expiration)} />
              <DetailRow label="Pago em" value={formatDateTimeBr(detail.paid_at)} />
              <DetailRow
                label="Documento"
                value={
                  detail.payer_doc_type && detail.payer_doc_number
                    ? `${detail.payer_doc_type} ${detail.payer_doc_number}`
                    : '—'
                }
              />
              <DetailRow label="E-mail" value={detail.payer_email || '—'} />
              <DetailRow label="ID pagamento" value={detail.mp_payment_id || '—'} />
              {detail.mp_preference_id && (
                <DetailRow label="ID preferência" value={detail.mp_preference_id} />
              )}
              <DetailRow
                label="Status MP"
                value={[detail.mp_status, detail.mp_status_detail].filter(Boolean).join(' — ') || '—'}
              />
              <DetailRow label="Criado em" value={formatDateTimeBr(detail.created_at)} />
              {detail.notes && <DetailRow label="Notas" value={detail.notes} />}
            </dl>

            {detail.payment_method === 'credit_card' && detail.checkout_url && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Link de pagamento</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-800">{detail.checkout_url}</p>
                <button
                  type="button"
                  onClick={() => copyText('Link', detail.checkout_url)}
                  className="mt-2 text-xs font-semibold text-sky-700 hover:underline"
                >
                  Copiar link
                </button>
              </div>
            )}

            {detail.digitable_line && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linha digitável</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-800">{detail.digitable_line}</p>
                <button
                  type="button"
                  onClick={() => copyText('Linha digitável', detail.digitable_line)}
                  className="mt-2 text-xs font-semibold text-sky-700 hover:underline"
                >
                  Copiar
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {payLink(detail) && (
                <a
                  href={payLink(detail)!}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {detail.payment_method === 'credit_card' ? 'Abrir link' : 'Abrir boleto'}
                </a>
              )}
              <button
                type="button"
                disabled={syncing}
                onClick={() => syncOne(detail.id)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
              >
                Atualizar status
              </button>
              {(detail.status === 'pending' || detail.status === 'expired') && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => cancelCharge(detail.id)}
                  className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
