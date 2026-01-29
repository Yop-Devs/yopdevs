import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

// Buscando as variáveis de ambiente que já conferimos estar certas na Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Criando a instância única (Singleton) para o cliente
// No Next.js 16, deixamos as opções de cookies para o middleware.ts
// O cliente apenas persiste a sessão localmente para o auth funcionar.
export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'yop-auth-token', // Nome único para não conflitar com localhost
  }
})

// Exportando a função de criação caso precise em outros componentes
export const createClient = () => supabase