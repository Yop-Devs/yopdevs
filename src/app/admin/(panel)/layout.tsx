'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import BrandMark from '@/components/BrandMark'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/allowed-emails'
import { adminPaths } from '@/lib/admin-host'
import { adminNavItems } from '@/lib/admin-nav'

const navItems = adminNavItems

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function gate() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(adminPaths.login)
        return
      }
      if (!isEmailAllowed(session.user.email)) {
        await supabase.auth.signOut()
        router.replace(`${adminPaths.login}?error=unauthorized`)
        return
      }
      setEmail(session.user.email ?? null)
      setLoading(false)
    }
    gate()
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace(adminPaths.login)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-700">
        Verificando acesso...
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-100 text-slate-900">
      <Toaster richColors position="top-right" />

      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm transition lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-900 bg-slate-950 transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center border-b border-white/10 px-5 py-5">
          <BrandMark textClassName="text-xl tracking-wide" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Menu</p>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-slate-400">{email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
