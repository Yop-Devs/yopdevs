'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/allowed-emails'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import BrandMark from '@/components/BrandMark'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      if (!isEmailAllowed(session.user.email)) {
        await supabase.auth.signOut()
        router.push('/?error=unauthorized')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', session.user.id)
        .single()
      setProfile(profileData)
      setLoading(false)
    }
    checkAccess()
  }, [router])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlBg: html.style.backgroundColor,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    html.style.overflow = 'hidden'
    html.style.height = '100%'
    html.style.backgroundColor = 'rgb(241 245 249)'
    body.style.overflow = 'hidden'
    body.style.height = '100%'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = prev.htmlOverflow
      html.style.height = prev.htmlHeight
      html.style.backgroundColor = prev.htmlBg
      body.style.overflow = prev.bodyOverflow
      body.style.height = prev.bodyHeight
      body.style.overscrollBehavior = prev.bodyOverscroll
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-slate-100 font-semibold text-sm text-slate-700">
        Verificando acesso...
      </div>
    )
  }

  const navItems = [
    {
      name: 'Portfólio',
      href: '/dashboard/portfolio',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    },
    {
      name: 'Perfil',
      href: '/dashboard/perfil',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      name: 'Segurança',
      href: '/dashboard/seguranca',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    },
  ]

  return (
    <div className="fixed inset-0 z-0 flex min-h-0 w-full max-w-full overflow-hidden bg-slate-100 text-slate-900">
      <div
        role="presentation"
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ease-out ${isSidebarOpen ? 'opacity-100 pointer-events-auto bg-slate-900/70 backdrop-blur-sm' : 'opacity-0 pointer-events-none'}`}
        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
      />

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 flex flex-col border-r border-slate-900
        transition-transform duration-300 ease-out
        overflow-hidden
        lg:relative lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="sidebar-top-safe pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 flex items-center justify-center relative bg-slate-950 border-b border-white/10 shrink-0">
          <Link href="/dashboard/portfolio" className="flex items-center justify-center w-full min-h-[4rem]">
            <BrandMark textClassName="text-2xl sm:text-[1.75rem] tracking-wide" />
          </Link>
          <button
            className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-slate-800 text-white border-l-2 border-white'
                  : 'text-white hover:bg-slate-900 border-l-2 border-transparent'
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white truncate uppercase">{profile?.full_name}</p>
            <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Área privada</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 border border-slate-600 text-white hover:bg-slate-900 hover:border-slate-500 hover:text-red-200 transition-all text-[10px] font-bold uppercase tracking-wider"
            title="Sair da conta"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="fixed top-0 left-0 right-0 z-30 w-full safe-top flex flex-col bg-slate-950 border-b border-slate-900 lg:hidden shrink-0 overflow-hidden">
          <div className="h-14 flex items-center justify-between px-4 relative">
            <div className="relative z-10 flex items-center shrink-0 min-w-10 min-h-10">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 -ml-1 text-white hover:text-slate-300 active:opacity-80 transition-colors touch-manipulation"
                aria-label="Abrir menu"
              >
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <Link
              href="/dashboard/portfolio"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-14 z-0"
            >
              <BrandMark textClassName="text-xl tracking-wide" />
            </Link>
            <div className="relative z-10 flex items-center justify-center w-10 h-10 shrink-0 bg-slate-900 overflow-hidden border border-slate-700">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-[10px] text-white leading-none">{profile?.full_name?.[0] || '?'}</span>
              )}
            </div>
          </div>
        </header>

        <main className="main-below-header lg:pt-0 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-slate-100 px-4 min-w-0 max-w-full sm:px-6 md:px-8">
          <div className="min-h-full min-w-0 flex-1 bg-slate-100 pb-6 pb-safe-bottom">{children}</div>
        </main>
      </div>

      <Toaster richColors position="bottom-center" closeButton />
    </div>
  )
}
