import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import {
  toPublicIntegration,
  type SystemIntegrationRow,
  type UsageSnapshotPublic,
} from '@/lib/system-infra-types'

export const dynamic = 'force-dynamic'

/** Lista integrações de todos os sistemas (sem secrets). */
export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const yop = getSupabaseServiceRole() ?? auth.supabase
  const { data, error } = await yop.from('yop_admin_system_integrations').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = (data ?? []).map((row) => (row as SystemIntegrationRow).system_id)
  const snapsBySystem: Record<string, UsageSnapshotPublic[]> = {}

  if (ids.length) {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - 45)
    const { data: snaps } = await yop
      .from('yop_admin_system_usage_snapshots')
      .select('system_id, day, cf_storage_used_bytes, sb_storage_used_bytes, sb_db_used_bytes, resend_sent_today')
      .in('system_id', ids)
      .gte('day', since.toISOString().slice(0, 10))
      .order('day', { ascending: true })

    for (const snap of snaps ?? []) {
      const sid = String(snap.system_id)
      if (!snapsBySystem[sid]) snapsBySystem[sid] = []
      snapsBySystem[sid].push({
        day: String(snap.day),
        cf_storage_used_bytes: snap.cf_storage_used_bytes != null ? Number(snap.cf_storage_used_bytes) : null,
        sb_storage_used_bytes: snap.sb_storage_used_bytes != null ? Number(snap.sb_storage_used_bytes) : null,
        sb_db_used_bytes: snap.sb_db_used_bytes != null ? Number(snap.sb_db_used_bytes) : null,
        resend_sent_today: snap.resend_sent_today != null ? Number(snap.resend_sent_today) : null,
      })
    }
  }

  return NextResponse.json({
    integrations: (data ?? []).map((row) => {
      const typed = row as SystemIntegrationRow
      return toPublicIntegration(typed, snapsBySystem[typed.system_id] ?? [])
    }),
  })
}
