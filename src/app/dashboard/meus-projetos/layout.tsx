import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meus projetos',
}

export default function MeusProjetosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
