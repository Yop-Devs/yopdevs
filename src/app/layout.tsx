// src/app/layout.tsx
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import SuppressCloudflareCookieWarning from '@/components/SuppressCloudflareCookieWarning'
import { fredoka } from '@/components/Logo'

export const metadata = {
  title: {
    default: 'YOP DEVS — Equity & Growth',
    template: '%s | YOP DEVS',
  },
  description: 'Rede exclusiva para conexões entre CTOs e empresários. Marketplace de equity, fóruns técnicos e notificações de alto impacto.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/logodash.png',
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
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logodash.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased overflow-x-hidden">
        <SuppressCloudflareCookieWarning />
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}