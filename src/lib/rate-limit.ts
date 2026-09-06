/**
 * Rate limit: Upstash Redis se configurado; senão memória (por instância serverless).
 *
 * Vercel env (opcional):
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function clientIpFromRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

function memoryAllow(key: string, opts: { windowMs: number; max: number }): boolean {
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

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  )
}

/** Janela fixa via INCR + EXPIRE no Upstash REST. */
async function upstashAllow(
  key: string,
  opts: { windowMs: number; max: number },
): Promise<boolean> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const redisKey = `rl:${key}`
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000))

  const res = await fetch(`${base}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['TTL', redisKey],
    ]),
  })

  if (!res.ok) {
    console.error('[rate-limit] Upstash HTTP', res.status)
    return memoryAllow(key, opts)
  }

  const rows = (await res.json()) as Array<{ result?: number }>
  const count = Number(rows[0]?.result)
  const ttl = Number(rows[1]?.result)

  if (!Number.isFinite(count)) {
    return memoryAllow(key, opts)
  }

  // Primeiro hit ou chave sem TTL → define a janela
  if (count === 1 || ttl < 0) {
    await fetch(`${base}/expire/${encodeURIComponent(redisKey)}/${windowSec}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
  }

  return count <= opts.max
}

/** Preferir allowRateLimitAsync nas rotas. Sync = só memória. */
export function allowRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): boolean {
  return memoryAllow(key, opts)
}

export async function allowRateLimitAsync(
  key: string,
  opts: { windowMs: number; max: number },
): Promise<boolean> {
  if (!upstashConfigured()) {
    return memoryAllow(key, opts)
  }
  try {
    return await upstashAllow(key, opts)
  } catch (err) {
    console.error('[rate-limit] Upstash falhou, usando memória:', err)
    return memoryAllow(key, opts)
  }
}

export function isDistributedRateLimitConfigured(): boolean {
  return upstashConfigured()
}
