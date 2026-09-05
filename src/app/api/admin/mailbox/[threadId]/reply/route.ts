import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { replyToThread } from '@/lib/admin-mailbox'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { params: Promise<{ threadId: string }> }

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  const { threadId } = await ctx.params
  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const text = String(form.get('text') || '').trim()
      const files = form.getAll('attachments').filter((f): f is File => f instanceof File)
      const attachments = await Promise.all(
        files.slice(0, 5).map(async (file) => ({
          filename: file.name || 'anexo',
          content: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || undefined,
        })),
      )
      const message = await replyToThread(yop, threadId, { text, attachments })
      return NextResponse.json({ ok: true, message })
    }

    const body = (await request.json()) as { text?: string; to?: string[] }
    const message = await replyToThread(yop, threadId, {
      text: String(body.text || ''),
      to: Array.isArray(body.to) ? body.to.map(String) : undefined,
    })
    return NextResponse.json({ ok: true, message })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao responder.' },
      { status: 400 },
    )
  }
}
