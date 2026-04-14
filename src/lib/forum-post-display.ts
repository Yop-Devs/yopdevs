/**
 * Evita título + corpo repetidos quando o título era só o prefixo do texto (comportamento antigo)
 * ou quando o título coincide com o início do corpo seguido de espaço/quebra.
 */
export function forumPostHeadlineAndBody(
  rawTitle: string | null | undefined,
  rawContent: string | null | undefined
): { showHeadline: boolean; headline: string; body: string } {
  const body = String(rawContent ?? '').trim()
  const title = String(rawTitle ?? '').trim()
  if (!body && title) return { showHeadline: true, headline: title, body: '' }
  if (!title) return { showHeadline: false, headline: '', body }
  if (body === title) return { showHeadline: false, headline: '', body }
  if (!body.startsWith(title)) return { showHeadline: true, headline: title, body }
  const rest = body.slice(title.length)
  if (rest.length === 0) return { showHeadline: false, headline: '', body }
  if (/^\s/.test(rest)) return { showHeadline: false, headline: '', body }
  return { showHeadline: true, headline: title, body }
}
