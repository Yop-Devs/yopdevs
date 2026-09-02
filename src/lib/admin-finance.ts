export type FinanceKind = 'entrada' | 'saida'

export type FinanceEntry = {
  id: string
  kind: FinanceKind
  title: string
  amount: number
  entry_date: string
  notes: string | null
  created_at: string
  updated_at: string
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
