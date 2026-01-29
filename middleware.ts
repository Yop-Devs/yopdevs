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
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        // No seu middleware.ts, dentro do createServerClient
set(name: string, value: string, options: CookieOptions) {
  const cookieOptions = {
    ...options,
    // O segredo: o ponto inicial faz o cookie valer para yopdevs.com.br e www.yopdevs.com.br
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
}
      },
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