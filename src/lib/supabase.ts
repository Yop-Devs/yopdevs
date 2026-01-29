import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'yopdevs-auth-token',
    cookieOptions: {
      // Isso garante que o cookie seja aceito pelo domínio oficial
      domain: 'yopdevs.com.br', 
      path: '/',
      sameSite: 'lax',
      secure: true,
    },
  },
})

export const createClient = () => supabase