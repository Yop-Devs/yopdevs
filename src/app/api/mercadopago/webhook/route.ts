import { NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/admin-api-auth'
import { notifyIfChargeBecamePaid } from '@/lib/admin-telegram-alerts'
import type { BoletoStatus } from '@/lib/admin-cobranca'
import {
  boletoPatchFromMpPayment,
  getMpMerchantOrderPaymentIds,
  getMpPayment,
  verifyMpWebhookSignature,
} from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

type MpWebhookBody = {
  type?: string
  action?: string
  data?: { id?: string | number }
  id?: string | number
  topic?: string
}

async function resolvePaymentIds(request: Request): Promise<string[]> {
  const url = new URL(request.url)
  const queryId = url.searchParams.get('data.id') || url.searchParams.get('id')
  const topic = (url.searchParams.get('type') || url.searchParams.get('topic') || '').toLowerCase()

  let body: MpWebhookBody | null = null

  if (request.method === 'POST') {
    try {
      body = (await request.json()) as MpWebhookBody
    } catch {
      body = null
    }
  }

  const bodyId = body?.data?.id != null ? String(body.data.id) : body?.id != null ? String(body.id) : null
  const bodyTopic = (body?.type || body?.topic || topic || '').toLowerCase()
  const resourceId = bodyId || queryId

  if (!resourceId) return []

  // Merchant order (boleto às vezes chega assim) → expandir para payment ids
  if (bodyTopic === 'merchant_order' || topic === 'merchant_order') {
    try {
      return await getMpMerchantOrderPaymentIds(resourceId)
    } catch (err) {
      console.error('[mp-webhook] merchant_order', err)
      return []
    }
  }

  if (bodyTopic === 'payment' || topic === 'payment' || !bodyTopic) {
    return [resourceId]
  }

  return [resourceId]
}

async function applyPaymentUpdate(paymentId: string) {
  const supabase = getSupabaseServiceRole()
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente')

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

  if (findError) throw new Error(findError.message)

  if ((!existingRows || existingRows.length === 0) && externalRef) {
    const byRef = await supabase
      .from('yop_admin_boletos')
      .select(selectCols)
      .eq('external_reference', externalRef)
      .limit(1)
    if (byRef.error) throw new Error(byRef.error.message)
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

  if (error) throw new Error(error.message)

  if ((!data || data.length === 0) && externalRef) {
    const { error: byRefError } = await supabase
      .from('yop_admin_boletos')
      .update({ ...patch, mp_payment_id: String(paymentId) })
      .eq('external_reference', externalRef)
    if (byRefError) throw new Error(byRefError.message)
  }

  if (existing) {
    const client = Array.isArray(existing.client) ? existing.client[0] ?? null : existing.client
    await notifyIfChargeBecamePaid(previousStatus, { ...existing, client }, patch.status)
  }
}

async function handle(request: Request) {
  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id')
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    console.error('[mp-webhook] MERCADOPAGO_WEBHOOK_SECRET ausente — rejeitando (fail-closed)')
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  // Clona request para poder ler body em resolvePaymentIds após validar assinatura
  const rawBody = await request.text()
  const cloned = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' ? undefined : rawBody,
  })

  // data.id pode vir no query; body ainda não parseado — validação usa query quando houver
  let bodyDataId = dataId
  if (!bodyDataId && rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as { data?: { id?: string | number }; id?: string | number }
      if (parsed?.data?.id != null) bodyDataId = String(parsed.data.id)
      else if (parsed?.id != null) bodyDataId = String(parsed.id)
    } catch {
      /* ignore */
    }
  }

  if (!verifyMpWebhookSignature({ xSignature, xRequestId, dataId: bodyDataId })) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: 'Token MP ausente.' }, { status: 503 })
  }

  try {
    const paymentIds = await resolvePaymentIds(cloned)
    if (!paymentIds.length) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    for (const paymentId of paymentIds) {
      await applyPaymentUpdate(paymentId)
    }

    return NextResponse.json({ ok: true, payments: paymentIds.length })
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
