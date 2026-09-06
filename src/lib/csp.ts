import { randomBytes } from 'crypto'

/** Fallback só se o proxy não injetar x-nonce (não usar em produção como valor fixo). */
export const CSP_NONCE = 'fallback-nonce'

/** Gera nonce criptográfico por request (base64url). */
export function createRequestNonce(): string {
  return randomBytes(16).toString('base64url')
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  // Em prod: 'self' libera chunks /_next; nonce cobre scripts inline do Next.
  // Sem 'strict-dynamic' — no dev os <script src> não recebem nonce e a página travava.
  // Em dev: 'unsafe-inline' + 'unsafe-eval' para HMR/webpack.
  // Turnstile: challenges.cloudflare.com + nonce no api.js (propaga para filhos).
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`

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
