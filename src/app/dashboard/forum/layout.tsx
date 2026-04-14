import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comunidade',
}

export default function ForumSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
