/** Fallback só se o proxy não injetar x-nonce. */
export const CSP_NONCE = 'fallback-nonce'

/** Gera nonce criptográfico por request (base64url). Compatível com Edge. */
export function createRequestNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function cspDirectives(scriptSrc: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    scriptSrc,
    // style-src com unsafe-inline: Observatory aceita (0 pts); Tailwind precisa.
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
 * CSP por request (proxy). Sem 'unsafe-inline' em script-src em produção
 * (necessário para Mozilla Observatory / nota A).
 * Next aplica o nonce aos scripts do framework quando o header vai no request.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`
  return cspDirectives(scriptSrc)
}
