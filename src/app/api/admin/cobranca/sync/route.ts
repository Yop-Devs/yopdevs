import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import { notifyIfChargeBecamePaid } from '@/lib/admin-telegram-alerts'
import type { BoletoStatus } from '@/lib/admin-cobranca'
import {
  boletoPatchFromMpPayment,
  findLatestMpPaymentByExternalReference,
  getMpPayment,
} from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

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

  const ids: string[] = []

  if (body.all_pending === true) {
    const { data, error } = await auth.supabase
      .from('yop_admin_boletos')
      .select('id')
      .in('status', ['pending', 'expired'])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const row of data ?? []) ids.push(row.id)
  } else if (typeof body.id === 'string' && body.id) {
    ids.push(body.id)
  } else {
    return NextResponse.json({ error: 'Informe id ou all_pending.' }, { status: 400 })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const id of ids) {
    const { data: boleto, error } = await auth.supabase
      .from('yop_admin_boletos')
      .select(
        'id, status, description, amount, payment_method, client_id, mp_payment_id, external_reference, date_of_expiration, client:yop_admin_clients(person_name, company_name, full_name)',
      )
      .eq('id', id)
      .maybeSingle()

    if (error || !boleto) {
      results.push({ id, ok: false, error: error?.message || 'Cobrança não encontrada.' })
      continue
    }

    try {
      let payment = null as Awaited<ReturnType<typeof getMpPayment>> | null

      if (boleto.mp_payment_id) {
        payment = await getMpPayment(boleto.mp_payment_id)
      } else if (boleto.external_reference) {
        payment = await findLatestMpPaymentByExternalReference(boleto.external_reference)
      }

      if (!payment) {
        if (boleto.date_of_expiration) {
          const exp = new Date(boleto.date_of_expiration).getTime()
          if (Number.isFinite(exp) && exp < Date.now()) {
            const { error: upError } = await auth.supabase
              .from('yop_admin_boletos')
              .update({
                status: 'expired',
                mp_status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
            if (upError) results.push({ id, ok: false, error: upError.message })
            else results.push({ id, ok: true })
            continue
          }
        }
        results.push({ id, ok: true })
        continue
      }

      const patch = boletoPatchFromMpPayment(payment)
      const previousStatus = boleto.status as BoletoStatus
      const client = Array.isArray(boleto.client) ? boleto.client[0] ?? null : boleto.client
      const { error: upError } = await auth.supabase
        .from('yop_admin_boletos')
        .update({
          ...patch,
          mp_payment_id: payment.id != null ? String(payment.id) : boleto.mp_payment_id,
        })
        .eq('id', id)

      if (upError) {
        results.push({ id, ok: false, error: upError.message })
      } else {
        await notifyIfChargeBecamePaid(
          previousStatus,
          {
            id: boleto.id,
            description: boleto.description,
            amount: boleto.amount,
            status: previousStatus,
            payment_method: boleto.payment_method === 'credit_card' ? 'credit_card' : 'boleto',
            client_id: boleto.client_id,
            client,
          },
          patch.status,
        )
        results.push({ id, ok: true })
      }
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
