// src/app/layout.tsx
import './globals.css'

export const metadata = {
  title: 'YOP DEVS',
  manifest: '/manifest.json', // Esta linha é essencial
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  )
}