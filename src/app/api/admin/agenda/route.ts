import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-api-auth'
import {
  AGENDA_CATEGORIES,
  normalizeTimeInput,
  type AgendaCategory,
  type AgendaEvent,
} from '@/lib/admin-agenda'

export const dynamic = 'force-dynamic'

function isCategory(v: unknown): v is AgendaCategory {
  return typeof v === 'string' && AGENDA_CATEGORIES.some((c) => c.id === v)
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let q = auth.supabase
    .from('yop_admin_agenda_events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })

  if (from) q = q.gte('event_date', from)
  if (to) q = q.lte('event_date', to)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: (data ?? []) as AgendaEvent[] })
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const event_date = typeof body.event_date === 'string' ? body.event_date.trim() : ''
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return NextResponse.json({ error: 'Título e data são obrigatórios.' }, { status: 400 })
  }

  const event_time = normalizeTimeInput(
    typeof body.event_time === 'string' ? body.event_time : null,
  )
  const category = isCategory(body.category) ? body.category : 'geral'

  const payload = {
    title,
    event_date,
    event_time,
    description:
      typeof body.description === 'string' ? body.description.trim() || null : null,
    location: typeof body.location === 'string' ? body.location.trim() || null : null,
    category,
    color: typeof body.color === 'string' ? body.color.trim() || null : null,
    notify_enabled: body.notify_enabled !== false,
    created_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await auth.supabase
    .from('yop_admin_agenda_events')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: data as AgendaEvent })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') {
    const t = body.title.trim()
    if (!t) return NextResponse.json({ error: 'Título inválido.' }, { status: 400 })
    patch.title = t
  }
  if (typeof body.event_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })
    }
    patch.event_date = body.event_date
  }
  if ('event_time' in body) {
    patch.event_time = normalizeTimeInput(
      typeof body.event_time === 'string' ? body.event_time : null,
    )
  }
  if ('description' in body) {
    patch.description =
      typeof body.description === 'string' ? body.description.trim() || null : null
  }
  if ('location' in body) {
    patch.location = typeof body.location === 'string' ? body.location.trim() || null : null
  }
  if (isCategory(body.category)) patch.category = body.category
  if ('color' in body) {
    patch.color = typeof body.color === 'string' ? body.color.trim() || null : null
  }
  if (typeof body.notify_enabled === 'boolean') patch.notify_enabled = body.notify_enabled

  // Se mudou data/hora, zera flags de notificação para reavisar
  if ('event_date' in patch || 'event_time' in patch) {
    patch.notified_day_before_at = null
    patch.notified_day_of_at = null
    patch.notified_two_hours_before_at = null
  }

  const { data, error } = await auth.supabase
    .from('yop_admin_agenda_events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: data as AgendaEvent })
}

export async function DELETE(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('yop_admin_agenda_events').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
