/** Rate limit best-effort em memória (serverless: por instância). */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function clientIpFromRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

export function allowRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): boolean {
  const now = Date.now()
  const row = buckets.get(key)
  if (!row || now > row.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return true
  }
  if (row.count >= opts.max) return false
  row.count += 1
  return true
}
