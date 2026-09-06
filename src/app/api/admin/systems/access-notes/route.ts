import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { fetchAccessNotesPresence } from '@/lib/system-access-notes'

export const dynamic = 'force-dynamic'

/** GET — só flags has_notes por sistema (sem conteúdo). */
export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole()
  if (!yop) {
    return NextResponse.json({ error: 'Supabase service role ausente.' }, { status: 503 })
  }

  try {
    const presence = await fetchAccessNotesPresence(yop)
    return NextResponse.json({ presence })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao listar notas.' },
      { status: 500 },
    )
  }
}
