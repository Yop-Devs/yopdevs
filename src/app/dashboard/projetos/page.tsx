'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'VAGA_EMPREGO', label: 'Vaga de emprego' },
  { value: 'NOVO_PROJETO', label: 'Novo projeto / Startup' },
]

function getTypeLabel(category: string | null | undefined): string {
  if (category === 'VAGA_EMPREGO') return 'Vaga de emprego'
  if (category === 'NOVO_PROJETO') return 'Novo projeto'
  return category || 'Projeto'
}

export default function MarketplacePage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterEquityMin, setFilterEquityMin] = useState<number | ''>('')
  const [interestSent, setInterestSent] = useState<Record<string, boolean>>({})
  const [myId, setMyId] = useState<string | null>(null)

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
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const displayName = profile?.full_name || user.email || 'Um membro'
    const { error } = await supabase.from('notifications').insert({
      user_id: project.owner_id,
      type: 'INTEREST',
      content: `${displayName} tem interesse no seu projeto "${project.title}".`,
      is_read: false,
      link: `/dashboard/chat/${user.id}`,
      from_user_id: user.id,
      metadata: { project_id: project.id, project_title: project.title },
    })
    if (!error) setInterestSent((prev) => ({ ...prev, [project.id]: true }))
  }

  useEffect(() => { fetchProjects() }, [])

  const filtered = projects.filter(p => {
    const matchesSearch = !searchTerm || p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.tech_stack?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = !filterType || (p.category && p.category === filterType)
    const equity = typeof p.equity_offered === 'number' ? p.equity_offered : parseFloat(p.equity_offered) || 0
    const matchesEquity = filterEquityMin === '' || equity >= Number(filterEquityMin)
    return matchesSearch && matchesType && matchesEquity
  })

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400">SYNC_MARKETPLACE_ASSETS...</div>

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-12 space-y-6 sm:space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-8 border-b border-slate-200 pb-6 sm:pb-10">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Marketplace</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">Explorar Ativos e Oportunidades de Equity</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input 
            type="text" 
            placeholder="Pesquisar projetos..." 
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#4c1d95] transition-all w-72 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#4c1d95] w-48"
          >
            {TYPE_OPTIONS.map(opt => <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>)}
          </select>
          <input 
            type="number" 
            min={0} 
            max={100} 
            step={1}
            placeholder="Equity mín. %" 
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#4c1d95] w-28"
            value={filterEquityMin === '' ? '' : filterEquityMin}
            onChange={(e) => setFilterEquityMin(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <Link href="/dashboard/projetos/novo" className="px-8 py-3.5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-md">
            Lançar Projeto
          </Link>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-600 font-bold text-lg mb-2">Nenhum projeto encontrado</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {searchTerm ? 'Tente outro termo de pesquisa.' : 'Seja o primeiro a lançar um projeto e atrair talentos.'}
          </p>
          {!searchTerm && (
            <Link href="/dashboard/projetos/novo" className="inline-block px-8 py-3.5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all">
              Lançar projeto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map((project) => (
            <div key={project.id} className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-lg hover:border-violet-200 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-black px-3 py-1 bg-[#4c1d95] text-white rounded uppercase tracking-tighter">{getTypeLabel(project.category)}</span>
                  <span className="text-[9px] font-mono text-slate-400 italic">ID_{project.id.substring(0,6)}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase italic tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 font-medium mb-8">"{project.description}"</p>
                
                {project.tech_stack?.trim() && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {project.tech_stack.split(',').map((stack: string) => (
                      <span key={stack} className="text-[8px] font-mono font-black border border-slate-200 px-2 py-0.5 rounded text-slate-400 uppercase">
                        {stack.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3 border-t-2 border-slate-50 pt-8">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/perfil/${project.owner_id}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center font-black">
                      {project.profiles?.avatar_url ? <img src={project.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : project.profiles?.full_name?.[0]}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{project.profiles?.full_name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{project.profiles?.role}</p>
                    </div>
                  </Link>
                  {project.owner_id !== myId ? (
                    <Link href={`/dashboard/chat/${project.owner_id}`} className="px-4 py-2 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#4c1d95] hover:text-white transition-all shrink-0">
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