import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Equity',
}

export default function EquityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
