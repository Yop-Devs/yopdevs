import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_ORIGIN,
  adminPaths,
  getRequestHost,
  isAdminHost,
  isAdminOnlyPath,
  isMainSiteHost,
  toAdminPublicPath,
} from '@/lib/admin-host'

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/projetos') ||
    pathname.startsWith('/brand') ||
    Boolean(pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|txt|xml|js|css|woff2?)$/))
  )
}

/** Proxy Next 16: redirects de host + refresh de sessão. CSP fica no next.config.ts. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = getRequestHost(request)
  const onAdminHost = isAdminHost(host)

  // Site principal: rotas do admin só existem no subdomínio
  if (!onAdminHost && isMainSiteHost(host)) {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const publicPath = toAdminPublicPath(pathname)
      const target = new URL(publicPath, ADMIN_ORIGIN)
      target.search = search
      return NextResponse.redirect(target)
    }

    if (isAdminOnlyPath(pathname)) {
      const target = new URL(pathname, ADMIN_ORIGIN)
      target.search = search
      return NextResponse.redirect(target)
    }
  }

  // Subdomínio admin: raiz → login
  if (onAdminHost && (pathname === '/' || pathname === '')) {
    const target = request.nextUrl.clone()
    target.pathname = adminPaths.login
    target.search = search
    return NextResponse.redirect(target)
  }

  // Subdomínio: URLs antigas /admin/* → caminhos limpos
  if (onAdminHost && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const publicPath = toAdminPublicPath(pathname)
    const target = request.nextUrl.clone()
    target.pathname = publicPath
    target.search = search
    return NextResponse.redirect(target)
  }

  let response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  const needsAuthRefresh =
    (onAdminHost && isAdminOnlyPath(pathname) && !isStaticAsset(pathname)) ||
    pathname.startsWith('/auth')

  if (needsAuthRefresh) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({
              request: { headers: new Headers(request.headers) },
            })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({
              request: { headers: new Headers(request.headers) },
            })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      },
    )

    await supabase.auth.getUser()
  }

  return response
}

export const config = {
  matcher: [
    '/',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
