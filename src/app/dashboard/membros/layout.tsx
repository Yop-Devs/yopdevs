import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conexões',
}

export default function MembrosSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
