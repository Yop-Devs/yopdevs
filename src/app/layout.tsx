import { headers } from 'next/headers'
import Script from 'next/script'
import './globals.css'
import { fredoka } from '@/components/Logo'

// CSP com nonce exige render dinâmico (Next não injeta nonce em páginas estáticas)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: {
    default: 'YOP Devs | Empresa de Desenvolvimento',
    template: 'YOP Devs | %s',
  },
  description:
    'YOP Devs — empresa de desenvolvimento. Sites, sistemas web, apps e automações. Tecnologia que transforma ideias em sistemas.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'YOP Devs | Empresa de Desenvolvimento',
    description: 'Tecnologia que transforma ideias em sistemas. Projetos reais em produção.',
    type: 'website',
  },
  robots: 'index, follow',
}

export const viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="pt-br" className={`${fredoka.variable} overflow-x-hidden`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased overflow-x-hidden">
        <Script src="/console-filter.js" strategy="beforeInteractive" nonce={nonce} />
        {children}
      </body>
    </html>
  )
}
