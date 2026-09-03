import { NextResponse } from 'next/server'
import { sendTelegramAlert } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_NOTIFY_SECRET?.trim()
  if (!secret) return false

  const header = request.headers.get('x-notify-secret')?.trim()
  if (header && header === secret) return true

  const url = new URL(request.url)
  const query = url.searchParams.get('secret')?.trim()
  return Boolean(query && query === secret)
}

/** POST { "text": "..." } + header x-notify-secret */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let text = ''
  try {
    const body = (await request.json()) as { text?: unknown; message?: unknown }
    if (typeof body.text === 'string') text = body.text
    else if (typeof body.message === 'string') text = body.message
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const result = await sendTelegramAlert(text)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }

  return NextResponse.json({ ok: true })
}

/** GET ?secret=...&text=... — útil para teste rápido no navegador */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const text = new URL(request.url).searchParams.get('text') ?? ''
  const result = await sendTelegramAlert(text || 'Teste YOP Devs — alerta Telegram ok')
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }

  return NextResponse.json({ ok: true })
}
