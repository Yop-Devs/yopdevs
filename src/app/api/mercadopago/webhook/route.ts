import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import { notifyIfChargeBecamePaid } from '@/lib/admin-telegram-alerts'
import type { BoletoStatus } from '@/lib/admin-cobranca'
import { boletoPatchFromMpPayment, getMpPayment, verifyMpWebhookSignature } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

async function resolvePaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const queryId = url.searchParams.get('data.id') || url.searchParams.get('id')
  const topic = url.searchParams.get('type') || url.searchParams.get('topic')

  if (queryId && (topic === 'payment' || !topic)) return queryId

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        type?: string
        action?: string
        data?: { id?: string | number }
        id?: string | number
        topic?: string
      }
      if (body?.data?.id != null) return String(body.data.id)
      if (body?.type === 'payment' && body?.id != null) return String(body.id)
      if ((body?.topic === 'payment' || topic === 'payment') && queryId) return queryId
    } catch {
      // body vazio / IPN antigo
    }
  }

  return queryId
}

async function handle(request: Request) {
  const paymentId = await resolvePaymentId(request)
  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id') || paymentId
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  if (
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() &&
    !verifyMpWebhookSignature({ xSignature, xRequestId, dataId })
  ) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'Token MP ausente.' }, { status: 503 })
  }

  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    console.error('[mp-webhook] SUPABASE_SERVICE_ROLE_KEY ausente; não foi possível persistir status.')
    return NextResponse.json({ ok: true, persisted: false })
  }

  try {
    const payment = await getMpPayment(paymentId)
    const patch = boletoPatchFromMpPayment(payment)
    const externalRef = payment.external_reference || null

    const selectCols =
      'id, description, amount, status, payment_method, client_id, client:yop_admin_clients(person_name, company_name, full_name)'

    let { data: existingRows, error: findError } = await supabase
      .from('yop_admin_boletos')
      .select(selectCols)
      .eq('mp_payment_id', String(paymentId))
      .limit(1)

    if (findError) {
      console.error('[mp-webhook] find error', findError.message)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if ((!existingRows || existingRows.length === 0) && externalRef) {
      const byRef = await supabase
        .from('yop_admin_boletos')
        .select(selectCols)
        .eq('external_reference', externalRef)
        .limit(1)
      if (byRef.error) {
        console.error('[mp-webhook] find by ref error', byRef.error.message)
        return NextResponse.json({ error: byRef.error.message }, { status: 500 })
      }
      existingRows = byRef.data
    }

    const existing = existingRows?.[0] as
      | {
          id: string
          description: string
          amount: number
          status: BoletoStatus
          payment_method: 'boleto' | 'credit_card'
          client_id: string
          client:
            | { person_name: string | null; company_name: string | null; full_name: string | null }
            | { person_name: string | null; company_name: string | null; full_name: string | null }[]
            | null
        }
      | undefined

    const previousStatus = existing?.status ?? null

    const { data, error } = await supabase
      .from('yop_admin_boletos')
      .update(patch)
      .eq('mp_payment_id', String(paymentId))
      .select('id')

    if (error) {
      console.error('[mp-webhook] update error', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if ((!data || data.length === 0) && externalRef) {
      const { error: byRefError } = await supabase
        .from('yop_admin_boletos')
        .update({ ...patch, mp_payment_id: String(paymentId) })
        .eq('external_reference', externalRef)
      if (byRefError) {
        console.error('[mp-webhook] update by ref error', byRefError.message)
        return NextResponse.json({ error: byRefError.message }, { status: 500 })
      }
    }

    if (existing) {
      const client = Array.isArray(existing.client) ? existing.client[0] ?? null : existing.client
      await notifyIfChargeBecamePaid(previousStatus, { ...existing, client }, patch.status)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mp-webhook]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha no webhook' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
