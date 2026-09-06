import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addDaysIso,
  cuiabaParts,
  formatTimeBr,
  type AgendaEvent,
} from '@/lib/admin-agenda'
import { formatDateBr } from '@/lib/admin-systems'
import { sendTelegramAlert } from '@/lib/telegram'

type NotifyKind = 'day_before' | 'day_of' | 'two_hours_before'

function buildMessage(ev: AgendaEvent, kind: NotifyKind): string {
  const when = ev.event_time
    ? `${formatDateBr(ev.event_date)} às ${formatTimeBr(ev.event_time)}`
    : `${formatDateBr(ev.event_date)} (dia inteiro)`

  const head =
    kind === 'day_before'
      ? '⏰ Agenda — amanhã'
      : kind === 'two_hours_before'
        ? '⏰ Agenda — daqui a ~2h'
        : '⏰ Agenda — hoje'

  const lines = [head, '', `📌 ${ev.title}`, `🗓 ${when}`]
  if (ev.location?.trim()) lines.push(`📍 ${ev.location.trim()}`)
  if (ev.description?.trim()) lines.push('', ev.description.trim())
  return lines.join('\n')
}

async function markNotified(
  yop: SupabaseClient,
  id: string,
  kind: NotifyKind,
): Promise<void> {
  const col =
    kind === 'day_before'
      ? 'notified_day_before_at'
      : kind === 'two_hours_before'
        ? 'notified_two_hours_before_at'
        : 'notified_day_of_at'
  await yop
    .from('yop_admin_agenda_events')
    .update({ [col]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
}

/**
 * Processa avisos da agenda (fuso America/Cuiaba).
 * - Sem horário: véspera (08h) + no dia (08h)
 * - Com horário: véspera (08h) + 2h antes no dia
 */
export async function processAgendaNotifications(
  yop: SupabaseClient,
  now = new Date(),
): Promise<{ sent: number; kinds: string[]; errors: string[] }> {
  const { dateIso: today, hour } = cuiabaParts(now)
  const tomorrow = addDaysIso(today, 1)
  const errors: string[] = []
  const kinds: string[] = []
  let sent = 0

  const { data, error } = await yop
    .from('yop_admin_agenda_events')
    .select('*')
    .eq('notify_enabled', true)
    .gte('event_date', today)
    .lte('event_date', tomorrow)

  if (error) throw new Error(error.message)
  const events = (data ?? []) as AgendaEvent[]

  // --- 08:00 Cuiabá: véspera + dia (sem horário) ---
  if (hour === 8) {
    for (const ev of events) {
      // véspera: evento amanhã
      if (ev.event_date === tomorrow && !ev.notified_day_before_at) {
        const msg = buildMessage(ev, 'day_before')
        const res = await sendTelegramAlert(msg)
        if (res.ok) {
          await markNotified(yop, ev.id, 'day_before')
          sent += 1
          kinds.push(`day_before:${ev.id}`)
        } else {
          errors.push(`${ev.id} day_before: ${res.error}`)
        }
      }

      // no dia às 08h — só eventos SEM horário
      if (ev.event_date === today && !ev.event_time && !ev.notified_day_of_at) {
        const msg = buildMessage(ev, 'day_of')
        const res = await sendTelegramAlert(msg)
        if (res.ok) {
          await markNotified(yop, ev.id, 'day_of')
          sent += 1
          kinds.push(`day_of:${ev.id}`)
        } else {
          errors.push(`${ev.id} day_of: ${res.error}`)
        }
      }
    }
  }

  // --- A cada hora: 2h antes (eventos com horário hoje) ---
  for (const ev of events) {
    if (ev.event_date !== today || !ev.event_time || ev.notified_two_hours_before_at) continue
    const m = ev.event_time.match(/^(\d{2}):(\d{2})/)
    if (!m) continue
    const eventHour = Number(m[1])
    const remindHour = (eventHour - 2 + 24) % 24
    // Janela: na hora certa (e se o evento é < 2h depois da meia-noite, o aviso “véspera” já cobre)
    if (hour !== remindHour) continue
    // Se o horário do evento é 00:00 ou 01:00, 2h antes cai no dia anterior — só avisamos se ainda for hoje
    if (eventHour < 2) continue

    const msg = buildMessage(ev, 'two_hours_before')
    const res = await sendTelegramAlert(msg)
    if (res.ok) {
      await markNotified(yop, ev.id, 'two_hours_before')
      sent += 1
      kinds.push(`two_hours:${ev.id}`)
    } else {
      errors.push(`${ev.id} two_hours: ${res.error}`)
    }
  }

  return { sent, kinds, errors }
}
