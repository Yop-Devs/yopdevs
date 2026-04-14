import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oportunidades',
}

export default function ProjetosSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
