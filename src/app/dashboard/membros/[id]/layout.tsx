import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Membro',
}

export default function MembroPerfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
