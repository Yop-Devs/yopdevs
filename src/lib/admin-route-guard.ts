import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isEmailAllowed } from '@/lib/allowed-emails'
import { adminPublicUrl, isAdminHost, adminPaths } from '@/lib/admin-host'
import { createSupabaseServerClient, getServerSessionUser } from '@/lib/supabase-server'

/** Redireciona rotas do admin para o subdomínio quando acessadas no site principal. */
export async function requireAdminHost(path = '/login') {
  const host = (await headers()).get('x-forwarded-host') ?? (await headers()).get('host')
  if (!isAdminHost(host)) {
    redirect(adminPublicUrl(path))
  }
}

/**
 * Exige host admin + sessão + e-mail allowlist (server-side).
 * Se 2FA estiver ativo e a sessão ainda for AAL1, manda para o login.
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

  // Segurança 2FA: se o fator TOTP existe, exige AAL2 (exceto na própria tela de segurança/login).
  try {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
        redirect(`${loginPath}?error=mfa`)
      }
    }
  } catch {
    // se MFA API falhar, não trava o painel
  }

  return user
}
