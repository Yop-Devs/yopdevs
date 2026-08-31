// src/app/layout.tsx
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import { fredoka } from '@/components/Logo'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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