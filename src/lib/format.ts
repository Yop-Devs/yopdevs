/** Data relativa: "agora mesmo", "há 2h", "há 3 dias" */
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffD === 1) return 'há 1 dia'
  if (diffD < 7) return `há ${diffD} dias`
  return date.toLocaleDateString('pt-BR')
}

/** Nome em title case: "YOP Moderator" */
export function formatAuthorName(name: string | null | undefined): string {
  if (!name?.trim()) return 'Anônimo'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
