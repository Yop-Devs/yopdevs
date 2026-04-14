export type PortfolioSkillCard = {
  title: string
  tags: string[]
}

export const MAX_SKILL_CARDS = 4
export const MAX_TAGS_PER_CARD = 40

export function parseSkillCards(raw: unknown): PortfolioSkillCard[] {
  if (!raw || !Array.isArray(raw)) return []
  const out: PortfolioSkillCard[] = []
  for (const item of raw.slice(0, MAX_SKILL_CARDS)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title : ''
    const tagsRaw = o.tags
    const tags = Array.isArray(tagsRaw)
      ? [...new Set(tagsRaw.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean))].slice(0, MAX_TAGS_PER_CARD)
      : []
    if (!title.trim() && tags.length === 0) continue
    out.push({ title, tags })
  }
  return out
}

/** Cartões válidos para gravar (título obrigatório; tags opcionais). */
export function skillCardsForDatabase(cards: PortfolioSkillCard[]): PortfolioSkillCard[] {
  return cards
    .slice(0, MAX_SKILL_CARDS)
    .map((c) => ({
      title: c.title.trim(),
      tags: [...new Set(c.tags.map((t) => t.trim()).filter(Boolean))].slice(0, MAX_TAGS_PER_CARD),
    }))
    .filter((c) => c.title.length > 0)
}
