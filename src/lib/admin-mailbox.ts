import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MailboxAttachment = {
  id?: string
  filename?: string | null
  content_type?: string | null
  content_disposition?: string | null
  content_id?: string | null
  size?: number | null
  download_url?: string | null
}

export type MailboxMessage = {
  id: string
  thread_id: string
  resend_email_id: string | null
  direction: 'inbound' | 'outbound'
  from_email: string
  from_name: string | null
  to_emails: string[]
  cc_emails: string[]
  subject: string
  text_body: string | null
  html_body: string | null
  message_id: string | null
  in_reply_to: string | null
  attachments: MailboxAttachment[]
  read_at: string | null
  created_at: string
}

export type MailboxThread = {
  id: string
  subject: string
  participants: string[]
  last_message_at: string
  unread_count: number
  created_at: string
  updated_at: string
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

export function mailboxFromAddress(): string {
  return (
    process.env.RESEND_MAILBOX_FROM?.trim() ||
    'Gabriel Carrara <gabrielcarrara@yopdevs.com.br>'
  )
}

export function mailboxForwardTo(): string | null {
  return process.env.RESEND_MAILBOX_FORWARD_TO?.trim() || null
}

export function normalizeSubject(subject: string | null | undefined): string {
  const raw = (subject ?? '').trim() || '(sem assunto)'
  return raw.replace(/^(re|fw|fwd)\s*:\s*/gi, '').trim() || '(sem assunto)'
}

export function extractEmail(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/<([^>]+)>/)
  return (m?.[1] || value).trim().toLowerCase()
}

function extractDisplayName(value: string | null | undefined): string | null {
  if (!value) return null
  const m = value.match(/^"?([^"<]+)"?\s*</)
  const name = m?.[1]?.trim()
  return name || null
}

type ReceivedEmailPayload = {
  email_id: string
  created_at?: string
  from?: string
  to?: string[]
  cc?: string[]
  subject?: string
  message_id?: string
  attachments?: MailboxAttachment[]
}

type ReceivedEmailDetail = {
  id?: string
  from?: string
  to?: string[]
  cc?: string[]
  subject?: string
  message_id?: string
  text?: string | null
  html?: string | null
  headers?: Record<string, string> | Array<{ name: string; value: string }>
  attachments?: MailboxAttachment[]
}

function headerMap(
  headers: ReceivedEmailDetail['headers'],
): Record<string, string> {
  if (!headers) return {}
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {}
    for (const h of headers) {
      if (h?.name) out[h.name.toLowerCase()] = h.value
    }
    return out
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) out[k.toLowerCase()] = String(v)
  return out
}

async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmailDetail | null> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend receiving get ${res.status}: ${text.slice(0, 200)}`)
  }
  return (await res.json()) as ReceivedEmailDetail
}

/** Lista e-mails recebidos no Resend e importa os que ainda não estão na Yop. */
export async function syncReceivedFromResend(
  yop: SupabaseClient,
  limit = 30,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) throw new Error('RESEND_API_KEY não configurada.')

  const res = await fetch(`https://api.resend.com/emails/receiving?limit=${Math.min(100, Math.max(1, limit))}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`Resend list receiving ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = JSON.parse(text) as {
    data?: {
      id?: string
      created_at?: string
      from?: string
      to?: string[]
      cc?: string[]
      subject?: string
      message_id?: string
    }[]
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const item of json.data ?? []) {
    if (!item.id) continue
    try {
      const result = await ingestInboundEmail(yop, {
        email_id: item.id,
        created_at: item.created_at,
        from: item.from,
        to: item.to,
        cc: item.cc,
        subject: item.subject,
        message_id: item.message_id,
      })
      if (result.created) imported += 1
      else skipped += 1
    } catch (err) {
      errors.push(`${item.id}: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  return { imported, skipped, errors }
}

async function findThreadId(
  yop: SupabaseClient,
  opts: {
    inReplyTo: string | null
    subject: string
    participants: string[]
  },
): Promise<string | null> {
  if (opts.inReplyTo) {
    const { data } = await yop
      .from('yop_admin_mailbox_messages')
      .select('thread_id')
      .eq('message_id', opts.inReplyTo)
      .maybeSingle()
    if (data?.thread_id) return data.thread_id as string
  }

  const { data: threads } = await yop
    .from('yop_admin_mailbox_threads')
    .select('id, subject, participants')
    .ilike('subject', opts.subject)
    .order('last_message_at', { ascending: false })
    .limit(20)

  const key = [...opts.participants].sort().join('|')
  for (const t of threads ?? []) {
    const p = [...((t.participants as string[]) ?? [])].map((x) => x.toLowerCase()).sort().join('|')
    if (p === key && normalizeSubject(t.subject as string) === opts.subject) {
      return t.id as string
    }
  }
  return null
}

export async function ingestInboundEmail(
  yop: SupabaseClient,
  payload: ReceivedEmailPayload,
): Promise<{ threadId: string; messageId: string; created: boolean }> {
  const existing = await yop
    .from('yop_admin_mailbox_messages')
    .select('id, thread_id')
    .eq('resend_email_id', payload.email_id)
    .maybeSingle()

  if (existing.data?.id) {
    return {
      threadId: existing.data.thread_id as string,
      messageId: existing.data.id as string,
      created: false,
    }
  }

  let detail: ReceivedEmailDetail | null = null
  try {
    detail = await fetchReceivedEmail(payload.email_id)
  } catch (err) {
    console.error('[mailbox] fetch received', err)
  }

  const fromRaw = detail?.from || payload.from || ''
  const fromEmail = extractEmail(fromRaw) || fromRaw
  const fromName = extractDisplayName(fromRaw)
  const toEmails = (detail?.to || payload.to || []).map(extractEmail).filter(Boolean)
  const ccEmails = (detail?.cc || payload.cc || []).map(extractEmail).filter(Boolean)
  const subject = (detail?.subject || payload.subject || '(sem assunto)').trim() || '(sem assunto)'
  const headers = headerMap(detail?.headers)
  const messageId = detail?.message_id || payload.message_id || headers['message-id'] || null
  const inReplyTo = headers['in-reply-to']?.trim() || null
  const attachments = (detail?.attachments || payload.attachments || []) as MailboxAttachment[]

  const ourAddresses = new Set(
    [mailboxFromAddress(), ...toEmails, ...ccEmails]
      .map(extractEmail)
      .filter((e) => e.endsWith('@yopdevs.com.br')),
  )
  const participants = Array.from(
    new Set([fromEmail, ...toEmails, ...ccEmails].filter(Boolean).filter((e) => !ourAddresses.has(e) || e === fromEmail)),
  )
  if (!participants.includes(fromEmail) && fromEmail) participants.push(fromEmail)

  const normalized = normalizeSubject(subject)
  let threadId = await findThreadId(yop, {
    inReplyTo,
    subject: normalized,
    participants: participants.length ? participants : [fromEmail],
  })

  const now = new Date().toISOString()

  if (!threadId) {
    const { data: thread, error } = await yop
      .from('yop_admin_mailbox_threads')
      .insert({
        subject: normalized,
        participants: participants.length ? participants : [fromEmail],
        last_message_at: payload.created_at || now,
        unread_count: 1,
        updated_at: now,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    threadId = thread.id as string
  } else {
    const { data: thread } = await yop
      .from('yop_admin_mailbox_threads')
      .select('unread_count, participants')
      .eq('id', threadId)
      .maybeSingle()

    const merged = Array.from(
      new Set([
        ...(((thread?.participants as string[]) ?? []).map((x) => x.toLowerCase())),
        ...participants.map((x) => x.toLowerCase()),
      ]),
    )

    await yop
      .from('yop_admin_mailbox_threads')
      .update({
        last_message_at: payload.created_at || now,
        unread_count: Number(thread?.unread_count ?? 0) + 1,
        participants: merged,
        updated_at: now,
      })
      .eq('id', threadId)
  }

  const { data: message, error: msgError } = await yop
    .from('yop_admin_mailbox_messages')
    .insert({
      thread_id: threadId,
      resend_email_id: payload.email_id,
      direction: 'inbound',
      from_email: fromEmail,
      from_name: fromName,
      to_emails: toEmails,
      cc_emails: ccEmails,
      subject,
      text_body: detail?.text ?? null,
      html_body: detail?.html ?? null,
      message_id: messageId,
      in_reply_to: inReplyTo,
      attachments,
      created_at: payload.created_at || now,
    })
    .select('id')
    .single()

  if (msgError) throw new Error(msgError.message)

  // Cópia no Gmail (opcional), sem depender do Email Routing da CF
  const forwardTo = mailboxForwardTo()
  const resend = getResendClient()
  if (forwardTo && resend) {
    try {
      const receiving = resend.emails as unknown as {
        receiving?: {
          forward?: (args: {
            emailId: string
            to: string
            from: string
          }) => Promise<unknown>
        }
      }
      if (receiving.receiving?.forward) {
        await receiving.receiving.forward({
          emailId: payload.email_id,
          to: forwardTo,
          from: mailboxFromAddress(),
        })
      } else {
        await resend.emails.send({
          from: mailboxFromAddress(),
          to: [forwardTo],
          subject: `[Inbox] ${subject}`,
          html:
            detail?.html ||
            `<pre>${escapeHtml(detail?.text || '(sem conteúdo)')}</pre>`,
          replyTo: fromEmail || undefined,
        })
      }
    } catch (err) {
      console.warn('[mailbox] forward to gmail failed', err)
    }
  }

  return { threadId, messageId: message.id as string, created: true }
}

export async function replyToThread(
  yop: SupabaseClient,
  threadId: string,
  input: {
    text: string
    html?: string
    to?: string[]
    attachments?: { filename: string; content: Buffer; contentType?: string }[]
  },
): Promise<MailboxMessage> {
  const resend = getResendClient()
  if (!resend) throw new Error('RESEND_API_KEY não configurada.')

  const { data: thread, error: tErr } = await yop
    .from('yop_admin_mailbox_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle()
  if (tErr) throw new Error(tErr.message)
  if (!thread) throw new Error('Conversa não encontrada.')

  const { data: lastInbound } = await yop
    .from('yop_admin_mailbox_messages')
    .select('*')
    .eq('thread_id', threadId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: lastAny } = await yop
    .from('yop_admin_mailbox_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const to =
    input.to?.length
      ? input.to
      : lastInbound
        ? [lastInbound.from_email as string]
        : ((thread.participants as string[]) ?? []).filter((e) => !String(e).endsWith('@yopdevs.com.br'))

  if (!to.length) throw new Error('Sem destinatário para responder.')

  const baseSubject = normalizeSubject((lastAny?.subject as string) || (thread.subject as string))
  const subject = baseSubject.toLowerCase().startsWith('re:')
    ? baseSubject
    : `Re: ${baseSubject}`

  const inReplyTo = (lastAny?.message_id as string | null) || null
  const text = input.text.trim()
  if (!text) throw new Error('Mensagem vazia.')

  const html = input.html || `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`

  const headers: Record<string, string> = {}
  if (inReplyTo) {
    headers['In-Reply-To'] = inReplyTo
    headers.References = inReplyTo
  }

  const { data, error } = await resend.emails.send({
    from: mailboxFromAddress(),
    to,
    subject,
    html,
    text,
    headers: Object.keys(headers).length ? headers : undefined,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })

  if (error) throw new Error(error.message)
  const sentId = data?.id ?? null
  const now = new Date().toISOString()

  const { data: message, error: msgError } = await yop
    .from('yop_admin_mailbox_messages')
    .insert({
      thread_id: threadId,
      resend_email_id: sentId,
      direction: 'outbound',
      from_email: extractEmail(mailboxFromAddress()),
      from_name: 'Gabriel Carrara',
      to_emails: to,
      cc_emails: [],
      subject,
      text_body: text,
      html_body: html,
      message_id: sentId ? `<${sentId}@resend.dev>` : null,
      in_reply_to: inReplyTo,
      attachments: (input.attachments ?? []).map((a) => ({
        filename: a.filename,
        content_type: a.contentType ?? null,
        size: a.content.length,
      })),
      read_at: now,
      created_at: now,
    })
    .select('*')
    .single()

  if (msgError) throw new Error(msgError.message)

  await yop
    .from('yop_admin_mailbox_threads')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', threadId)

  return message as MailboxMessage
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
