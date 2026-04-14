import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tópico',
}

export default function ForumPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
