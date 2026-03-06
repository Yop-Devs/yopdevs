import { Metadata } from 'next'

type Props = { params: Promise<{ username: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const base = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/u/${encodeURIComponent(username)}`, { next: { revalidate: 60 } })
    const data = await res.json()
    if (!data?.portfolio) return { title: 'Portfólio | YOP Devs' }
    const name = data.portfolio.display_name || data.portfolio.headline || username
    const description = [data.portfolio.headline, data.portfolio.bio].filter(Boolean).join(' — ').slice(0, 160)
    return {
      title: `${name} | YOP Devs`,
      description: description || `Portfólio de ${name} na rede YOP Devs.`,
    }
  } catch {
    return { title: 'Portfólio | YOP Devs' }
  }
}

export default function Layout({ children }: Props) {
  return <>{children}</>
}
