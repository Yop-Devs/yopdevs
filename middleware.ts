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
      // Dentro do createServerClient no seu middleware.ts
cookies: {
  get(name: string) {
    return request.cookies.get(name)?.value
  },
  set(name: string, value: string, options: CookieOptions) {
    // Remova a linha 'domain' manual se ela existir.
    // Deixe o Next.js e o Supabase negociarem o domínio sozinhos.
    request.cookies.set({ name, value, ...options })
    response = NextResponse.next({
      request: { headers: request.headers },
    })
    response.cookies.set({ name, value, ...options })
  },
  remove(name: string, options: CookieOptions) {
    request.cookies.set({ name, value: '', ...options })
    response = NextResponse.next({
      request: { headers: request.headers },
    })
    response.cookies.set({ name, value: '', ...options })
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