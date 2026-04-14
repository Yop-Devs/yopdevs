import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nova discussão',
}

export default function ForumNovoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
