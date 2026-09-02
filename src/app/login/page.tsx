import { Suspense } from 'react'
import { requireAdminHost } from '@/lib/admin-route-guard'
import AdminLoginPage from './page-client'

export default async function Page() {
  await requireAdminHost('/login')

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#071338] text-sm text-white/70">
          Carregando...
        </div>
      }
    >
      <AdminLoginPage />
    </Suspense>
  )
}
