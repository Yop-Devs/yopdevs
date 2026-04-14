import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Elimina o utilizador em auth.users (Admin API).
 * Dados em tabelas com ON DELETE CASCADE em relação a auth.users são removidos pela base.
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta (falta SUPABASE_SERVICE_ROLE_KEY ou URL/anon).' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password) {
    return NextResponse.json({ error: 'Senha obrigatória.' }, { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user?.id || !userData.user.email) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
  }

  const user = userData.user
  const email = user.email
  if (!email) {
    return NextResponse.json({ error: 'Conta sem email.' }, { status: 400 })
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signInData, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password,
  })

  if (signErr || signInData.user?.id !== user.id) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
