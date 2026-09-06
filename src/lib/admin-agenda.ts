/** Agenda pessoal — tipos, categorias e helpers de data (America/Cuiaba). */

export const AGENDA_TZ = 'America/Cuiaba'

export const AGENDA_CATEGORIES = [
  { id: 'geral', label: 'Geral', color: '#64748b' },
  { id: 'pessoal', label: 'Pessoal', color: '#8b5cf6' },
  { id: 'trabalho', label: 'Trabalho', color: '#2563eb' },
  { id: 'reuniao', label: 'Reunião', color: '#0891b2' },
  { id: 'pagamento', label: 'Pagamento', color: '#059669' },
  { id: 'lembrete', label: 'Lembrete', color: '#d97706' },
  { id: 'outro', label: 'Outro', color: '#e11d48' },
] as const

export type AgendaCategory = (typeof AGENDA_CATEGORIES)[number]['id']

export type AgendaEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  event_date: string
  event_time: string | null
  category: AgendaCategory
  color: string | null
  notify_enabled: boolean
  notified_day_before_at: string | null
  notified_day_of_at: string | null
  notified_two_hours_before_at: string | null
  created_at: string
  updated_at: string
}

export type AgendaEventInput = {
  title: string
  description?: string | null
  location?: string | null
  event_date: string
  event_time?: string | null
  category?: AgendaCategory
  color?: string | null
  notify_enabled?: boolean
}

export function categoryMeta(category: string | null | undefined) {
  return (
    AGENDA_CATEGORIES.find((c) => c.id === category) ?? AGENDA_CATEGORIES[0]
  )
}

export function eventColor(ev: Pick<AgendaEvent, 'color' | 'category'>): string {
  if (ev.color?.trim()) return ev.color.trim()
  return categoryMeta(ev.category).color
}

/** Partes de data/hora no fuso de Cuiabá. */
export function cuiabaParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    dateIso: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

export function todayIsoInCuiaba(now = new Date()): string {
  return cuiabaParts(now).dateIso
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatTimeBr(time: string | null | undefined): string {
  if (!time) return 'Dia inteiro'
  const m = time.match(/^(\d{2}):(\d{2})/)
  if (!m) return time
  return `${m[1]}:${m[2]}`
}

export function normalizeTimeInput(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const min = Math.min(59, Math.max(0, Number(m[2])))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
}

export function monthMatrix(year: number, monthIndex0: number): (string | null)[][] {
  // monthIndex0: 0=jan
  const first = new Date(Date.UTC(year, monthIndex0, 1, 12))
  const startPad = (first.getUTCDay() + 6) % 7 // segunda = 0
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0, 12)).getUTCDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(iso)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

export const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const
