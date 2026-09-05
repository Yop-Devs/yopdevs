/**
 * Verifica token Cloudflare Turnstile.
 * Se TURNSTILE_SECRET_KEY não estiver setada, retorna ok (captcha opcional até configurar).
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    return { ok: true }
  }

  const value = (token || '').trim()
  if (!value) {
    return { ok: false, error: 'Confirme o captcha antes de continuar.' }
  }

  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', value)
    if (ip && ip !== 'unknown') body.set('remoteip', ip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!json.success) {
      return { ok: false, error: 'Captcha inválido. Tente novamente.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Falha ao validar captcha.' }
  }
}

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null
}

export function turnstileRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && turnstileSiteKey())
}
