import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import { syncPendingCharges } from '@/lib/cobranca-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Sincroniza status de uma cobrança (ou todas pendentes) com o Mercado Pago. */
export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado.' }, { status: 503 })
  }

  let body: { id?: unknown; all_pending?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  try {
    if (body.all_pending === true) {
      const results = await syncPendingCharges(auth.supabase, { allPending: true })
      return NextResponse.json({ results })
    }
    if (typeof body.id === 'string' && body.id) {
      const results = await syncPendingCharges(auth.supabase, { ids: [body.id] })
      return NextResponse.json({ results })
    }
    return NextResponse.json({ error: 'Informe id ou all_pending.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao sincronizar.' },
      { status: 500 },
    )
  }
}
