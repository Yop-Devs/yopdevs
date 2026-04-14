'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import MemberPublicPortfolio, {
  type MemberExperienceRow,
  type MemberPortfolioRow,
  type MemberProjectRow,
} from '@/components/member-public-portfolio/MemberPublicPortfolio'
import { useMemberPortfolioLanguage } from '@/components/member-public-portfolio/i18n/MemberLanguageContext'
import MemberLanguageSwitcher from '@/components/member-public-portfolio/MemberLanguageSwitcher'
import { PORTFOLIO_PREVIEW_CHANNEL, type PortfolioPreviewMessage } from '@/lib/portfolio-preview-sync'

export default function PublicPortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { t } = useMemberPortfolioLanguage()
  const [username, setUsername] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<MemberPortfolioRow | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [projects, setProjects] = useState<MemberProjectRow[]>([])
  const [experiences, setExperiences] = useState<MemberExperienceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void params.then((p) => setUsername(p.username))
  }, [params])

  const fetchPortfolio = useCallback(
    async (opts?: { silent?: boolean }) => {
      const slug = username
      if (!slug) return
      const silent = opts?.silent ?? false
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const res = await fetch(`/api/u/${encodeURIComponent(String(slug))}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || t.errorNotFound)
          setPortfolio(null)
          return
        }
        setPortfolio(data.portfolio as MemberPortfolioRow)
        setSkills(data.skills ?? [])
        setProjects(data.projects ?? [])
        setExperiences(data.experiences ?? [])
        setError(null)
      } catch {
        setError(t.errorLoad)
        setPortfolio(null)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [username, t]
  )

  useEffect(() => {
    if (!username) return
    void fetchPortfolio({ silent: false })
  }, [username, fetchPortfolio])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined' || !username) return
    const bc = new BroadcastChannel(PORTFOLIO_PREVIEW_CHANNEL)
    bc.onmessage = (ev: MessageEvent<PortfolioPreviewMessage>) => {
      const msg = ev.data
      if (msg?.type === 'refresh' && msg.username?.toLowerCase() === username.toLowerCase()) {
        void fetchPortfolio({ silent: true })
      }
    }
    return () => bc.close()
  }, [username, fetchPortfolio])

  useEffect(() => {
    if (!username) return
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchPortfolio({ silent: true })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [username, fetchPortfolio])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <p className="animate-pulse font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">
          {t.loading}
        </p>
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-[hsl(var(--background))] px-6 py-16 text-center">
        <div className="absolute right-4 top-4 z-10">
          <MemberLanguageSwitcher />
        </div>
        <Link href="/" className="block">
          <Image src="/logoprincipal.png?v=4" alt="YOP Devs" width={280} height={88} className="h-14 w-auto object-contain" priority unoptimized />
        </Link>
        <p className="max-w-md text-sm text-[hsl(var(--muted-foreground))]">{error || t.errorNotFound}</p>
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
        >
          {t.backToHome}
        </Link>
      </div>
    )
  }

  return (
    <MemberPublicPortfolio portfolio={portfolio} skills={skills} projects={projects} experiences={experiences} />
  )
}
