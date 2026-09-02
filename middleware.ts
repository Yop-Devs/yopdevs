import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_ORIGIN,
  adminPaths,
  adminPublicUrl,
  isAdminHost,
  isMainSiteHost,
  toAdminInternalPath,
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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')
  const onAdminHost = isAdminHost(host)

  // Painel legado → subdomínio admin
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return NextResponse.redirect(adminPublicUrl('/login'))
  }

  // Site principal: /admin/* não existe — só no subdomínio
  if (!onAdminHost && isMainSiteHost(host) && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const publicPath = toAdminPublicPath(pathname)
    const target = new URL(publicPath, ADMIN_ORIGIN)
    target.search = search
    return NextResponse.redirect(target)
  }

  // Subdomínio admin: raiz → login (redirect explícito, evita servir landing estática)
  if (onAdminHost && (pathname === '/' || pathname === '')) {
    const target = request.nextUrl.clone()
    target.pathname = adminPaths.login
    target.search = search
    return NextResponse.redirect(target)
  }

  // Subdomínio admin: URLs limpas → rewrite interno para /admin/*
  if (onAdminHost && !isStaticAsset(pathname)) {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const publicPath = toAdminPublicPath(pathname)
      const target = request.nextUrl.clone()
      target.pathname = publicPath
      target.search = search
      return NextResponse.redirect(target)
    }

    if (!pathname.startsWith('/auth')) {
      const internal = toAdminInternalPath(pathname)
      if (internal !== pathname) {
        const rewriteUrl = request.nextUrl.clone()
        rewriteUrl.pathname = internal
        return NextResponse.rewrite(rewriteUrl)
      }
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const needsAuthRefresh =
    pathname.startsWith('/admin') || (onAdminHost && !isStaticAsset(pathname) && !pathname.startsWith('/auth'))

  if (!needsAuthRefresh) return response

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
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
