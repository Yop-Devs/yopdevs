// src/app/layout.tsx
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import { fredoka } from '@/components/Logo'

export const metadata = {
  title: {
    default: 'YOP | Home',
    template: 'YOP | %s',
  },
  description: 'Rede exclusiva para conexões entre CTOs e empresários. Marketplace de equity, fóruns técnicos e notificações de alto impacto.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'YOP | Home',
    description: 'Infraestrutura para mentes brilhantes. Conectamos engenharia de software com tese estratégica de negócios.',
    type: 'website',
  },
  robots: 'index, follow',
}

export const viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className={`${fredoka.variable} overflow-x-hidden`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logoprincipal.png" />
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