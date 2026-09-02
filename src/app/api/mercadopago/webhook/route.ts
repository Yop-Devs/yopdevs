import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
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
    // Sem service role o webhook não consegue gravar; responde 200 para evitar retry infinito
    // e deixa o sync manual da UI atualizar.
    console.error('[mp-webhook] SUPABASE_SERVICE_ROLE_KEY ausente; não foi possível persistir status.')
    return NextResponse.json({ ok: true, persisted: false })
  }

  try {
    const payment = await getMpPayment(paymentId)
    const patch = boletoPatchFromMpPayment(payment)
    const externalRef = payment.external_reference || null

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
