// src/app/layout.tsx
import './globals.css'

export const metadata = {
  title: 'Yop Devs',
  description: 'Sistema de Treino Prático',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}