'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import FriendsOnlineWidget from '@/components/FriendsOnlineWidget'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUnreadCount = async (userId: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const roleUpper = (profile?.role || '').toUpperCase().trim()
  const isAdminByRole = roleUpper === 'ADMIN' || roleUpper === 'MODERADOR'
  const fullNameUpper = (profile?.full_name || '').toUpperCase()
  const isAdminByName = fullNameUpper.includes('ADMIN') || fullNameUpper.includes('MODERADOR')
  const adminEmails = typeof process.env.NEXT_PUBLIC_ADMIN_EMAILS === 'string'
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : []
  const isAdminByEmail = !!userEmail && adminEmails.includes(userEmail.toLowerCase())
  const showAdminLink = isAdminByRole || isAdminByEmail || isAdminByName

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return; }

      if (typeof window !== 'undefined') (window as any).__notifUserId = session.user.id
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? null)
      const { data: profileData } = await supabase
        .from('profiles').select('id, full_name, role, avatar_url').eq('id', session.user.id).single()
      setProfile(profileData)
      await fetchUnreadCount(session.user.id)
      setLoading(false)
    }
    checkAccess()
  }, [router])

  // Realtime + polling: badge de notificações atualiza em tempo real ou a cada 15s
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('notifications-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchUnreadCount(userId)
      )
      .subscribe()
    const pollInterval = setInterval(() => fetchUnreadCount(userId), 15_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [userId])

  // Heartbeat: marca usuário como online (last_seen) a cada 60s
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    const tick = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id)
      }
    }
    tick()
    interval = setInterval(tick, 60_000)
    return () => { if (interval) clearInterval(interval) }
  }, [])

  useEffect(() => {
    const handler = () => {
      const uid = typeof window !== 'undefined' && (window as any).__notifUserId
      if (uid) fetchUnreadCount(uid)
    }
    window.addEventListener('notifications-updated', handler)
    return () => window.removeEventListener('notifications-updated', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-100 font-semibold text-sm text-slate-700">
      Verificando acesso...
    </div>
  )

  const navItems = [
    { name: 'HOME', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Comunidade', href: '/dashboard/forum', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
    { name: 'Oportunidades', href: '/dashboard/projetos', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { name: 'Meus Projetos', href: '/dashboard/meus-projetos', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Conexões', href: '/dashboard/membros', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Central de Atividades', href: '/dashboard/notificacoes', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { name: 'Perfil', href: '/dashboard/perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { name: 'Portfólio', href: '/dashboard/portfolio', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Segurança', href: '/dashboard/seguranca', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { name: 'Admin', href: '/dashboard/admin', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', adminOnly: true },
  ]

  return (
    <div className="flex h-screen h-screen-pwa bg-slate-100 text-slate-900 overflow-hidden max-w-full">
      
      {/* OVERLAY MOBILE — backdrop escuro, blur leve, animação suave, não empurra layout */}
      <div
        role="presentation"
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ease-out ${isSidebarOpen ? 'opacity-100 pointer-events-auto bg-slate-900/70 backdrop-blur-sm' : 'opacity-0 pointer-events-none'}`}
        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
      />

      {/* SIDEBAR — overlay; no PWA pt-safe para logo não ficar sob a barra de status */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-violet-900 flex flex-col border-r border-violet-800
        transition-transform duration-300 ease-out
        rounded-l-3xl overflow-hidden
        lg:relative lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="sidebar-top-safe pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 flex items-center justify-center relative bg-violet-900 border-b border-white/20 shrink-0">
          <Link href="/dashboard" className="flex items-center justify-center w-full min-h-[4rem]">
            <Image src="/logoprincipal.png?v=4" alt="YOP DEVS" width={280} height={88} className="h-12 sm:h-14 w-auto object-contain object-center" priority unoptimized />
          </Link>
          <button className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.filter((item) => {
            if ('adminOnly' in item && item.adminOnly) return showAdminLink
            return true
          }).map((item) => {
            const isNotifications = item.href === '/dashboard/notificacoes'
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-none text-[10px] font-bold uppercase tracking-wider transition-all ${pathname === item.href ? 'bg-violet-600 text-white shadow-md' : 'text-white hover:bg-violet-800'}`}>
                <span className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                  <span className="truncate">{item.name}</span>
                </span>
                {isNotifications && unreadCount > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Atalho PWA: Salvar na tela inicial (mobile) */}
        <div className="lg:hidden px-4 py-2 border-t border-violet-800">
          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('yop-show-install-prompt'))}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white hover:bg-violet-800 transition-all text-[10px] font-bold uppercase tracking-wider"
          >
            <span className="text-lg" aria-hidden>📱</span>
            <span>Salvar na tela inicial</span>
          </button>
        </div>

        <div className="p-4 bg-violet-900 border-t border-violet-800 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white truncate uppercase">{profile?.full_name}</p>
            <p className="text-[8px] text-violet-200 font-semibold uppercase tracking-wider">
              {showAdminLink ? 'Administrador On-line' : 'Usuário On-line'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-700 text-white hover:bg-violet-800 hover:border-violet-600 hover:text-red-200 transition-all text-[10px] font-bold uppercase tracking-wider"
            title="Sair da conta"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER MOBILE — safe-area no PWA (não fica sob notch), hambúrguer sempre clicável (z-10) */}
        <header className="fixed top-0 left-0 right-0 z-30 w-full safe-top flex flex-col bg-violet-900 border-b border-violet-800 lg:hidden shrink-0 overflow-hidden">
          <div className="h-14 flex items-center justify-between px-4 relative">
            {/* Botão hambúrguer — z-10 acima do logo para garantir toque no PWA */}
            <div className="relative z-10 flex items-center shrink-0 min-w-10 min-h-10">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 -ml-1 text-white hover:text-violet-200 rounded-lg active:opacity-80 transition-colors touch-manipulation"
                aria-label="Abrir menu"
              >
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
            <Link href="/dashboard" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-14 z-0">
              <Image src="/logoprincipal.png?v=4" alt="YOP DEVS" width={140} height={44} className="h-8 w-auto max-w-[140px] object-contain object-center" unoptimized />
            </Link>
            <div className="relative z-10 flex items-center justify-center w-10 h-10 shrink-0 bg-violet-800 rounded-full overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-[10px] text-white leading-none">{profile?.full_name?.[0] || '?'}</span>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA — main-below-header = safe-area + 56px no PWA */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden main-below-header lg:pt-0 px-4 sm:px-6 md:px-8 main-safe-bottom bg-slate-100 min-w-0 max-w-full">
          {children}
        </main>
      </div>

      <FriendsOnlineWidget />
    </div>
  )
}