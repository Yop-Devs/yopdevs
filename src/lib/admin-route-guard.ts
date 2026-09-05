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
 * Complementa o gate do layout-client e o RLS is_yop_admin().
 */
export async function requireAdminSession(loginPath = adminPaths.login) {
  await requireAdminHost(loginPath)

  const user = await getServerSessionUser()
  if (!user) {
    redirect(adminPublicUrl(`${loginPath}?error=session`))
  }
  if (!isEmailAllowed(user.email)) {
    redirect(adminPublicUrl(`${loginPath}?error=unauthorized`))
  }

  return user
}
