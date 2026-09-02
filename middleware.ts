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

/** Nonce compatível com Edge Runtime (sem Buffer). */
function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    // Sem 'unsafe-inline' em script-src (exigência Observatory / securityheaders)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.simpleicons.org https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

function applySecurityHeaders(response: NextResponse, nonce: string, csp: string) {
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)
  return response
}

export async function middleware(request: NextRequest) {
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

  const nonce = createNonce()
  const csp = buildCsp(nonce)

  // Next precisa do CSP + nonce no *request* para injetar nonce nos scripts
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
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
            applySecurityHeaders(response, nonce, csp)
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: requestHeaders } })
            response.cookies.set({ name, value: '', ...options })
            applySecurityHeaders(response, nonce, csp)
          },
        },
      },
    )

    await supabase.auth.getUser()
  }

  return applySecurityHeaders(response, nonce, csp)
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
