import { randomBytes } from 'crypto'

/** Fallback só se o proxy não injetar x-nonce. */
export const CSP_NONCE = 'fallback-nonce'

/** Gera nonce criptográfico por request (base64url). */
export function createRequestNonce(): string {
  return randomBytes(16).toString('base64url')
}

function cspDirectives(scriptSrc: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "img-src 'self' data: blob: https://cdn.simpleicons.org https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "child-src 'self' blob: https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

/**
 * CSP para next.config (headers estáticos — sempre enviados).
 * Usa unsafe-inline em script porque não há nonce por request neste caminho.
 */
export function buildStaticContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"
  return cspDirectives(scriptSrc)
}

/** CSP com nonce (proxy) — reforço por request. */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://challenges.cloudflare.com`
  return cspDirectives(scriptSrc)
}
