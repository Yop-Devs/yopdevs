import { Resend } from 'resend'
import { NextResponse } from 'next/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

/** Rate limit simples em memória (por IP) — best-effort em serverless. */
const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 8

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

function allowRequest(ip: string): boolean {
  const now = Date.now()
  const row = hits.get(ip)
  if (!row || now > row.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (row.count >= MAX_HITS) return false
  row.count += 1
  return true
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: { message: 'Serviço de e-mail não configurado.' } },
      { status: 503 },
    )
  }

  const ip = clientIp(request)
  if (!allowRequest(ip)) {
    return NextResponse.json(
      { error: { message: 'Muitas tentativas. Aguarde alguns minutos.' } },
      { status: 429 },
    )
  }

  const resend = getResend()
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    // honeypot — bots preenchem; humanos deixam vazio
    const website = typeof body?.website === 'string' ? body.website.trim() : ''
    if (website) {
      return NextResponse.json({ ok: true })
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: { message: 'Nome, e-mail e mensagem são obrigatórios.' } },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: { message: 'E-mail inválido.' } }, { status: 400 })
    }

    if (message.length < 10 || message.length > 5000 || name.length > 120) {
      return NextResponse.json(
        { error: { message: 'Dados inválidos.' } },
        { status: 400 },
      )
    }

    const data = await resend.emails.send({
      from: 'YOP DEVS <contato@yopdevs.com.br>',
      to: ['gabrielcarrara@yopdevs.com.br'],
      replyTo: email,
      subject: `Novo Chamado: ${name}`,
      html: `<p><strong>Nome:</strong> ${escapeHtml(name)}</p>
             <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
             <p><strong>Mensagem:</strong> ${escapeHtml(message)}</p>`,
    })

    if (data.error) {
      return NextResponse.json(
        { error: { message: data.error.message ?? 'Falha ao enviar e-mail.' } },
        { status: 502 },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: { message: 'Erro interno. Tente novamente mais tarde.' } },
      { status: 500 },
    )
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c)
}
