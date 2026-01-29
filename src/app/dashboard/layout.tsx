'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      setProfile(profileData)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f8fafc] font-mono text-[10px] uppercase tracking-widest text-slate-400">
      System_Loading...
    </div>
  )

  const navItems = [
    { name: 'HOME', href: '/dashboard', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Forum e discussão', href: '/dashboard/forum', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
    { name: 'Projetos e Ideias', href: '/dashboard/projetos', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { name: 'Notificações', href: '/dashboard/notificacoes', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ]

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="p-8 text-center">
          <Link href="/dashboard" className="text-xl font-black text-white tracking-tighter italic uppercase">YOP DEVS</Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${pathname === item.href ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
              {item.name}
            </Link>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link href="/dashboard/perfil" className={`flex items-center gap-3 px-4 py-3 rounded text-[10px] font-bold uppercase tracking-widest ${pathname === '/dashboard/perfil' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              minha conta
            </Link>
            {profile?.is_admin && (
              <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded text-[10px] font-black uppercase tracking-widest mt-2">
                ADMINISTRADOR
              </Link>
            )}
          </div>
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-800 rounded border border-slate-700 overflow-hidden flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">{profile?.full_name?.[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{profile?.full_name}</p>
            <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{profile?.role || 'Membro'}</p>
          </div>
          <button onClick={handleSignOut} className="text-slate-500 hover:text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">{children}</main>
    </div>
  )
}