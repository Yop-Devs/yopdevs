import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Professional resume — CEO & builder. Open to opportunities in Ireland, Canada, USA and worldwide. View projects and contact.',
  openGraph: {
    title: 'YOP | Resume',
    description: 'Professional resume. Open to full-time, contract and remote roles. View projects and get in touch.',
    type: 'website',
  },
  robots: 'index, follow',
}

export default function CVLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
