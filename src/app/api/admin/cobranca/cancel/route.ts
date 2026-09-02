import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import { boletoPatchFromMpPayment, cancelMpPayment } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 })

  const { data: boleto, error } = await auth.supabase
    .from('yop_admin_boletos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!boleto) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 })
  if (boleto.status === 'approved') {
    return NextResponse.json({ error: 'Não é possível cancelar cobrança já paga.' }, { status: 400 })
  }
  if (boleto.status === 'cancelled') {
    return NextResponse.json({ boleto })
  }

  try {
    if (boleto.mp_payment_id && process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
      const payment = await cancelMpPayment(boleto.mp_payment_id)
      const patch = boletoPatchFromMpPayment(payment)
      const { data: saved, error: upError } = await auth.supabase
        .from('yop_admin_boletos')
        .update({ ...patch, status: 'cancelled' })
        .eq('id', id)
        .select(
          '*, client:yop_admin_clients(id, person_name, company_name, full_name, email, cpf, cnpj, phone)',
        )
        .single()

      if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })
      return NextResponse.json({ boleto: saved })
    }

    // Link de cartão ainda sem pagamento MP: cancela só no nosso sistema
    const { data: saved, error: upError } = await auth.supabase
      .from('yop_admin_boletos')
      .update({
        status: 'cancelled',
        mp_status: 'cancelled',
        mp_status_detail: 'cancelled_by_admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        '*, client:yop_admin_clients(id, person_name, company_name, full_name, email, cpf, cnpj, phone)',
      )
      .single()

    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })
    return NextResponse.json({ boleto: saved })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao cancelar no Mercado Pago.' },
      { status: 502 },
    )
  }
}
