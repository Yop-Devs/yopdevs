import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import { clientDisplayName, type AdminClient } from '@/lib/admin-clients'
import {
  assertClientReadyForBoleto,
  boletoPatchFromMpPayment,
  createMpBoletoPayment,
  resolvePayerDocument,
  type PayerDocChoice,
} from '@/lib/mercadopago'
import { defaultExpirationIso, toNumberAmount } from '@/lib/admin-cobranca'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          'Token do Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no ambiente (e na Vercel).',
      },
      { status: 503 },
    )
  }

  let body: {
    client_id?: unknown
    amount?: unknown
    description?: unknown
    notes?: unknown
    expiration_days?: unknown
    prefer_doc?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const clientId = typeof body.client_id === 'string' ? body.client_id : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null
  const amountRaw =
    typeof body.amount === 'number'
      ? body.amount
      : typeof body.amount === 'string'
        ? toNumberAmount(body.amount)
        : NaN
  const expirationDays =
    typeof body.expiration_days === 'number'
      ? body.expiration_days
      : typeof body.expiration_days === 'string'
        ? Number(body.expiration_days)
        : 3
  const preferDoc: PayerDocChoice | undefined =
    body.prefer_doc === 'cnpj' || body.prefer_doc === 'cpf' ? body.prefer_doc : undefined

  if (!clientId) return NextResponse.json({ error: 'Cliente obrigatório.' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'Descrição obrigatória.' }, { status: 400 })
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }

  const { data: client, error: clientError } = await auth.supabase
    .from('yop_admin_clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }
  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  const adminClient = client as AdminClient

  try {
    assertClientReadyForBoleto(adminClient, preferDoc)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Dados do cliente incompletos.' },
      { status: 400 },
    )
  }

  const draftId = crypto.randomUUID()
  const dateOfExpiration = defaultExpirationIso(
    Number.isFinite(expirationDays) ? Math.min(30, Math.max(1, Math.floor(expirationDays))) : 3,
  )
  const doc = resolvePayerDocument(adminClient, preferDoc)

  const { data: draft, error: draftError } = await auth.supabase
    .from('yop_admin_boletos')
    .insert({
      id: draftId,
      client_id: clientId,
      description,
      amount: Number(amountRaw.toFixed(2)),
      status: 'pending',
      notes: notes || null,
      external_reference: draftId,
      payer_email: adminClient.email,
      payer_name: clientDisplayName(adminClient),
      payer_doc_type: doc.type,
      payer_doc_number: doc.number,
      date_of_expiration: dateOfExpiration,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (draftError || !draft) {
    return NextResponse.json(
      { error: draftError?.message || 'Falha ao reservar cobrança.' },
      { status: 500 },
    )
  }

  try {
    const payment = await createMpBoletoPayment({
      amount: Number(amountRaw.toFixed(2)),
      description,
      externalReference: draftId,
      dateOfExpirationIso: dateOfExpiration,
      client: adminClient,
      preferDoc,
    })

    const patch = boletoPatchFromMpPayment(payment)
    const mpId = payment.id != null ? String(payment.id) : null
    if (!mpId) throw new Error('Mercado Pago não retornou ID do pagamento.')

    const { data: saved, error: saveError } = await auth.supabase
      .from('yop_admin_boletos')
      .update({
        ...patch,
        mp_payment_id: mpId,
        payer_doc_type: doc.type,
        payer_doc_number: doc.number,
        payer_name: clientDisplayName(adminClient),
        payer_email: adminClient.email,
      })
      .eq('id', draftId)
      .select('*, client:yop_admin_clients(id, person_name, company_name, full_name, email, cpf, cnpj, phone)')
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message, mp_payment_id: mpId }, { status: 500 })
    }

    return NextResponse.json({ boleto: saved })
  } catch (err) {
    await auth.supabase
      .from('yop_admin_boletos')
      .update({
        status: 'rejected',
        mp_status_detail: err instanceof Error ? err.message : 'Falha na emissão',
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao emitir boleto no Mercado Pago.' },
      { status: 502 },
    )
  }
}
