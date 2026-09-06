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
import { supabaseAuthCookieOptions } from '@/lib/auth-cookies'
import { buildContentSecurityPolicy, createRequestNonce } from '@/lib/csp'

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/projetos') ||
    pathname.startsWith('/brand') ||
    Boolean(pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|txt|xml|js|css|woff2?)$/))
  )
}

function applySecurityHeaders(response: NextResponse, nonce: string, csp: string) {
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)
  return response
}

/** Injeta CSP + nonce por request para o Next carimbar scripts. */
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

  const nonce = createRequestNonce()
  const csp = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  applySecurityHeaders(response, nonce, csp)

  const needsAuthRefresh =
    (onAdminHost && isAdminOnlyPath(pathname) && !isStaticAsset(pathname)) ||
    pathname.startsWith('/auth')

  if (needsAuthRefresh) {
    const cookieBase = supabaseAuthCookieOptions()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: cookieBase,
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            const merged = { ...cookieBase, ...options }
            request.cookies.set({ name, value, ...merged })
            response = NextResponse.next({ request: { headers: requestHeaders } })
            applySecurityHeaders(response, nonce, csp)
            response.cookies.set({ name, value, ...merged })
          },
          remove(name: string, options: Record<string, unknown>) {
            const merged = { ...cookieBase, ...options, maxAge: 0 }
            request.cookies.set({ name, value: '', ...merged })
            response = NextResponse.next({ request: { headers: requestHeaders } })
            applySecurityHeaders(response, nonce, csp)
            response.cookies.set({ name, value: '', ...merged })
          },
        },
      },
    )

    await supabase.auth.getUser()
  }

  return response
}

export const config = {
  // '/' explícito: o regex sozinho muitas vezes não casa a home (CSP sumia no Observatory).
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?|map)$).*)',
  ],
}
