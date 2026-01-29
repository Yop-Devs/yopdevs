import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          // Força o cookie para o domínio oficial e subdomínios
          const opt = { ...options, domain: '.yopdevs.com.br', path: '/', sameSite: 'lax' as const, secure: true }
          request.cookies.set({ name, value, ...opt })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...opt })
        },
        remove(name: string, options: CookieOptions) {
          const opt = { ...options, domain: '.yopdevs.com.br', path: '/' }
          request.cookies.set({ name, value: '', ...opt })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...opt })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Bloqueio apenas para a rota de dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/callback'],
}