import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nova oportunidade',
}

export default function ProjetosNovoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
