'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatTimeAgo, formatAuthorName } from '@/lib/format'

const OPPORTUNITY_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'DEV', label: '👨‍💻 Desenvolvedor' },
  { value: 'SOCIO', label: '🤝 Sócio' },
  { value: 'INVESTIDOR', label: '💰 Investidor' },
  { value: 'MENTOR', label: '🧠 Mentor' },
  { value: 'ENTRAR', label: '🚀 Entrar em projeto' },
] as const

const TYPE_LABELS: Record<string, string> = {
  DEV: '👨‍💻 Preciso de desenvolvedor',
  SOCIO: '🤝 Procuro sócio',
  INVESTIDOR: '💰 Busco investidor',
  MENTOR: '🧠 Preciso de mentor',
  ENTRAR: '🚀 Quero entrar em um projeto',
  VAGA_EMPREGO: 'Vaga de emprego',
  NOVO_PROJETO: 'Novo projeto',
}

function getTypeLabel(category: string | null | undefined): string {
  return (category && TYPE_LABELS[category]) || 'Oportunidade'
}

export default function OportunidadesPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
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
      content: `${displayName} tem interesse na sua oportunidade "${project.title}".`,
      is_read: false,
      link: `/dashboard/chat/${user.id}`,
      from_user_id: user.id,
      metadata: { project_id: project.id, project_title: project.title },
    })
    if (!error) setInterestSent((prev) => ({ ...prev, [project.id]: true }))
  }

  useEffect(() => { fetchProjects() }, [])

  const projectCountByOwner: Record<string, number> = {}
  projects.forEach((p) => {
    const o = p.owner_id
    projectCountByOwner[o] = (projectCountByOwner[o] || 0) + 1
  })

  const filtered = projects.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tech_stack && p.tech_stack.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = !filterType || (p.category && p.category === filterType)
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-widest">
        Carregando oportunidades...
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full min-w-0 px-4 sm:px-6 py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b-2 border-slate-200 pb-4 sm:pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-800">Oportunidades</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">
            Encontre pessoas para tirar sua ideia do papel.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full sm:w-64 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all min-w-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#4c1d95] min-w-0"
          >
            {OPPORTUNITY_TYPES.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Link
            href="/dashboard/projetos/novo"
            className="w-full sm:w-auto flex justify-center sm:inline-flex px-6 py-2.5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-md"
          >
            Publicar oportunidade
          </Link>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-600 font-bold text-lg mb-2">Ainda não há oportunidades publicadas.</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Seja o primeiro a procurar alguém para construir sua ideia 🚀
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/projetos/novo"
              className="inline-block px-6 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-violet-800 transition-all shadow-md"
            >
              Publicar oportunidade
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 md:p-6 hover:border-violet-200 hover:shadow-md transition-all group w-full min-w-0"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={`/dashboard/perfil/${project.owner_id}`} className="shrink-0">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center text-sm font-black text-slate-400 bg-slate-50">
                    {project.profiles?.avatar_url ? (
                      <img src={project.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      project.profiles?.full_name?.[0]
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatAuthorName(project.profiles?.full_name)}
                    </span>
                    <span className="text-slate-400 text-sm">•</span>
                    <span className="text-slate-500 text-sm">{formatTimeAgo(new Date(project.created_at))}.</span>
                    {project.category && (
                      <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wide">
                        {getTypeLabel(project.category)}
                      </span>
                    )}
                    {projectCountByOwner[project.owner_id] === 1 && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                        🏆 Primeiro Projeto
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors mt-2 leading-snug">
                    {project.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mt-2 line-clamp-3">
                    {project.description}
                  </p>
                  {(project.image_urls?.length ?? 0) > 0 && (
                    <div className="flex gap-2 mt-4">
                      {(project.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {project.tech_stack?.trim() && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {project.tech_stack.split(',').slice(0, 5).map((s: string) => (
                        <span
                          key={s}
                          className="text-[9px] font-mono font-bold border border-slate-200 px-2 py-0.5 rounded text-slate-500"
                        >
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                    {project.owner_id !== myId ? (
                      <>
                        <Link
                          href={`/dashboard/chat/${project.owner_id}`}
                          className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-violet-200 transition-colors"
                        >
                          Conectar
                        </Link>
                        <button
                          type="button"
                          disabled={interestSent[project.id]}
                          onClick={() => sendInterest(project)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            interestSent[project.id]
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
                          }`}
                        >
                          {interestSent[project.id] ? 'Interesse enviado ✓' : 'Tenho interesse'}
                        </button>
                      </>
                    ) : (
                      <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        Sua oportunidade
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
