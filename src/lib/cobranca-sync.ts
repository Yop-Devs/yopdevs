import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyIfChargeBecamePaid } from '@/lib/admin-telegram-alerts'
import type { BoletoStatus } from '@/lib/admin-cobranca'
import {
  boletoPatchFromMpPayment,
  findLatestMpPaymentByExternalReference,
  getMpPayment,
} from '@/lib/mercadopago'

export type ChargeSyncResult = { id: string; ok: boolean; error?: string; becamePaid?: boolean }

/**
 * Sincroniza cobranças pendentes/expiradas com o Mercado Pago.
 * Usado pelo painel (manual) e pelo cron (automático).
 */
export async function syncPendingCharges(
  supabase: SupabaseClient,
  options?: { ids?: string[]; allPending?: boolean },
): Promise<ChargeSyncResult[]> {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  }

  const ids: string[] = []

  if (options?.ids?.length) {
    ids.push(...options.ids)
  } else if (options?.allPending !== false) {
    const { data, error } = await supabase
      .from('yop_admin_boletos')
      .select('id')
      .in('status', ['pending', 'expired'])
    if (error) throw new Error(error.message)
    for (const row of data ?? []) ids.push(row.id)
  }

  const results: ChargeSyncResult[] = []

  for (const id of ids) {
    const { data: boleto, error } = await supabase
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
          if (Number.isFinite(exp) && exp < Date.now() && boleto.status === 'pending') {
            const { error: upError } = await supabase
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
      const { error: upError } = await supabase
        .from('yop_admin_boletos')
        .update({
          ...patch,
          mp_payment_id: payment.id != null ? String(payment.id) : boleto.mp_payment_id,
        })
        .eq('id', id)

      if (upError) {
        results.push({ id, ok: false, error: upError.message })
      } else {
        const becamePaid = previousStatus !== 'approved' && patch.status === 'approved'
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
        results.push({ id, ok: true, becamePaid })
      }
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao sincronizar',
      })
    }
  }

  return results
}
