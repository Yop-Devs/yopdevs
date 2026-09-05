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

/**
 * POST — só aceita se WHATSAPP_APP_SECRET estiver configurado e a assinatura X-Hub-Signature-256 bater.
 * Sem secret → 503 (fail-closed). Sem lógica de negócio ainda.
 */
export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim()
  if (!appSecret) {
    console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET ausente — rejeitando POST')
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  const signature = request.headers.get('x-hub-signature-256')?.trim()
  const rawBody = await request.text()

  if (!signature?.startsWith('sha256=')) {
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 401 })
  }

  const expectedHex = signature.slice('sha256='.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computedHex = Buffer.from(mac).toString('hex')

  if (computedHex.length !== expectedHex.length || !timingSafeEqual(computedHex, expectedHex)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
  }

  // Assinatura ok — ainda sem processamento de negócio
  return NextResponse.json({ ok: true })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
