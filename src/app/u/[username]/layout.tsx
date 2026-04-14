import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import MemberPortfolioProviders from '@/components/member-public-portfolio/MemberPortfolioProviders'
import '../yop-member-portfolio.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-yop-portfolio-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-yop-portfolio-mono',
  display: 'swap',
})

type Props = { params: Promise<{ username: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const base = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/u/${encodeURIComponent(username)}`, { next: { revalidate: 60 } })
    const data = await res.json()
    if (!data?.portfolio) return { title: 'Portfólio' }
    const headline = data.portfolio.headline || 'Membro YOP Devs'
    const description = [data.portfolio.headline, data.portfolio.bio].filter(Boolean).join(' — ').slice(0, 160)
    return {
      title: `Portfólio /${username}`,
      description: description || `${headline} — Portfólio público na YOP Devs.`,
    }
  } catch {
    return { title: 'Portfólio' }
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`yop-member-portfolio min-h-screen antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
      <MemberPortfolioProviders>{children}</MemberPortfolioProviders>
    </div>
  )
}
