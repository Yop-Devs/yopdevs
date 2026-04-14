import type { Metadata } from 'next'
import DashboardHomeClient from './DashboardHomeClient'

export const metadata: Metadata = {
  title: 'Home',
}

export default function DashboardPage() {
  return <DashboardHomeClient />
}
