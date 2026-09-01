export type AdminSystemFileKind = 'env' | 'access' | 'other'

export type AdminSystem = {
  id: string
  name: string
  company_name: string
  link: string | null
  logo_path: string | null
  logo_url: string | null
  is_quitado: boolean
  has_monthly_fee: boolean
  monthly_fee_amount: number | null
  monthly_fee_due_day: number | null
  monthly_next_due: string | null
  is_paying_development: boolean
  development_amount: number | null
  development_paid_off_date: string | null
  domain_expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AdminSystemFile = {
  id: string
  system_id: string
  kind: AdminSystemFileKind
  file_name: string
  file_path: string
  mime_type: string | null
  file_size: number | null
  created_at: string
}

export const ADMIN_SYSTEM_BUCKET = 'admin-system-files'

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null
  const target = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export function formatBrl(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDateBr(dateIso: string | null | undefined): string {
  if (!dateIso) return '—'
  const d = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}
