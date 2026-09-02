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
  sistemas: '/sistemas',
  clientes: '/clientes',
  pagamentos: '/pagamentos',
} as const

export type AdminPath = (typeof adminPaths)[keyof typeof adminPaths]

export function adminPublicUrl(path: AdminPath | string, search = ''): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${ADMIN_ORIGIN}${normalized}${search}`
}

/** Converte rota pública do subdomínio para rota interna do App Router. */
export function toAdminInternalPath(pathname: string): string {
  if (pathname === '/' || pathname === '/login') return '/admin/login'
  if (pathname.startsWith('/admin')) return pathname
  if (pathname.startsWith('/auth')) return pathname
  return `/admin${pathname}`
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
