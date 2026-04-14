import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portfólio',
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
