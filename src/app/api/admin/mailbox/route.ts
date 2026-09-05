import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { syncReceivedFromResend } from '@/lib/admin-mailbox'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Lista threads ou mensagens de um thread. */
export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  const url = new URL(request.url)
  const threadId = url.searchParams.get('threadId')

  if (threadId) {
    const [{ data: thread, error: tErr }, { data: messages, error: mErr }] = await Promise.all([
      yop.from('yop_admin_mailbox_threads').select('*').eq('id', threadId).maybeSingle(),
      yop
        .from('yop_admin_mailbox_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true }),
    ])
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
    if (!thread) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

    await yop
      .from('yop_admin_mailbox_threads')
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq('id', threadId)

    await yop
      .from('yop_admin_mailbox_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .is('read_at', null)

    return NextResponse.json({ thread, messages: messages ?? [] })
  }

  const { data, error } = await yop
    .from('yop_admin_mailbox_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ threads: data ?? [] })
}

/** Importa e-mails já recebidos no Resend (fallback se o webhook falhar). */
export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  let action = 'sync'
  try {
    const body = (await request.json()) as { action?: string }
    if (body.action) action = body.action
  } catch {
    // ok
  }

  if (action !== 'sync') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  try {
    const result = await syncReceivedFromResend(yop, 40)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao sincronizar inbox.' },
      { status: 500 },
    )
  }
}
