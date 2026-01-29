import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Dentro da configuração do createServerClient
cookies: {
  get(name: string) {
    return request.cookies.get(name)?.value
  },
  set(name: string, value: string, options: CookieOptions) {
    const cookieOptions = {
      ...options,
      // O ponto no início permite que o cookie valha para o domínio e subdomínios (www)
      domain: '.yopdevs.com.br', 
      path: '/',
      sameSite: 'lax' as const,
      secure: true,
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

  // Se não estiver logado e tentar o dashboard, volta para a home
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Se logado na home, vai para o dashboard
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/callback'],
}