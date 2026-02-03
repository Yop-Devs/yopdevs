// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { fredoka } from '@/components/Logo'

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

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-100 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
      Carregando_Sessão_Segura...
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
      {/* Header Profissional */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-slate-200 pb-6 sm:pb-8">
        <div>
          <h1 className="leading-none text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
            YOP Devs
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">
            Sessão ativa: <span className="text-violet-600">{profile?.full_name}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/perfil" className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            Configurações
          </Link>
          <Link href="/dashboard/projetos/novo" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-800 shadow-lg transition-all">
            Lançar Projeto
          </Link>
          <Link href="/dashboard/forum/novo" className="px-5 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 shadow-md transition-all">
            Novo Post
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna de Conteúdo Principal */}
        <div className="lg:col-span-8 space-y-8">
          {/* Post fixado: Boas-vindas do administrador */}
          <div className="bg-white border-2 border-violet-200 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
              <span aria-hidden>📌</span> Fixado
            </div>
            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-violet-200 bg-slate-100 flex items-center justify-center">
                <img src="/icone.png" alt="YOP DEVS" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-black text-slate-900 text-sm sm:text-base">YOP DEVS</span>
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-[9px] font-black uppercase tracking-wider">Administrador</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2 sm:mb-3">Bem-vindo à rede</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Olá! Aqui você encontra projetos, vagas e pessoas que pensam como você. Use o <strong>fórum</strong> para tirar dúvidas e trocar ideias, o <strong>Marketplace</strong> para lançar ou encontrar oportunidades e o <strong>chat</strong> para conversar com quem você conectar. Qualquer dúvida, estamos por aqui.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-10 rounded-2xl text-white border border-slate-600 shadow-lg relative overflow-hidden min-h-[280px] flex flex-col justify-center">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sessão em Tempo Real</span>
              </div>
              
              <h2 className="text-3xl font-bold tracking-tight mb-4 uppercase italic">
                Sua rede ativa
              </h2>
              
              <p className="text-slate-300 max-w-xl text-sm leading-relaxed font-medium">
                Poste no fórum, crie projetos e converse com amigos. Todas as ferramentas estão disponíveis para você.
              </p>
            </div>
            
            <div className={`absolute right-[-20px] bottom-[-40px] text-[120px] font-bold opacity-20 pointer-events-none select-none text-white uppercase tracking-tight ${fredoka.className}`}>
              YOP
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Atividade da Rede</h3>
            {latestProjects.length === 0 && latestPosts.length === 0 ? (
              <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                <p className="text-slate-500 text-sm font-medium mb-2">Nenhuma atividade recente.</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Seja o primeiro a lançar um projeto ou criar um tópico no fórum.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Link href="/dashboard/projetos/novo" className="text-[10px] font-black text-violet-600 hover:underline uppercase">Lançar projeto</Link>
                  <Link href="/dashboard/forum/novo" className="text-[10px] font-black text-violet-600 hover:underline uppercase">Novo tópico</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {latestProjects.map((p) => (
                  <Link key={p.id} href="/dashboard/projetos" className="block p-5 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group">
                    <p className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-tighter">Novo projeto</p>
                    <h4 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{p.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{p.category || 'Venture'} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </Link>
                ))}
                {latestPosts.map((p) => (
                  <Link key={p.id} href={`/dashboard/forum/${p.id}`} className="block p-5 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group">
                    <p className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-tighter">Novo no fórum</p>
                    <h4 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{p.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{p.category || 'Geral'} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Barra Lateral */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Atalhos rápidos</h4>
            <div className="space-y-2">
              <Link href="/dashboard/projetos" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Ver projetos
              </Link>
              <Link href="/dashboard/forum" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Comunidade
              </Link>
              <Link href="/dashboard/membros" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Ver Amigos
              </Link>
              <Link href="/dashboard/notificacoes" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Notificações
              </Link>
            </div>
          </div>
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Protocolo de Segurança</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">Sua sessão está criptografada de ponta a ponta via Supabase Auth Protocol v4.0.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}