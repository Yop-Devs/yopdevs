/** Datas da agenda no fuso local (evita deslocar o dia ao usar UTC). */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function toLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseLocalYMD(s: string): Date {
  const [y, m, da] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, da || 1)
}

/** Postgres time / string → "HH:MM" para exibir */
export function formatTimeShort(s: string | null | undefined): string {
  if (!s) return ''
  const p = String(s).slice(0, 5)
  return p.length >= 5 ? p : ''
}

/** Valor para <input type="time" /> */
export function toTimeInputValue(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).slice(0, 5)
}

/** Segunda = primeira coluna */
export function buildCalendarCells(year: number, month0: number): { ymd: string; date: Date; inCurrentMonth: boolean }[] {
  const first = new Date(year, month0, 1)
  const lead = (first.getDay() + 6) % 7
  const start = new Date(year, month0, 1 - lead)
  const cells: { ymd: string; date: Date; inCurrentMonth: boolean }[] = []
  const cur = new Date(start)
  for (let i = 0; i < 42; i++) {
    cells.push({
      ymd: toLocalYMD(cur),
      date: new Date(cur),
      inCurrentMonth: cur.getMonth() === month0,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}
