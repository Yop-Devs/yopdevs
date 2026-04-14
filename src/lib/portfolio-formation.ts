export type PortfolioFormationEntry = {
  institution: string
  course: string
  year: string | null
}

const MAX_ITEMS = 200
const MAX_FIELD_LEN = 400

function clip(s: string): string {
  const t = s.trim()
  return t.length > MAX_FIELD_LEN ? t.slice(0, MAX_FIELD_LEN) : t
}

export function parseFormationEntries(raw: unknown): PortfolioFormationEntry[] {
  if (!raw || !Array.isArray(raw)) return []
  const out: PortfolioFormationEntry[] = []
  for (const item of raw.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const institution = typeof o.institution === 'string' ? clip(o.institution) : ''
    const course = typeof o.course === 'string' ? clip(o.course) : ''
    const yearRaw = o.year
    const year =
      yearRaw === null || yearRaw === undefined
        ? null
        : typeof yearRaw === 'string'
          ? clip(yearRaw) || null
          : String(yearRaw).slice(0, 32)
    if (!institution && !course) continue
    out.push({ institution, course, year })
  }
  return out
}

export function formationEntriesForDatabase(entries: PortfolioFormationEntry[]): PortfolioFormationEntry[] {
  return entries
    .slice(0, MAX_ITEMS)
    .map((e) => ({
      institution: e.institution.trim().slice(0, MAX_FIELD_LEN),
      course: e.course.trim().slice(0, MAX_FIELD_LEN),
      year: e.year?.trim() ? e.year.trim().slice(0, 32) : null,
    }))
    .filter((e) => e.institution.length > 0 || e.course.length > 0)
}
