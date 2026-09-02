import type { AdminClient } from '@/lib/admin-clients'
import type { MpPaymentResponse } from '@/lib/mercadopago'

export type ChargePaymentMethod = 'boleto' | 'credit_card'

export type BoletoStatus =
  | 'pending'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'refunded'
  | 'charged_back'
  | 'expired'

export type AdminBoleto = {
  id: string
  client_id: string
  description: string
  amount: number
  status: BoletoStatus
  payment_method: ChargePaymentMethod
  mp_payment_id: string | null
  mp_preference_id: string | null
  mp_status: string | null
  mp_status_detail: string | null
  ticket_url: string | null
  checkout_url: string | null
  barcode: string | null
  digitable_line: string | null
  installments: number | null
  date_of_expiration: string | null
  paid_at: string | null
  payer_email: string | null
  payer_name: string | null
  payer_doc_type: string | null
  payer_doc_number: string | null
  notes: string | null
  external_reference: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  client?: Pick<
    AdminClient,
    'id' | 'person_name' | 'company_name' | 'full_name' | 'email' | 'cpf' | 'cnpj' | 'phone'
  > | null
}

export const PAYMENT_METHOD_LABEL: Record<ChargePaymentMethod, string> = {
  boleto: 'Boleto',
  credit_card: 'Cartão de crédito',
}

export const BOLETO_STATUS_LABEL: Record<BoletoStatus, string> = {
  pending: 'Aguardando pagamento',
  approved: 'Pago',
  cancelled: 'Cancelado',
  rejected: 'Recusado',
  refunded: 'Estornado',
  charged_back: 'Chargeback',
  expired: 'Vencido',
}

export const BOLETO_STATUS_TONE: Record<BoletoStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
  rejected: 'bg-rose-100 text-rose-800',
  refunded: 'bg-violet-100 text-violet-800',
  charged_back: 'bg-rose-100 text-rose-900',
  expired: 'bg-orange-100 text-orange-900',
}

export function toNumberAmount(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function mapMpStatusToInternal(
  mpStatus: string | null | undefined,
  dateOfExpiration?: string | null,
): BoletoStatus {
  const s = (mpStatus ?? '').toLowerCase()
  if (s === 'approved') return 'approved'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'rejected') return 'rejected'
  if (s === 'refunded') return 'refunded'
  if (s === 'charged_back') return 'charged_back'
  if (s === 'pending' || s === 'in_process' || s === 'in_mediation') {
    if (dateOfExpiration) {
      const exp = new Date(dateOfExpiration).getTime()
      if (Number.isFinite(exp) && exp < Date.now()) return 'expired'
    }
    return 'pending'
  }
  if (dateOfExpiration) {
    const exp = new Date(dateOfExpiration).getTime()
    if (Number.isFinite(exp) && exp < Date.now() && (s === '' || s === 'pending')) return 'expired'
  }
  return 'pending'
}

export function pickBoletoFieldsFromMpPayment(payment: MpPaymentResponse): {
  ticket_url: string | null
  barcode: string | null
  digitable_line: string | null
} {
  const td = payment.point_of_interaction?.transaction_data
  const ticket =
    td?.ticket_url ||
    payment.transaction_details?.external_resource_url ||
    null
  const barcode =
    td?.barcode ||
    payment.barcode?.content ||
    payment.transaction_details?.payment_method_reference_id ||
    null
  const digitable =
    td?.digitable_line ||
    payment.transaction_details?.payment_method_reference_id ||
    null
  return {
    ticket_url: ticket,
    barcode: barcode,
    digitable_line: digitable,
  }
}

export function defaultExpirationIso(days = 3): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, days))
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export function formatDateTimeBr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
