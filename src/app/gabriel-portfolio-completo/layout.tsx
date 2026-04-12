import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './gabriel-owner-portfolio.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-owner-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-owner-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gabriel Costa Carrara — Portfólio completo',
  description:
    'Desenvolvedor full stack, automação e produto. Portfólio pessoal com projetos, experiência e contato — YOP Devs.',
  openGraph: {
    title: 'Gabriel Costa Carrara — Portfólio completo',
    description: 'Full stack, automação e sistemas. YOP Devs e projetos em produção.',
    type: 'website',
    url: 'https://yopdevs.com.br/gabriel-portfolio-completo',
  },
  alternates: {
    canonical: '/gabriel-portfolio-completo',
  },
  robots: { index: true, follow: true },
}

export default function GabrielPortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`gabriel-owner-portfolio min-h-screen antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
      {children}
    </div>
  )
}
