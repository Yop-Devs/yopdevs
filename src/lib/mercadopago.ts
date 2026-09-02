import { createHmac, timingSafeEqual } from 'crypto'
import { onlyDigits } from '@/lib/admin-clients'
import type { AdminClient } from '@/lib/admin-clients'
import {
  BoletoStatus,
  mapMpStatusToInternal,
  pickBoletoFieldsFromMpPayment,
} from '@/lib/admin-cobranca'

const MP_API = 'https://api.mercadopago.com'

export type MpPaymentResponse = {
  id?: number | string
  status?: string
  status_detail?: string
  external_reference?: string | null
  date_of_expiration?: string | null
  date_approved?: string | null
  installments?: number | null
  payment_method_id?: string | null
  payment_type_id?: string | null
  transaction_details?: {
    external_resource_url?: string | null
    payment_method_reference_id?: string | null
  } | null
  point_of_interaction?: {
    transaction_data?: {
      ticket_url?: string | null
      barcode?: string | null
      digitable_line?: string | null
    } | null
  } | null
  barcode?: { content?: string | null } | null
}

export type MpPreferenceResponse = {
  id?: string
  init_point?: string
  sandbox_init_point?: string
  external_reference?: string
  date_of_expiration?: string | null
  message?: string
  error?: string
  cause?: { description?: string; code?: string }[]
}

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente.')
  }
  return token
}

export function webhookNotificationUrl(): string | undefined {
  const base =
    process.env.MERCADOPAGO_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.trim()
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/api/mercadopago/webhook`
}

export function splitPayerName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: 'Cliente', last_name: 'YOP' }
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

export type PayerDocChoice = 'cpf' | 'cnpj'

export function resolvePayerDocument(
  client: Pick<AdminClient, 'cpf' | 'cnpj' | 'person_name' | 'company_name' | 'full_name'>,
  prefer?: PayerDocChoice,
): { type: 'CPF' | 'CNPJ'; number: string; name: string } {
  const cpf = onlyDigits(client.cpf ?? '')
  const cnpj = onlyDigits(client.cnpj ?? '')
  const hasCpf = cpf.length === 11
  const hasCnpj = cnpj.length === 14

  let useCnpj = false
  if (prefer === 'cnpj') {
    if (!hasCnpj) throw new Error('Cliente sem CNPJ válido para a cobrança.')
    useCnpj = true
  } else if (prefer === 'cpf') {
    if (!hasCpf) throw new Error('Cliente sem CPF válido para a cobrança.')
    useCnpj = false
  } else if (hasCpf && hasCnpj) {
    useCnpj = Boolean(client.company_name) && !client.person_name
  } else if (hasCnpj) {
    useCnpj = true
  } else if (hasCpf) {
    useCnpj = false
  } else {
    throw new Error('Cliente sem CPF/CNPJ válido para a cobrança.')
  }

  if (useCnpj) {
    return {
      type: 'CNPJ',
      number: cnpj,
      name: client.company_name || client.person_name || client.full_name || 'Cliente',
    }
  }

  return {
    type: 'CPF',
    number: cpf,
    name: client.person_name || client.company_name || client.full_name || 'Cliente',
  }
}

export function assertClientReadyForBoleto(
  client: Pick<
    AdminClient,
    | 'email'
    | 'cep'
    | 'street'
    | 'address_number'
    | 'neighborhood'
    | 'city'
    | 'state'
    | 'cpf'
    | 'cnpj'
    | 'person_name'
    | 'company_name'
    | 'full_name'
  >,
  prefer?: PayerDocChoice,
) {
  if (!client.email?.trim()) throw new Error('Cliente sem e-mail cadastrado.')
  if (!onlyDigits(client.cep ?? '') || onlyDigits(client.cep ?? '').length !== 8) {
    throw new Error('Cliente sem CEP válido.')
  }
  if (!client.street?.trim()) throw new Error('Cliente sem rua cadastrada.')
  if (!client.address_number?.trim()) throw new Error('Cliente sem número de endereço.')
  if (!client.neighborhood?.trim()) throw new Error('Cliente sem bairro cadastrado.')
  if (!client.city?.trim()) throw new Error('Cliente sem cidade cadastrada.')
  if (!client.state?.trim() || client.state.trim().length !== 2) {
    throw new Error('Cliente sem UF válida (2 letras).')
  }
  resolvePayerDocument(client, prefer)
}

export function assertClientReadyForCard(
  client: Pick<
    AdminClient,
    'email' | 'cpf' | 'cnpj' | 'person_name' | 'company_name' | 'full_name'
  >,
  prefer?: PayerDocChoice,
) {
  if (!client.email?.trim()) throw new Error('Cliente sem e-mail cadastrado.')
  resolvePayerDocument(client, prefer)
}

export async function createMpBoletoPayment(input: {
  amount: number
  description: string
  externalReference: string
  dateOfExpirationIso: string
  client: AdminClient
  preferDoc?: PayerDocChoice
}): Promise<MpPaymentResponse> {
  const doc = resolvePayerDocument(input.client, input.preferDoc)
  const names = splitPayerName(doc.name)
  const notificationUrl = webhookNotificationUrl()

  const body: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description.slice(0, 250),
    payment_method_id: 'bolbradesco',
    date_of_expiration: input.dateOfExpirationIso,
    external_reference: input.externalReference,
    payer: {
      email: input.client.email!.trim(),
      first_name: names.first_name,
      last_name: names.last_name,
      identification: {
        type: doc.type,
        number: doc.number,
      },
      address: {
        zip_code: onlyDigits(input.client.cep!),
        street_name: input.client.street!.trim(),
        street_number: input.client.address_number!.trim(),
        neighborhood: input.client.neighborhood!.trim(),
        city: input.client.city!.trim(),
        federal_unit: input.client.state!.trim().toUpperCase(),
      },
    },
  }

  if (notificationUrl) {
    body.notification_url = notificationUrl
  }

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.externalReference,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as MpPaymentResponse & {
    message?: string
    error?: string
    cause?: { description?: string; code?: string }[]
  }

  if (!res.ok) {
    const cause = json.cause?.map((c) => c.description || c.code).filter(Boolean).join('; ')
    throw new Error(cause || json.message || json.error || `Mercado Pago HTTP ${res.status}`)
  }

  return json
}

/** Checkout Pro: gera link para o cliente pagar com cartão (parcelas conforme o cartão). */
export async function createMpCardCheckoutPreference(input: {
  amount: number
  description: string
  externalReference: string
  dateOfExpirationIso: string
  client: AdminClient
  preferDoc?: PayerDocChoice
  maxInstallments?: number
}): Promise<MpPreferenceResponse> {
  const doc = resolvePayerDocument(input.client, input.preferDoc)
  const names = splitPayerName(doc.name)
  const notificationUrl = webhookNotificationUrl()
  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.trim() ||
    'https://yopdevs.com.br'
  const backBase = siteOrigin.replace(/\/$/, '')

  const body: Record<string, unknown> = {
    items: [
      {
        id: input.externalReference.slice(0, 36),
        title: input.description.slice(0, 256),
        description: input.description.slice(0, 256),
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(input.amount.toFixed(2)),
      },
    ],
    payer: {
      email: input.client.email!.trim(),
      name: names.first_name,
      surname: names.last_name,
      identification: {
        type: doc.type,
        number: doc.number,
      },
    },
    external_reference: input.externalReference,
    statement_descriptor: 'YOP DEVS',
    // Juros de parcelamento: modelo "parcelado comprador" (conta MP).
    // Não ativar "parcelamento sem acréscimos / parcelado vendedor" no painel do MP,
    // senão o custo sai do valor líquido do vendedor.
    metadata: {
      yop_financing: 'buyer',
      yop_charge_type: 'credit_card_link',
    },
    expires: true,
    expiration_date_to: input.dateOfExpirationIso,
    back_urls: {
      success: `${backBase}/`,
      pending: `${backBase}/`,
      failure: `${backBase}/`,
    },
    auto_return: 'approved',
    payment_methods: {
      // Foco em cartão; boleto tem fluxo próprio no admin
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
      // Máximo de parcelas; juros/CET vêm do MP no modelo parcelado comprador
      installments: input.maxInstallments ?? 12,
    },
  }

  if (notificationUrl) {
    body.notification_url = notificationUrl
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as MpPreferenceResponse
  if (!res.ok) {
    const cause = json.cause?.map((c) => c.description || c.code).filter(Boolean).join('; ')
    throw new Error(cause || json.message || json.error || `Mercado Pago HTTP ${res.status}`)
  }
  return json
}

export async function getMpPayment(paymentId: string): Promise<MpPaymentResponse> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
    },
  })
  const json = (await res.json()) as MpPaymentResponse & { message?: string }
  if (!res.ok) {
    throw new Error(json.message || `Falha ao consultar pagamento ${paymentId}`)
  }
  return json
}

/** Busca pagamentos ligados a uma cobrança (cartão via preference). */
export async function findLatestMpPaymentByExternalReference(
  externalReference: string,
): Promise<MpPaymentResponse | null> {
  const url = new URL(`${MP_API}/v1/payments/search`)
  url.searchParams.set('external_reference', externalReference)
  url.searchParams.set('sort', 'date_created')
  url.searchParams.set('criteria', 'desc')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
    },
  })
  const json = (await res.json()) as {
    results?: MpPaymentResponse[]
    message?: string
  }
  if (!res.ok) {
    throw new Error(json.message || 'Falha ao buscar pagamentos no Mercado Pago.')
  }
  const results = json.results ?? []
  return results[0] ?? null
}

export async function cancelMpPayment(paymentId: string): Promise<MpPaymentResponse> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `cancel-${paymentId}-${Date.now()}`,
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })
  const json = (await res.json()) as MpPaymentResponse & { message?: string }
  if (!res.ok) {
    throw new Error(json.message || `Falha ao cancelar pagamento ${paymentId}`)
  }
  return json
}

export function boletoPatchFromMpPayment(payment: MpPaymentResponse): {
  status: BoletoStatus
  mp_status: string | null
  mp_status_detail: string | null
  ticket_url: string | null
  barcode: string | null
  digitable_line: string | null
  date_of_expiration: string | null
  paid_at: string | null
  installments: number | null
  updated_at: string
} {
  const fields = pickBoletoFieldsFromMpPayment(payment)
  const status = mapMpStatusToInternal(payment.status, payment.date_of_expiration)
  return {
    status,
    mp_status: payment.status ?? null,
    mp_status_detail: payment.status_detail ?? null,
    ticket_url: fields.ticket_url,
    barcode: fields.barcode,
    digitable_line: fields.digitable_line,
    date_of_expiration: payment.date_of_expiration ?? null,
    paid_at: status === 'approved' ? payment.date_approved ?? new Date().toISOString() : null,
    installments:
      payment.installments != null && Number(payment.installments) > 0
        ? Number(payment.installments)
        : null,
    updated_at: new Date().toISOString(),
  }
}

/** Valida assinatura de webhook do Mercado Pago (quando secret estiver configurado). */
export function verifyMpWebhookSignature(input: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (!secret) return true
  if (!input.xSignature || !input.dataId) return false

  const parts = Object.fromEntries(
    input.xSignature.split(',').map((chunk) => {
      const [k, ...rest] = chunk.trim().split('=')
      return [k, rest.join('=')]
    }),
  ) as Record<string, string>

  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const dataId = String(input.dataId).toLowerCase()
  let manifest = `id:${dataId};`
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`
  manifest += `ts:${ts};`

  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(v1, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
