import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Instância única para evitar erros de múltiplas instâncias no console
export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey)

// Exportamos também como função para manter compatibilidade
export const createClient = () => supabase