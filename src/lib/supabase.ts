import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAuthCookieOptions } from '@/lib/auth-cookies'

let _client: SupabaseClient | null = null

/**
 * Cliente browser com sessão em cookies (@supabase/ssr).
 * Necessário para o gate server-side e o proxy refrescarem a mesma sessão.
 */
function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  _client = createBrowserClient(url, key, {
    cookieOptions: supabaseAuthCookieOptions(),
    isSingleton: true,
  })
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as unknown as Record<string, unknown>)[prop as string]
  },
})

export const createClient = () => supabase
