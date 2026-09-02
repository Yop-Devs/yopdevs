import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminPaths, isAdminHost } from '@/lib/admin-host'
import LandingPage from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const host = (await headers()).get('host')

  if (isAdminHost(host)) {
    redirect(adminPaths.login)
  }

  return <LandingPage />
}
