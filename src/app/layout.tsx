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
    icon: '/yop-icon-512.png',
    apple: '/yop-icon-512.png',
  },
  openGraph: {
    title: 'YOP Devs | Empresa de Desenvolvimento',
    description: 'Tecnologia que transforma ideias em sistemas. Projetos reais em produção.',
    type: 'website',
  },
  robots: 'index, follow',
}

export const viewport = {
  themeColor: '#0a1740',
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
        <link rel="icon" href="/yop-icon-512.png" type="image/png" />
        <link rel="apple-touch-icon" href="/yop-icon-512.png" />
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