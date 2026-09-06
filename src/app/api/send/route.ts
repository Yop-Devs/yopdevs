import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { allowRateLimitAsync, clientIpFromRequest } from '@/lib/rate-limit'
import { turnstileRequired, verifyTurnstileToken } from '@/lib/turnstile'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: { message: 'Serviço de e-mail não configurado.' } },
      { status: 503 },
    )
  }

  const ip = clientIpFromRequest(request)
  if (!(await allowRateLimitAsync(`send:${ip}`, { windowMs: 10 * 60 * 1000, max: 8 }))) {
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
    const turnstileToken =
      typeof body?.turnstileToken === 'string'
        ? body.turnstileToken
        : typeof body?.['cf-turnstile-response'] === 'string'
          ? body['cf-turnstile-response']
          : ''
    // honeypot — bots preenchem; humanos deixam vazio
    const website = typeof body?.website === 'string' ? body.website.trim() : ''
    if (website) {
      return NextResponse.json({ ok: true })
    }

    const captcha = await verifyTurnstileToken(turnstileToken, ip)
    if (!captcha.ok) {
      return NextResponse.json({ error: { message: captcha.error } }, { status: 400 })
    }
    if (turnstileRequired() && !turnstileToken) {
      return NextResponse.json(
        { error: { message: 'Confirme o captcha antes de continuar.' } },
        { status: 400 },
      )
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
