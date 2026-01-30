// src/app/layout.tsx
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata = {
  title: {
    default: 'YOP DEVS — Equity & Growth',
    template: '%s | YOP DEVS',
  },
  description: 'Rede exclusiva para conexões entre CTOs e empresários. Marketplace de equity, fóruns técnicos e notificações de alto impacto.',
  manifest: '/manifest.json',
  themeColor: '#4f46e5',
  openGraph: {
    title: 'YOP DEVS — Equity & Growth',
    description: 'Infraestrutura para mentes brilhantes. Conectamos engenharia de software com tese estratégica de negócios.',
    type: 'website',
  },
  robots: 'index, follow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="antialiased overflow-x-hidden">
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}