'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/sonner'
import { supabase } from '@/lib/supabase'
import {
  buildCalendarCells,
  formatTimeShort,
  parseLocalYMD,
  toLocalYMD,
  toTimeInputValue,
} from '@/lib/agenda'

export type AgendaActivity = {
  id: string
  user_id: string
  title: string
  description: string | null
  activity_date: string
  activity_time: string | null
  created_at?: string
  updated_at?: string
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function AgendaPage() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedYmd, setSelectedYmd] = useState(toLocalYMD(now))
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<AgendaActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modal, setModal] = useState<
    null | { mode: 'create' } | { mode: 'edit'; activity: AgendaActivity }
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<AgendaActivity | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth])
  const rangeMin = cells[0].ymd
  const rangeMax = cells[41].ymd

  const byDate = useMemo(() => {
    const m = new Map<string, AgendaActivity[]>()
    for (const r of rows) {
      const k = r.activity_date
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    for (const [, list] of m) {
      list.sort((a, b) => {
        const ta = a.activity_time || ''
        const tb = b.activity_time || ''
        if (!a.activity_time && !b.activity_time) return 0
        if (!a.activity_time) return 1
        if (!b.activity_time) return -1
        return ta.localeCompare(tb)
      })
    }
    return m
  }, [rows])

  const selectedList = byDate.get(selectedYmd) ?? []

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setLoadError(null)
    const { data, error } = await supabase
      .from('user_agenda_activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('activity_date', rangeMin)
      .lte('activity_date', rangeMax)
      .order('activity_date', { ascending: true })
      .order('activity_time', { ascending: true, nullsFirst: false })

    if (error) {
      setRows([])
      setLoadError(
        error.message.includes('relation') || error.code === '42P01'
          ? 'Tabela ainda não existe. Execute o ficheiro supabase-migrations-user-agenda.sql no Supabase (SQL Editor).'
          : error.message
      )
      return
    }
    setRows((data as AgendaActivity[]) || [])
  }, [rangeMin, rangeMax])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  function openCreate() {
    setModal({ mode: 'create' })
    setFormTitle('')
    setFormDescription('')
    setFormDate(selectedYmd)
    setFormTime('')
  }

  function openEdit(a: AgendaActivity) {
    setModal({ mode: 'edit', activity: a })
    setFormTitle(a.title)
    setFormDescription(a.description || '')
    setFormDate(a.activity_date)
    setFormTime(toTimeInputValue(a.activity_time))
  }

  async function submitForm() {
    if (!userId || !formTitle.trim() || !formDate) return
    const wasEdit = modal?.mode === 'edit'
    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        activity_date: formDate,
        activity_time: formTime.trim() ? `${formTime.trim()}:00`.slice(0, 8) : null,
      }
      if (modal?.mode === 'create') {
        const { error } = await supabase.from('user_agenda_activities').insert({
          user_id: userId,
          ...payload,
        })
        if (error) throw error
      } else if (modal?.mode === 'edit') {
        const { error } = await supabase
          .from('user_agenda_activities')
          .update(payload)
          .eq('id', modal.activity.id)
          .eq('user_id', userId)
        if (error) throw error
      }
      setModal(null)
      await load()
      toast.success(wasEdit ? 'Atividade atualizada.' : 'Atividade criada.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function executeDelete() {
    if (!userId || !deleteTarget) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_agenda_activities')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('user_id', userId)
      if (error) throw error
      setDeleteTarget(null)
      await load()
      toast.success('Atividade removida.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao remover'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const yearOptions: number[] = []
  const y0 = now.getFullYear()
  for (let y = y0 - 2; y <= y0 + 5; y++) yearOptions.push(y)

  const todayYmd = toLocalYMD(new Date())

  return (
    <div className="max-w-5xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 md:py-10 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <Link href="/dashboard" className="hover:text-violet-600">
              Dashboard
            </Link>{' '}
            / Agenda
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Calendário e agenda</h1>
          <p className="text-sm text-slate-500 mt-2">
            Marque atividades por dia, com horário opcional. Vê lembretes na home ao entrar.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!!loadError}
          className="shrink-0 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50"
        >
          Nova atividade
        </button>
      </header>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Mês anterior"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  const d = new Date(viewYear, viewMonth - 1, 1)
                  setViewYear(d.getFullYear())
                  setViewMonth(d.getMonth())
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Próximo mês"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  const d = new Date(viewYear, viewMonth + 1, 1)
                  setViewYear(d.getFullYear())
                  setViewMonth(d.getMonth())
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-bold text-slate-600 capitalize">{monthLabel}</p>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((c) => {
              const count = byDate.get(c.ymd)?.length ?? 0
              const isSel = c.ymd === selectedYmd
              const isToday = c.ymd === todayYmd
              return (
                <button
                  key={c.ymd}
                  type="button"
                  onClick={() => setSelectedYmd(c.ymd)}
                  className={[
                    'relative min-h-[3rem] sm:min-h-[3.25rem] rounded-xl text-sm font-semibold transition-colors border',
                    isSel
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-transparent hover:bg-slate-50 text-slate-700',
                    !c.inCurrentMonth ? 'opacity-40' : '',
                    isToday && !isSel ? 'ring-1 ring-indigo-300' : '',
                  ].join(' ')}
                >
                  <span className="block pt-1">{c.date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {parseLocalYMD(selectedYmd).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <button
              type="button"
              onClick={openCreate}
              disabled={!!loadError}
              className="text-[10px] font-black uppercase text-indigo-600 hover:underline disabled:opacity-50"
            >
              + Adicionar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">A carregar…</p>
          ) : selectedList.length === 0 ? (
            <p className="text-sm text-slate-500 flex-1">Nenhuma atividade neste dia.</p>
          ) : (
            <ul className="space-y-3 flex-1 overflow-y-auto max-h-[420px]">
              {selectedList.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{a.title}</p>
                      {a.activity_time && (
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">
                          {formatTimeShort(a.activity_time)}
                        </p>
                      )}
                      {a.description && (
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{a.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 border border-transparent hover:border-slate-200"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(a)}
                        disabled={saving}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-red-600 border border-transparent hover:border-slate-200"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {modal.mode === 'create' ? 'Nova atividade' : 'Editar atividade'}
            </h3>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Título *
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex.: Reunião com cliente"
              />
            </label>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Descrição
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[88px]"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Notas ou detalhes…"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Data *
                <input
                  type="date"
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Horário
                <input
                  type="time"
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={saving || !formTitle.trim() || !formDate}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-agenda-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 id="delete-agenda-title" className="text-lg font-bold text-slate-800">
              Remover atividade?
            </h3>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{deleteTarget.title}</span> será apagada de forma permanente.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void executeDelete()}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'A remover…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
