import { NextResponse } from 'next/server'
import { getSupabaseServiceRole, requireAdminUser } from '@/lib/admin-api-auth'
import { toPublicIntegration, type SystemIntegrationRow } from '@/lib/system-infra-sync'

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

  return NextResponse.json({
    integrations: (data ?? []).map((row) => toPublicIntegration(row as SystemIntegrationRow)),
  })
}
