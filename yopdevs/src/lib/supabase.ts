import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 1. Criamos a instância única (Singleton)
export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey)

/**
 * 2. Exportamos uma função com o nome createClient (renomeada internamente)
 * para não quebrar as páginas que ainda chamam createClient().
 */
export const createClient = () => supabase