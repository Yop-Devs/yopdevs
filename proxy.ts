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
import { buildContentSecurityPolicy, CSP_NONCE } from '@/lib/csp'

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/projetos') ||
    pathname.startsWith('/brand') ||
    Boolean(pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|txt|xml|js|css|woff2?)$/))
  )
}

/** Injeta CSP+nonce no request para o Next carimbar scripts (header HTTP vem do next.config). */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = getRequestHost(request)
  const onAdminHost = isAdminHost(host)

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

  if (onAdminHost && (pathname === '/' || pathname === '')) {
    const target = request.nextUrl.clone()
    target.pathname = adminPaths.login
    target.search = search
    return NextResponse.redirect(target)
  }

  if (onAdminHost && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const publicPath = toAdminPublicPath(pathname)
    const target = request.nextUrl.clone()
    target.pathname = publicPath
    target.search = search
    return NextResponse.redirect(target)
  }

  const csp = buildContentSecurityPolicy(CSP_NONCE)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', CSP_NONCE)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
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
            response = NextResponse.next({ request: { headers: requestHeaders } })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: requestHeaders } })
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
