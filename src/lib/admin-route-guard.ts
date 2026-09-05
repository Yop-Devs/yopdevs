import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isEmailAllowed } from '@/lib/allowed-emails'
import { adminPublicUrl, isAdminHost, adminPaths } from '@/lib/admin-host'
import { getServerSessionUser } from '@/lib/supabase-server'

/** Redireciona rotas do admin para o subdomínio quando acessadas no site principal. */
export async function requireAdminHost(path = '/login') {
  const host = (await headers()).get('x-forwarded-host') ?? (await headers()).get('host')
  if (!isAdminHost(host)) {
    redirect(adminPublicUrl(path))
  }
}

/**
 * Exige host admin + sessão + e-mail allowlist (server-side).
 * Redirect relativo no próprio host — evita loop com ADMIN_ORIGIN.
 */
export async function requireAdminSession(loginPath = adminPaths.login) {
  await requireAdminHost(loginPath)

  const user = await getServerSessionUser()
  if (!user) {
    redirect(`${loginPath}?error=session`)
  }
  if (!isEmailAllowed(user.email)) {
    redirect(`${loginPath}?error=unauthorized`)
  }

  return user
}
