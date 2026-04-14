import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Central de atividades',
}

export default function NotificacoesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
