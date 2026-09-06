import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { secretsEncryptionConfigured } from '@/lib/secrets-crypto'
import { decryptAccessNotes, encryptAccessNotes } from '@/lib/system-access-notes'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** GET — revela bloco de acessos descriptografado (só admin). */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase service role ausente.' }, { status: 503 })
  }

  const { data, error } = await yop
    .from('yop_admin_systems')
    .select('notes')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Sistema não encontrado.' }, { status: 404 })
  }

  try {
    const notes = decryptAccessNotes(data.notes as string | null) ?? ''
    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Não foi possível ler o bloco de acessos. Confira SECRETS_ENCRYPTION_KEY.',
      },
      { status: 500 },
    )
  }
}

/** PUT — grava bloco de acessos criptografado (AES). Body: { notes: string | null } */
export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!secretsEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          'SECRETS_ENCRYPTION_KEY ausente. Configure na Vercel antes de salvar o bloco de acessos.',
      },
      { status: 503 },
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  }

  let body: { notes?: unknown }
  try {
    body = (await request.json()) as { notes?: unknown }
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const plain =
    typeof body.notes === 'string' ? body.notes : body.notes == null ? '' : null
  if (plain === null) {
    return NextResponse.json({ error: 'Campo notes inválido.' }, { status: 400 })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase service role ausente.' }, { status: 503 })
  }

  try {
    const enc = encryptAccessNotes(plain)
    const { error } = await yop
      .from('yop_admin_systems')
      .update({ notes: enc, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, has_notes: Boolean(enc) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao salvar notas.' },
      { status: 500 },
    )
  }
}
