'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'
import { formatDateBr } from '@/lib/admin-systems'
import {
  AGENDA_CATEGORIES,
  MONTH_LABELS,
  WEEKDAY_LABELS,
  categoryMeta,
  eventColor,
  formatTimeBr,
  monthMatrix,
  todayIsoInCuiaba,
  type AgendaCategory,
  type AgendaEvent,
} from '@/lib/admin-agenda'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

type FormState = {
  title: string
  description: string
  location: string
  event_date: string
  event_time: string
  category: AgendaCategory
  notify_enabled: boolean
}

function emptyForm(dateIso?: string): FormState {
  return {
    title: '',
    description: '',
    location: '',
    event_date: dateIso || todayIsoInCuiaba(),
    event_time: '',
    category: 'geral',
    notify_enabled: true,
  }
}

function timeForInput(t: string | null): string {
  if (!t) return ''
  const m = t.match(/^(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : ''
}

export default function AdminAgendaPage() {
  const today = todayIsoInCuiaba()
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return { year: y, month: m - 1 }
  })
  const [selectedDate, setSelectedDate] = useState(today)
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaEvent | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategory | 'all'>('all')
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const range = useMemo(() => {
    const y = cursor.year
    const m = cursor.month
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const last = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate()
    const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    // carrega um pouco além do mês (próximos 60 dias para “próximos”)
    const upcomingTo = new Date(Date.UTC(y, m, 1, 12))
    upcomingTo.setUTCMonth(upcomingTo.getUTCMonth() + 3)
    const toWide = upcomingTo.toISOString().slice(0, 10)
    return { from, to, toWide }
  }, [cursor])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(
        `/api/admin/agenda?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.toWide)}`,
        { headers },
      )
      const json = (await res.json()) as { events?: AgendaEvent[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar agenda.')
      setEvents(json.events ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.toWide])

  useEffect(() => {
    void load()
  }, [load])

  const weeks = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.event_date]) map[ev.event_date] = []
      map[ev.event_date].push(ev)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''))
    }
    return map
  }, [events])

  const dayEvents = useMemo(() => {
    let list = eventsByDate[selectedDate] ?? []
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          (e.location ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [eventsByDate, selectedDate, categoryFilter, query])

  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.event_date >= today)
      .filter((e) => (categoryFilter === 'all' ? true : e.category === categoryFilter))
      .slice(0, 12)
  }, [events, today, categoryFilter])

  function openCreate(dateIso?: string) {
    setEditing(null)
    setForm(emptyForm(dateIso || selectedDate))
    setEditorOpen(true)
  }

  function openEdit(ev: AgendaEvent) {
    setEditing(ev)
    setForm({
      title: ev.title,
      description: ev.description ?? '',
      location: ev.location ?? '',
      event_date: ev.event_date,
      event_time: timeForInput(ev.event_time),
      category: (AGENDA_CATEGORIES.some((c) => c.id === ev.category)
        ? ev.category
        : 'geral') as AgendaCategory,
      notify_enabled: ev.notify_enabled,
    })
    setEditorOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Informe o nome do evento.')
      return
    }
    setSaving(true)
    try {
      const headers = await authHeaders()
      const payload = {
        title: form.title.trim(),
        description: form.description,
        location: form.location,
        event_date: form.event_date,
        event_time: form.event_time || null,
        category: form.category,
        notify_enabled: form.notify_enabled,
      }
      const res = await fetch('/api/admin/agenda', {
        method: editing ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar.')
      toast.success(editing ? 'Evento atualizado.' : 'Evento criado.')
      setEditorOpen(false)
      setSelectedDate(form.event_date)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onRemove(ev: AgendaEvent) {
    const ok = await confirm({
      title: 'Excluir evento?',
      description: `"${ev.title}" em ${formatDateBr(ev.event_date)} será removido.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/agenda?id=${encodeURIComponent(ev.id)}`, {
        method: 'DELETE',
        headers,
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir.')
      toast.success('Evento excluído.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir.')
    }
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month + delta, 1, 12))
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
    })
  }

  function goToday() {
    const [y, m, day] = today.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
    setSelectedDate(today)
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {confirmDialog}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Agenda pessoal</h2>
          <p className="mt-1 text-sm text-slate-600">
            Calendário completo · vários eventos por dia · avisos no Telegram (véspera + no dia / 2h antes).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Novo evento
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Calendário */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <h3 className="min-w-[10rem] text-center text-base font-bold text-slate-900">
                {MONTH_LABELS[cursor.month]} {cursor.year}
              </h3>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={cursor.month}
                onChange={(e) => setCursor((c) => ({ ...c, month: Number(e.target.value) }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold"
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={cursor.year}
                onChange={(e) => setCursor((c) => ({ ...c, year: Number(e.target.value) }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold"
              >
                {Array.from({ length: 12 }, (_, i) => today.split('-').map(Number)[0] - 2 + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {weeks.flat().map((iso, idx) => {
              if (!iso) {
                return <div key={`e-${idx}`} className="min-h-[4.5rem] rounded-xl bg-slate-50/50" />
              }
              const dayNum = Number(iso.slice(8, 10))
              const list = eventsByDate[iso] ?? []
              const isToday = iso === today
              const isSelected = iso === selectedDate
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  onDoubleClick={() => openCreate(iso)}
                  className={`min-h-[4.5rem] rounded-xl border p-1.5 text-left transition ${
                    isSelected
                      ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                      : isToday
                        ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? 'bg-emerald-600 text-white' : 'text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate rounded px-1 py-0.5 text-[9px] font-semibold text-white"
                        style={{ backgroundColor: eventColor(ev) }}
                        title={ev.title}
                      >
                        {ev.event_time ? formatTimeBr(ev.event_time).slice(0, 5) + ' ' : ''}
                        {ev.title}
                      </div>
                    ))}
                    {list.length > 3 ? (
                      <div className="text-[9px] font-medium text-slate-500">+{list.length - 3}</div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Clique no dia para ver detalhes · duplo clique para criar evento. Fuso dos avisos: Cuiabá-MT.
          </p>
        </div>

        {/* Painel do dia + próximos */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Dia selecionado</h3>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{formatDateBr(selectedDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => openCreate(selectedDate)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white"
              >
                + Neste dia
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no dia..."
                className={inputClass}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as AgendaCategory | 'all')}
                className={inputClass}
              >
                <option value="all">Todas categorias</option>
                {AGENDA_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Carregando...</p>
              ) : dayEvents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  Nenhum evento neste dia.
                </p>
              ) : (
                dayEvents.map((ev) => <EventCard key={ev.id} ev={ev} onEdit={openEdit} onRemove={onRemove} />)
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Próximos</h3>
            <ul className="mt-3 space-y-2">
              {upcoming.length === 0 ? (
                <li className="text-sm text-slate-500">Nada agendado à frente.</li>
              ) : (
                upcoming.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(ev.event_date)
                        const [y, m] = ev.event_date.split('-').map(Number)
                        setCursor({ year: y, month: m - 1 })
                      }}
                      className="flex w-full items-start gap-2 rounded-xl border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: eventColor(ev) }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{ev.title}</span>
                        <span className="text-[11px] text-slate-500">
                          {formatDateBr(ev.event_date)} · {formatTimeBr(ev.event_time)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
            <strong className="text-slate-800">Telegram:</strong> sem horário → avisa 1 dia antes (08h) e no dia
            (08h). Com horário → avisa 1 dia antes (08h) e ~2h antes no dia. Fuso Cuiabá-MT.
          </div>
        </div>
      </div>

      {editorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">
              {editing ? 'Editar evento' : 'Novo evento'}
            </h3>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <Field label="Nome">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex.: Reunião com cliente"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data">
                  <input
                    type="date"
                    required
                    value={form.event_date}
                    onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Horário (opcional)">
                  <input
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Categoria">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as AgendaCategory }))
                  }
                  className={inputClass}
                >
                  {AGENDA_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Local">
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className={inputClass}
                  placeholder="Online, escritório..."
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className={inputClass}
                  placeholder="Detalhes, link da call, o que levar..."
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notify_enabled}
                  onChange={(e) => setForm((f) => ({ ...f, notify_enabled: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Avisar no Telegram
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function EventCard({
  ev,
  onEdit,
  onRemove,
}: {
  ev: AgendaEvent
  onEdit: (ev: AgendaEvent) => void
  onRemove: (ev: AgendaEvent) => void
}) {
  const cat = categoryMeta(ev.category)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: eventColor(ev) }}
            />
            <h4 className="truncate text-sm font-bold text-slate-900">{ev.title}</h4>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {cat.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatTimeBr(ev.event_time)}
            {ev.location ? ` · ${ev.location}` : ''}
            {ev.notify_enabled ? ' · 🔔 Telegram' : ' · sem aviso'}
          </p>
          {ev.description ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-600">{ev.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(ev)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onRemove(ev)}
            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-rose-700 hover:bg-rose-50"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
