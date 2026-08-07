/** Emails autorizados a autenticar e aceder à área privada. */
export const ALLOWED_EMAILS = ['gabrielcarrarapessoal@gmail.com'] as const

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return ALLOWED_EMAILS.some((allowed) => allowed.toLowerCase() === normalized)
}
