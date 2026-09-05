import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { deleteThread, setThreadStarred } from '@/lib/admin-mailbox'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ threadId: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  const { threadId } = await ctx.params
  let body: { starred?: boolean }
  try {
    body = (await request.json()) as { starred?: boolean }
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  if (typeof body.starred !== 'boolean') {
    return NextResponse.json({ error: 'Informe starred: true|false.' }, { status: 400 })
  }

  try {
    const thread = await setThreadStarred(yop, threadId, body.starred)
    return NextResponse.json({ ok: true, thread })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao atualizar.' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  const { threadId } = await ctx.params

  try {
    await deleteThread(yop, threadId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao apagar.' },
      { status: 400 },
    )
  }
}
