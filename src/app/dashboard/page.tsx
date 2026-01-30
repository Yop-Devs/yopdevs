// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [latestProjects, setLatestProjects] = useState<any[]>([])
  const [latestPosts, setLatestPosts] = useState<any[]>([])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
      }
      const [projsRes, postsRes] = await Promise.all([
        supabase.from('projects').select('id, title, category, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id, title, category, created_at').order('created_at', { ascending: false }).limit(5),
      ])
      setLatestProjects(projsRes.data || [])
      setLatestPosts(postsRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const selectRole = async (role: 'DEV' | 'BUSINESS') => {
    if (!profile) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.id)
    if (!error) window.location.reload()
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 font-mono text-[10px] text-slate-400 uppercase tracking-widest">
      Carregando_Sessão_Segura...
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-10">
      {/* Header Profissional */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">YOP DEVS</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">
            Sessão ativa: <span className="text-indigo-600">{profile?.full_name}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/perfil" className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            Configurações
          </Link>
          {profile?.role === 'BUSINESS' && (
            <Link href="/dashboard/projetos/novo" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-lg transition-all">
              Lançar Projeto
            </Link>
          )}
          <Link href="/dashboard/forum/novo" className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 shadow-lg shadow-slate-200 transition-all">
            Novo Post
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna de Conteúdo Principal */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-[#0f172a] p-10 rounded-2xl text-white border border-slate-800 shadow-2xl relative overflow-hidden min-h-[280px] flex flex-col justify-center">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Sessão em Tempo Real</span>
              </div>
              
              <h2 className="text-3xl font-bold tracking-tight mb-4 uppercase italic">
                {profile?.role === 'DEV' ? 'Modo Engenharia Ativo' : 'Visão de Negócios Ativa'}
              </h2>
              
              <p className="text-slate-400 max-w-xl text-sm leading-relaxed font-medium">
                {profile?.role === 'DEV' 
                  ? 'Sua infraestrutura técnica está visível para parceiros estratégicos. Monitore o marketplace para oportunidades de equity.' 
                  : 'Sua tese estratégica está em fase de validação. Conecte-se com engenheiros de software de elite para construir seu produto.'}
              </p>
            </div>
            
            <div className="absolute right-[-20px] bottom-[-40px] text-[180px] font-black opacity-[0.02] italic pointer-events-none select-none">
              {profile?.role || 'USER'}
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Atividade da Rede</h3>
            {latestProjects.length === 0 && latestPosts.length === 0 ? (
              <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                <p className="text-slate-500 text-sm font-medium mb-2">Nenhuma atividade recente.</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Seja o primeiro a lançar um projeto ou criar um tópico no fórum.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Link href="/dashboard/projetos/novo" className="text-[10px] font-black text-indigo-600 hover:underline uppercase">Lançar projeto</Link>
                  <Link href="/dashboard/forum/novo" className="text-[10px] font-black text-indigo-600 hover:underline uppercase">Novo tópico</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {latestProjects.map((p) => (
                  <Link key={p.id} href="/dashboard/projetos" className="block p-5 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group">
                    <p className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-tighter">Novo projeto</p>
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{p.category || 'Venture'} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </Link>
                ))}
                {latestPosts.map((p) => (
                  <Link key={p.id} href={`/dashboard/forum/${p.id}`} className="block p-5 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group">
                    <p className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-tighter">Novo no fórum</p>
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{p.category || 'Geral'} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Barra Lateral - Seletor de Modo */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 italic">Modo de Operação</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => selectRole('DEV')}
                className={`flex items-center justify-between p-5 rounded-xl border transition-all group ${profile?.role === 'DEV' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight">Desenvolvedor</p>
                  <p className="text-[9px] opacity-60 font-mono mt-1">Construção & Escala</p>
                </div>
                <svg className="w-5 h-5 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              </button>

              <button 
                onClick={() => selectRole('BUSINESS')}
                className={`flex items-center justify-between p-5 rounded-xl border transition-all group ${profile?.role === 'BUSINESS' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight">Empresário</p>
                  <p className="text-[9px] opacity-60 font-mono mt-1">Estratégia & ROI</p>
                </div>
                <svg className="w-5 h-5 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Atalhos rápidos</h4>
            <div className="space-y-2">
              <Link href="/dashboard/projetos" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Ver projetos
              </Link>
              <Link href="/dashboard/forum" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Fórum
              </Link>
              <Link href="/dashboard/membros" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Membros
              </Link>
              <Link href="/dashboard/notificacoes" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Alertas
              </Link>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Protocolo de Segurança</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">Sua sessão está criptografada de ponta a ponta via Supabase Auth Protocol v4.0.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}