import { requireAdminHost } from '@/lib/admin-route-guard'
import AdminPanelLayoutClient from './layout-client'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminHost('/login')
  return <AdminPanelLayoutClient>{children}</AdminPanelLayoutClient>
}
