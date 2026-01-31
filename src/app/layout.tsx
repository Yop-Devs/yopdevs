// src/app/layout.tsx
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import { fredoka } from '@/components/Logo'

export const metadata = {
  title: {
    default: 'YOP DEVS — Equity & Growth',
    template: '%s | YOP DEVS',
  },
  description: 'Rede exclusiva para conexões entre CTOs e empresários. Marketplace de equity, fóruns técnicos e notificações de alto impacto.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icone.png?v=3',
    apple: '/icone.png?v=3',
  },
  openGraph: {
    title: 'YOP DEVS — Equity & Growth',
    description: 'Infraestrutura para mentes brilhantes. Conectamos engenharia de software com tese estratégica de negócios.',
    type: 'website',
  },
  robots: 'index, follow',
}

export const viewport = {
  themeColor: '#6d28d9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className={fredoka.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icone.png?v=3" />
        <link rel="apple-touch-icon" href="/icone.png?v=3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased overflow-x-hidden">
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}