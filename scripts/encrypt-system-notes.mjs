/**
 * One-shot: criptografa yop_admin_systems.notes plaintext → enc:v1:
 * Uso: node scripts/encrypt-system-notes.mjs
 * Lê .env.local (não imprime secrets nem conteúdo das notes).
 */
import { createHash, createCipheriv, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnvLocal()

const PREFIX = 'enc:v1:'

function getKey() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim()
  if (!raw) throw new Error('SECRETS_ENCRYPTION_KEY ausente no .env.local')
  try {
    const asB64 = Buffer.from(raw, 'base64')
    if (asB64.length === 32) return asB64
  } catch {
    // fallthrough
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

function encrypt(plain) {
  if (!plain || !String(plain).trim()) return null
  if (String(plain).startsWith(PREFIX)) return plain
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !service) throw new Error('Supabase URL/service role ausentes')

const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

const { data, error } = await sb.from('yop_admin_systems').select('id, notes')
if (error) throw error

let updated = 0
let skipped = 0
for (const row of data ?? []) {
  const notes = row.notes
  if (!notes?.trim()) {
    skipped++
    continue
  }
  if (notes.startsWith(PREFIX)) {
    skipped++
    continue
  }
  const enc = encrypt(notes)
  const { error: upErr } = await sb
    .from('yop_admin_systems')
    .update({ notes: enc, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (upErr) throw upErr
  updated++
}

console.log(JSON.stringify({ ok: true, updated, skipped }))
