import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminHost } from '@/lib/admin-host'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')

  // Subdomínio admin → área /admin (login e painel)
  if (isAdminHost(host)) {
    const isAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/projetos') ||
      pathname.startsWith('/brand') ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|txt|xml)$/)

    if (!isAsset) {
      if (pathname === '/' || pathname === '') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.rewrite(url)
      }

      if (!pathname.startsWith('/admin') && !pathname.startsWith('/auth')) {
        const url = request.nextUrl.clone()
        url.pathname = `/admin${pathname}`
        return NextResponse.rewrite(url)
      }
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const needsAuthRefresh =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

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

  // Só refresca cookies se existirem. A sessão email/senha fica no localStorage;
  // a proteção real do painel é no layout client.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
