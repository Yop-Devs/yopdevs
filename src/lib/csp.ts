/** Nonce estático: next.config envia no HTTP; proxy injeta no request para o Next. */
export const CSP_NONCE = 'YopDevsCspNonce2026'

export function buildContentSecurityPolicy(nonce: string = CSP_NONCE): string {
  const isDev = process.env.NODE_ENV === 'development'
  // Em prod: 'self' libera chunks /_next; nonce cobre scripts inline do Next.
  // Sem 'strict-dynamic' — no dev os <script src> não recebem nonce e a página travava.
  // Em dev: 'unsafe-inline' + 'unsafe-eval' para HMR/webpack.
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
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.simpleicons.org https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}
