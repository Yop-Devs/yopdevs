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
    icon: '/favicon.png',
    apple: '/favicon.png',
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
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var e=console.error,w=console.warn;
  console.error=function(){ var a=arguments[0]; if(typeof a==='string'&&a.indexOf('_cf_bm')!==-1)return; e.apply(console,arguments); };
  console.warn=function(){ var a=arguments[0]; if(typeof a==='string'&&(a.indexOf('pré-carregado')!==-1||a.indexOf('preload')!==-1)&&(a.indexOf('não foi usado')!==-1||a.indexOf('was not used')!==-1))return; w.apply(console,arguments); };
})();
            `.trim(),
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}