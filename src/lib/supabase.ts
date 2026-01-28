import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Exportamos uma função que cria o cliente, para evitar erros de cache no SSR
export const createClient = () => supabaseCreateClient(supabaseUrl, supabaseAnonKey)

// Também exportamos uma instância única para casos simples
export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey)