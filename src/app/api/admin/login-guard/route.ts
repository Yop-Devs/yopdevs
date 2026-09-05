import { NextResponse } from 'next/server'
import { isEmailAllowed } from '@/lib/allowed-emails'
import { allowRateLimit, clientIpFromRequest } from '@/lib/rate-limit'
import { turnstileRequired, verifyTurnstileToken } from '@/lib/turnstile'

export const dynamic = 'force-dynamic'

/**
 * Pré-check do login admin: rate limit + Turnstile (se configurado).
 * Não autentica — só reduz brute-force/bots antes do signInWithPassword.
 */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request)
  if (!allowRateLimit(`admin-login:${ip}`, { windowMs: 15 * 60 * 1000, max: 20 })) {
    return NextResponse.json(
      { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
      { status: 429 },
    )
  }

  let body: { email?: string; turnstileToken?: string }
  try {
    body = (await request.json()) as { email?: string; turnstileToken?: string }
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isEmailAllowed(email)) {
    // Resposta genérica — não revela se o e-mail existe
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 403 })
  }

  const captcha = await verifyTurnstileToken(body.turnstileToken, ip)
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.error }, { status: 400 })
  }
  if (turnstileRequired() && !body.turnstileToken?.trim()) {
    return NextResponse.json({ error: 'Confirme o captcha antes de continuar.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
