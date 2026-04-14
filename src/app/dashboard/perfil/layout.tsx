import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Perfil',
}

export default function PerfilSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
