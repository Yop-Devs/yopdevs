import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminPublicUrl, isAdminHost } from '@/lib/admin-host'

/** Redireciona rotas do admin para o subdomínio quando acessadas no site principal. */
export async function requireAdminHost(path = '/login') {
  const host = (await headers()).get('x-forwarded-host') ?? (await headers()).get('host')
  if (!isAdminHost(host)) {
    redirect(adminPublicUrl(path))
  }
}
