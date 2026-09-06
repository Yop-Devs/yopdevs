import 'server-only'

/** Emails autorizados a autenticar e aceder à área privada (admin). */

const FALLBACK_ADMIN_EMAILS = ['gabrielcarrarapessoal@gmail.com'] as const

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Lista efetiva de admins.
 * Preferência: YOP_ADMIN_EMAILS (server) → NEXT_PUBLIC_YOP_ADMIN_EMAILS → fallback.
 * Manter o mesmo e-mail na função SQL is_yop_admin() ao alterar.
 *
 * Este módulo é server-only — não importar em Client Components.
 */
export function getAllowedAdminEmails(): string[] {
  const fromServer = parseEmailList(process.env.YOP_ADMIN_EMAILS)
  if (fromServer.length) return [...new Set(fromServer)]

  const fromPublic = parseEmailList(process.env.NEXT_PUBLIC_YOP_ADMIN_EMAILS)
  if (fromPublic.length) return [...new Set(fromPublic)]

  return [...FALLBACK_ADMIN_EMAILS]
}

/** @deprecated use getAllowedAdminEmails — mantido para imports existentes */
export const ALLOWED_EMAILS = FALLBACK_ADMIN_EMAILS

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return getAllowedAdminEmails().some((allowed) => allowed === normalized)
}
