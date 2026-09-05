import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import { getResendClient, ingestInboundEmail } from '@/lib/admin-mailbox'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ResendEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    created_at?: string
    from?: string
    to?: string[]
    cc?: string[]
    subject?: string
    message_id?: string
    attachments?: unknown[]
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  const resend = getResendClient()

  if (secret && resend) {
    try {
      const webhooks = resend as unknown as {
        webhooks?: {
          verify?: (args: {
            payload: string
            headers: { id: string; timestamp: string; signature: string }
            webhookSecret: string
          }) => Promise<unknown> | unknown
        }
      }
      if (webhooks.webhooks?.verify) {
        await webhooks.webhooks.verify({
          payload: rawBody,
          headers: {
            id: request.headers.get('svix-id') || '',
            timestamp: request.headers.get('svix-timestamp') || '',
            signature: request.headers.get('svix-signature') || '',
          },
          webhookSecret: secret,
        })
      }
    } catch (err) {
      console.error('[resend-webhook] invalid signature', err)
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
    }
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody) as ResendEvent
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, ignored: event.type ?? null })
  }

  const emailId = event.data?.email_id
  if (!emailId) {
    return NextResponse.json({ error: 'email_id ausente.' }, { status: 400 })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 })
  }

  try {
    const result = await ingestInboundEmail(yop, {
      email_id: emailId,
      created_at: event.data?.created_at || event.created_at,
      from: event.data?.from,
      to: event.data?.to,
      cc: event.data?.cc,
      subject: event.data?.subject,
      message_id: event.data?.message_id,
      attachments: (event.data?.attachments as never) || [],
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[resend-webhook]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao ingerir e-mail.' },
      { status: 500 },
    )
  }
}
