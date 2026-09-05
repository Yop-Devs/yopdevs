import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { composeOutboundEmail } from '@/lib/admin-mailbox'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const to = String(form.get('to') || '')
      const subject = String(form.get('subject') || '')
      const text = String(form.get('text') || '').trim()
      const files = form.getAll('attachments').filter((f): f is File => f instanceof File)
      const attachments = await Promise.all(
        files.slice(0, 5).map(async (file) => ({
          filename: file.name || 'anexo',
          content: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || undefined,
        })),
      )
      const result = await composeOutboundEmail(yop, { to, subject, text, attachments })
      return NextResponse.json({ ok: true, ...result })
    }

    const body = (await request.json()) as {
      to?: string | string[]
      subject?: string
      text?: string
    }
    const result = await composeOutboundEmail(yop, {
      to: body.to ?? '',
      subject: String(body.subject || ''),
      text: String(body.text || ''),
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao enviar e-mail.' },
      { status: 400 },
    )
  }
}
