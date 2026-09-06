import type { SupabaseClient } from '@supabase/supabase-js'
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  secretsEncryptionConfigured,
} from '@/lib/secrets-crypto'

/** Criptografa o bloco de acessos para gravar em yop_admin_systems.notes */
export function encryptAccessNotes(plain: string | null | undefined): string | null {
  const trimmed = plain?.trim() ?? ''
  if (!trimmed) return null
  return encryptSecret(trimmed)
}

export function decryptAccessNotes(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null
  return decryptSecret(stored)
}

export function accessNotesNeedReencrypt(stored: string | null | undefined): boolean {
  return Boolean(stored?.trim() && !isEncryptedSecret(stored))
}

/** Mapa system_id → tem bloco de acessos (sem enviar conteúdo ao client). */
export async function fetchAccessNotesPresence(
  yop: SupabaseClient,
): Promise<Record<string, boolean>> {
  const { data, error } = await yop.from('yop_admin_systems').select('id, notes')
  if (error) throw new Error(error.message)
  const out: Record<string, boolean> = {}
  for (const row of data ?? []) {
    const id = row.id as string
    const notes = row.notes as string | null
    out[id] = Boolean(notes?.trim())
  }
  return out
}

export async function reencryptAllSystemAccessNotes(yop: SupabaseClient): Promise<{
  updated: number
  skipped: number
  errors: string[]
}> {
  if (!secretsEncryptionConfigured()) {
    throw new Error('SECRETS_ENCRYPTION_KEY não configurada.')
  }

  const { data, error } = await yop.from('yop_admin_systems').select('id, notes')
  if (error) throw new Error(error.message)

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of data ?? []) {
    const id = row.id as string
    const notes = row.notes as string | null
    if (!notes?.trim()) {
      skipped += 1
      continue
    }
    if (isEncryptedSecret(notes)) {
      skipped += 1
      continue
    }
    try {
      const enc = encryptAccessNotes(notes)
      const { error: upErr } = await yop
        .from('yop_admin_systems')
        .update({ notes: enc, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) throw new Error(upErr.message)
      updated += 1
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  return { updated, skipped, errors }
}
