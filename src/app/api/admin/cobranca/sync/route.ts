import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import { boletoPatchFromMpPayment, getMpPayment } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

/** Sincroniza status de um boleto (ou todos pendentes) com o Mercado Pago. */
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

  const ids: string[] = []

  if (body.all_pending === true) {
    const { data, error } = await auth.supabase
      .from('yop_admin_boletos')
      .select('id, mp_payment_id')
      .in('status', ['pending', 'expired'])
      .not('mp_payment_id', 'is', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const row of data ?? []) {
      if (row.mp_payment_id) ids.push(row.id)
    }
  } else if (typeof body.id === 'string' && body.id) {
    ids.push(body.id)
  } else {
    return NextResponse.json({ error: 'Informe id ou all_pending.' }, { status: 400 })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const id of ids) {
    const { data: boleto, error } = await auth.supabase
      .from('yop_admin_boletos')
      .select('id, mp_payment_id')
      .eq('id', id)
      .maybeSingle()

    if (error || !boleto?.mp_payment_id) {
      results.push({ id, ok: false, error: error?.message || 'Boleto sem pagamento MP.' })
      continue
    }

    try {
      const payment = await getMpPayment(boleto.mp_payment_id)
      const patch = boletoPatchFromMpPayment(payment)
      const { error: upError } = await auth.supabase.from('yop_admin_boletos').update(patch).eq('id', id)

      if (upError) results.push({ id, ok: false, error: upError.message })
      else results.push({ id, ok: true })
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao sincronizar',
      })
    }
  }

  return NextResponse.json({ results })
}
