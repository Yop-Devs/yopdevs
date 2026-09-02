import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { isEmailAllowed } from '@/lib/allowed-emails'

export function getSupabaseAnonFromRequest(request: Request): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return null

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getSupabaseServiceRole(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Valida sessão admin (Bearer JWT + e-mail permitido). */
export async function requireAdminUser(
  request: Request,
): Promise<{ user: User; supabase: SupabaseClient } | { error: string; status: number }> {
  const supabase = getSupabaseAnonFromRequest(request)
  if (!supabase) {
    return { error: 'Configuração do servidor incompleta.', status: 503 }
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return { error: 'Não autenticado.', status: 401 }
  }
  if (!isEmailAllowed(data.user.email)) {
    return { error: 'Sem permissão.', status: 403 }
  }

  return { user: data.user, supabase }
}
