import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Dentro do createServerClient no seu middleware.ts
cookies: {
  get(name: string) {
    return request.cookies.get(name)?.value
  },
  set(name: string, value: string, options: CookieOptions) {
    // O segredo para o navegador aceitar o cookie no domínio oficial
    const cookieOptions = {
      ...options,
      domain: '.yopdevs.com.br', // O ponto inicial permite www e sem www
      path: '/',
      sameSite: 'lax' as const,
      secure: true,
      httpOnly: true,
    }
    request.cookies.set({ name, value, ...cookieOptions })
    response = NextResponse.next({
      request: { headers: request.headers },
    })
    response.cookies.set({ name, value, ...cookieOptions })
  },
  remove(name: string, options: CookieOptions) {
    const cookieOptions = {
      ...options,
      domain: '.yopdevs.com.br',
      path: '/',
    }
    request.cookies.set({ name, value: '', ...cookieOptions })
    response = NextResponse.next({
      request: { headers: request.headers },
    })
    response.cookies.set({ name, value: '', ...cookieOptions })
  },
}
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/callback'],
}