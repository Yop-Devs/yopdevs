import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Segurança',
}

export default function SegurancaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
