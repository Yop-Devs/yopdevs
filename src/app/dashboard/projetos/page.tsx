'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function MarketplacePage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [interestSent, setInterestSent] = useState<Record<string, boolean>>({})
  const [myId, setMyId] = useState<string | null>(null)

  // Tags pré-definidas para filtro rápido
  const techStacks = ['React', 'Node.js', 'Python', 'Go', 'AWS', 'Mobile', 'AI']

  async function fetchProjects() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)
    const { data } = await supabase
      .from('projects')
      .select('*, profiles(full_name, avatar_url, role)')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }

  const sendInterest = async (project: { id: string; title: string; owner_id: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id === project.owner_id) return
    const { error } = await supabase.from('notifications').insert({
      user_id: project.owner_id,
      type: 'INTEREST',
      content: `${user.email || 'Um membro'} demonstrou interesse no seu projeto "${project.title}".`,
      is_read: false,
    })
    if (!error) setInterestSent((prev) => ({ ...prev, [project.id]: true }))
  }

  useEffect(() => { fetchProjects() }, [])

  const filtered = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = selectedTag ? p.tech_stack?.includes(selectedTag) : true
    return matchesSearch && matchesTag
  })

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400">SYNC_MARKETPLACE_ASSETS...</div>

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-12 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-slate-900 pb-10">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Marketplace</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">Explorar Ativos e Oportunidades de Equity</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input 
            type="text" 
            placeholder="Pesquisar ventures..." 
            className="px-6 py-3 bg-white border-2 border-slate-900 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-72 shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Link href="/dashboard/projetos/novo" className="px-8 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            Lançar Projeto
          </Link>
        </div>
      </header>

      {/* Barra de Filtros Tech */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-2 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all ${!selectedTag ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900'}`}
        >
          Todos
        </button>
        {techStacks.map(tag => (
          <button 
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all ${selectedTag === tag ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-600 font-bold text-lg mb-2">Nenhum projeto encontrado</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {searchTerm || selectedTag ? 'Tente outro termo ou filtro.' : 'Seja o primeiro a lançar um projeto e atrair talentos.'}
          </p>
          {!searchTerm && !selectedTag && (
            <Link href="/dashboard/projetos/novo" className="inline-block px-8 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">
              Lançar projeto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map((project) => (
            <div key={project.id} className="bg-white border-2 border-slate-900 rounded-2xl p-8 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-black px-3 py-1 bg-slate-900 text-white rounded uppercase tracking-tighter">{project.category || 'Venture'}</span>
                  <span className="text-[9px] font-mono text-slate-400 italic">ID_{project.id.substring(0,6)}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase italic tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 font-medium mb-8">"{project.description}"</p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {project.tech_stack?.split(',').map((stack: string) => (
                    <span key={stack} className="text-[8px] font-mono font-black border border-slate-200 px-2 py-0.5 rounded text-slate-400 uppercase">
                      {stack.trim()}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 border-t-2 border-slate-50 pt-8">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/perfil/${project.owner_id}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl border-2 border-slate-900 overflow-hidden flex items-center justify-center font-black">
                      {project.profiles?.avatar_url ? <img src={project.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : project.profiles?.full_name?.[0]}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{project.profiles?.full_name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{project.profiles?.role}</p>
                    </div>
                  </Link>
                  {project.owner_id !== myId ? (
                    <Link href={`/dashboard/chat/${project.owner_id}`} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shrink-0">
                      Conectar ↗
                    </Link>
                  ) : (
                    <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 cursor-not-allowed">Seu projeto</span>
                  )}
                </div>
                {project.owner_id !== myId && (
                  <button
                    type="button"
                    disabled={interestSent[project.id]}
                    onClick={() => sendInterest(project)}
                    className={`w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${interestSent[project.id] ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border-2 border-slate-200'}`}
                  >
                    {interestSent[project.id] ? 'Interesse enviado ✓' : 'Tenho interesse'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}