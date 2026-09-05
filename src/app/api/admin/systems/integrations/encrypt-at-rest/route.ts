import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { secretsEncryptionConfigured } from '@/lib/secrets-crypto'
import { reencryptAllIntegrationSecrets } from '@/lib/system-infra-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST — criptografa secrets legados (plaintext) em yop_admin_system_integrations.
 * Exige SECRETS_ENCRYPTION_KEY + admin.
 */
export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!secretsEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          'SECRETS_ENCRYPTION_KEY ausente. Gere com openssl rand -base64 32 e configure na Vercel.',
      },
      { status: 503 },
    )
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase service role ausente.' }, { status: 503 })
  }

  try {
    const result = await reencryptAllIntegrationSecrets(yop)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao criptografar.' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  return NextResponse.json({
    configured: secretsEncryptionConfigured(),
    hint: 'POST neste endpoint para migrar plaintext → AES-256-GCM.',
  })
}
