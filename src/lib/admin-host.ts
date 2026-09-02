import type { NextRequest } from 'next/server'

/** Host da requisição (Vercel/proxies podem usar x-forwarded-host). */
export function getRequestHost(
  request: Pick<NextRequest, 'headers'> | { headers: { get(name: string): string | null } }
): string | null {
  return (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host')
  )
}

/** Hosts da área admin (subdomínio). */
export function isAdminHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false
  const host = hostname.toLowerCase().split(':')[0]
  return host === 'admin.yopdevs.com.br' || host.startsWith('admin.')
}

export function isMainSiteHost(hostname: string | null | undefined): boolean {
  if (!hostname) return true
  const host = hostname.toLowerCase().split(':')[0]
  if (isAdminHost(host)) return false
  return (
    host === 'yopdevs.com.br' ||
    host === 'www.yopdevs.com.br' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app')
  )
}

export const ADMIN_ORIGIN =
  process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'https://admin.yopdevs.com.br'

export const MAIN_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://yopdevs.com.br'

/** Caminhos públicos no subdomínio admin (sem prefixo /admin). */
export const adminPaths = {
  login: '/login',
  dashboard: '/dashboard',
  financeiro: '/financeiro',
  sistemas: '/sistemas',
  clientes: '/clientes',
  pagamentos: '/pagamentos',
  cobranca: '/cobranca',
} as const

export type AdminPath = (typeof adminPaths)[keyof typeof adminPaths]

export const adminOnlyPrefixes = [
  adminPaths.login,
  adminPaths.dashboard,
  adminPaths.financeiro,
  adminPaths.sistemas,
  adminPaths.clientes,
  adminPaths.pagamentos,
  adminPaths.cobranca,
] as const

export function isAdminOnlyPath(pathname: string): boolean {
  return adminOnlyPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function adminPublicUrl(path: AdminPath | string, search = ''): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${ADMIN_ORIGIN}${normalized}${search}`
}

/** Remove prefixo /admin para URL canônica no subdomínio. */
export function toAdminPublicPath(pathname: string): string {
  if (pathname === '/admin' || pathname === '/admin/') return '/'
  if (pathname.startsWith('/admin/')) {
    const stripped = pathname.slice('/admin'.length)
    return stripped === '/login' ? '/login' : stripped
  }
  return pathname
}
