import { redirect } from 'next/navigation'
import { adminPaths } from '@/lib/admin-host'

export default function AdminHomePage() {
  redirect(adminPaths.dashboard)
}
