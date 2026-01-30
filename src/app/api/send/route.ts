import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: { message: 'Serviço de e-mail não configurado.' } },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: { message: 'Nome, e-mail e mensagem são obrigatórios.' } },
        { status: 400 }
      )
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: { message: 'A mensagem deve ter pelo menos 10 caracteres.' } },
        { status: 400 }
      )
    }

    const data = await resend.emails.send({
      from: 'YOP DEVS <contato@yopdevs.com.br>',
      to: ['gabrielqsiqueira6@gmail.com'],
      subject: `Novo Chamado: ${name}`,
      html: `<p><strong>Nome:</strong> ${escapeHtml(name)}</p>
             <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
             <p><strong>Mensagem:</strong> ${escapeHtml(message)}</p>`,
    })

    if (data.error) {
      return NextResponse.json(
        { error: { message: data.error.message ?? 'Falha ao enviar e-mail.' } },
        { status: 502 }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: { message: 'Erro interno. Tente novamente mais tarde.' } },
      { status: 500 }
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