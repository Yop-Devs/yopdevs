/** Opções de cookie de sessão Supabase (browser + server + proxy). */
export function supabaseAuthCookieOptions() {
  const secure = process.env.NODE_ENV === 'production'
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure,
    // HttpOnly é aplicado pelo @supabase/ssr nos cookies de auth
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  }
}
