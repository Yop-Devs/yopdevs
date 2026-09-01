import { Suspense } from 'react'
import AdminLoginPage from './page-client'

export default function Page() {
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
