import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/** Prefixo dos secrets criptografados em yop_admin_system_integrations */
export const SECRET_ENC_PREFIX = 'enc:v1:'

const SECRET_FIELDS = [
  'cf_api_token',
  'sb_anon_key',
  'sb_service_role_key',
  'sb_access_token',
  'resend_api_key',
] as const

export type IntegrationSecretField = (typeof SECRET_FIELDS)[number]

function getRawKey(): Buffer | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  // Aceita base64 (32 bytes) ou qualquer string → SHA-256
  try {
    const asB64 = Buffer.from(raw, 'base64')
    if (asB64.length === 32) return asB64
  } catch {
    // fall through
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function secretsEncryptionConfigured(): boolean {
  return Boolean(getRawKey())
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith(SECRET_ENC_PREFIX))
}

/** Criptografa plaintext. Se já for enc:v1:, devolve igual. Sem chave → erro. */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null
  if (isEncryptedSecret(plain)) return plain

  const key = getRawKey()
  if (!key) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY não configurada. Gere com: openssl rand -base64 32',
    )
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // enc:v1:base64(iv).base64(tag).base64(ciphertext)
  return `${SECRET_ENC_PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`
}

/** Descriptografa. Texto sem prefixo = legado em plaintext (migração). */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null
  if (!isEncryptedSecret(stored)) return stored

  const key = getRawKey()
  if (!key) {
    throw new Error('SECRETS_ENCRYPTION_KEY necessária para ler secrets criptografados.')
  }

  const body = stored.slice(SECRET_ENC_PREFIX.length)
  const parts = body.split('.')
  if (parts.length !== 3) throw new Error('Secret criptografado inválido.')

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return plain.toString('utf8')
}

type SecretBag = Partial<Record<IntegrationSecretField, string | null>>

/** Prepara campos secretos para gravar no banco (sempre criptografados). */
export function encryptSecretsForStorage<T extends SecretBag>(row: T): T {
  const out = { ...row }
  for (const field of SECRET_FIELDS) {
    if (field in out) {
      const v = out[field]
      out[field] = (v ? encryptSecret(v) : null) as T[typeof field]
    }
  }
  return out
}

/** Descriptografa campos secretos para uso em APIs externas. */
export function decryptSecretsInRow<T extends SecretBag>(row: T): T {
  const out = { ...row }
  for (const field of SECRET_FIELDS) {
    if (field in out && out[field]) {
      out[field] = decryptSecret(out[field] as string) as T[typeof field]
    }
  }
  return out
}

export function integrationNeedsReencrypt(row: SecretBag): boolean {
  return SECRET_FIELDS.some((f) => {
    const v = row[f]
    return Boolean(v && !isEncryptedSecret(v))
  })
}

export { SECRET_FIELDS as INTEGRATION_SECRET_FIELDS }
