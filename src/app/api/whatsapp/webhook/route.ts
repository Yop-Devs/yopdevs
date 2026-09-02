import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET — verificação do webhook (Meta envia hub.mode, hub.verify_token, hub.challenge). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim()

  if (!verifyToken) {
    console.error('[whatsapp-webhook] WHATSAPP_VERIFY_TOKEN não configurado')
    return new NextResponse('Verify token not configured', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

/** POST — eventos de mensagens e status (implementar lógica depois). */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[whatsapp-webhook] evento recebido', JSON.stringify(body).slice(0, 2000))
    // TODO: processar mensagens recebidas, atualizar status, etc.
  } catch {
    // Meta pode enviar body vazio em alguns testes
  }

  return NextResponse.json({ ok: true })
}
