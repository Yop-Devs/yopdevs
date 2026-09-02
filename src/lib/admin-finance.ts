export type FinanceKind = 'entrada' | 'saida'

export type FinanceEntry = {
  id: string
  kind: FinanceKind
  title: string
  amount: number
  entry_date: string
  notes: string | null
  is_recurring: boolean
  recurrence_interval_days: number | null
  created_at: string
  updated_at: string
}

/** Linha expandida para a planilha (recorrência gera várias datas). */
export type FinanceOccurrence = {
  key: string
  entry: FinanceEntry
  date: string
  isProjected: boolean
}

export type SystemFinanceItem = {
  id: string
  source: 'parcel' | 'fee'
  title: string
  subtitle: string
  amount: number
  date: string
  system_id: string
}

export type FinancePeriodPreset = 'all' | 'this_month' | 'last_month' | 'next_30' | 'custom'

export function toNumberAmount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function periodBounds(
  preset: FinancePeriodPreset,
  customFrom?: string,
  customTo?: string,
): { from: string | null; to: string | null; label: string } {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0)
  const in30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)

  switch (preset) {
    case 'this_month':
      return {
        from: toIsoDate(startOfMonth),
        to: toIsoDate(endOfMonth),
        label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      }
    case 'last_month':
      return {
        from: toIsoDate(startOfLast),
        to: toIsoDate(endOfLast),
        label: startOfLast.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      }
    case 'next_30':
      return {
        from: toIsoDate(now),
        to: toIsoDate(in30),
        label: 'Próximos 30 dias',
      }
    case 'custom':
      return {
        from: customFrom || null,
        to: customTo || null,
        label:
          customFrom || customTo
            ? `${customFrom ? customFrom.split('-').reverse().join('/') : '…'} — ${customTo ? customTo.split('-').reverse().join('/') : '…'}`
            : 'Personalizado',
      }
    default:
      return { from: null, to: null, label: 'Todo o período' }
  }
}

export function isDateInPeriod(dateIso: string, from: string | null, to: string | null): boolean {
  if (!dateIso) return false
  if (from && dateIso < from) return false
  if (to && dateIso > to) return false
  return true
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/** Horizonte padrão quando o filtro é “todo o período”. */
export function defaultRecurrenceHorizon(startIso: string): { from: string; to: string } {
  const today = toIsoDate(new Date())
  const from = startIso < today ? startIso : today
  const to = addDaysIso(today > startIso ? today : startIso, 365)
  return { from, to }
}

/**
 * Gera as datas de uma entrada recorrente dentro do intervalo.
 * Se from/to forem null, usa 1 ano a partir de hoje (ou da data base).
 */
export function expandRecurringDates(
  startIso: string,
  intervalDays: number,
  from: string | null,
  to: string | null,
): string[] {
  if (!startIso || !Number.isFinite(intervalDays) || intervalDays <= 0) return []

  const horizon =
    from || to
      ? { from: from || startIso, to: to || addDaysIso(toIsoDate(new Date()), 365) }
      : defaultRecurrenceHorizon(startIso)

  const dates: string[] = []
  let cursor = startIso
  let guard = 0

  // Avança até entrar na janela
  while (cursor < horizon.from && guard < 10000) {
    cursor = addDaysIso(cursor, intervalDays)
    guard += 1
  }

  while (cursor <= horizon.to && guard < 10000) {
    dates.push(cursor)
    cursor = addDaysIso(cursor, intervalDays)
    guard += 1
  }

  return dates
}

export function expandFinanceEntries(
  entries: FinanceEntry[],
  from: string | null,
  to: string | null,
): FinanceOccurrence[] {
  const rows: FinanceOccurrence[] = []

  for (const entry of entries) {
    const recurring =
      entry.is_recurring &&
      entry.recurrence_interval_days != null &&
      entry.recurrence_interval_days > 0

    if (!recurring) {
      if (isDateInPeriod(entry.entry_date, from, to)) {
        rows.push({
          key: entry.id,
          entry,
          date: entry.entry_date,
          isProjected: false,
        })
      }
      continue
    }

    const dates = expandRecurringDates(entry.entry_date, entry.recurrence_interval_days!, from, to)
    for (const date of dates) {
      rows.push({
        key: `${entry.id}:${date}`,
        entry,
        date,
        isProjected: date !== entry.entry_date,
      })
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.entry.title.localeCompare(b.entry.title))
  return rows
}
