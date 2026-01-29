'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function PublicProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [profile, setProfile] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    // Busca o perfil público
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single()
    // Busca os projetos ativos deste usuário
    const { data: proj } = await supabase.from('projects').select('*').eq('owner_id', id).order('created_at', { ascending: false })
    
    setProfile(prof)
    setProjects(proj || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.5em]">Fetching_Profile_Data...</div>
  if (!profile) return <div className="p-20 text-center font-black uppercase text-red-500 italic">Erro: Perfil não localizado no Firewall.</div>

  return (
    <div className="max-w-[1200px] mx-auto py-16 px-8 space-y-12">
      {/* HEADER DO DOSSIÊ */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-10 border-b-4 border-slate-900 pb-12">
        <div className="w-48 h-48 bg-white border-4 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-black text-slate-100 uppercase">{profile.full_name?.[0]}</div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              {profile.full_name}
            </h1>
            <span className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg tracking-widest shadow-md">
              {profile.role || 'MEMBRO'}
            </span>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>📍 {profile.location || 'Localização Não Informada'}</span>
            <span>⚡ {profile.availability_status || 'ATIVO'}</span>
          </div>

          <div className="flex gap-3 justify-center md:justify-start pt-4">
            {profile.github_url && <a href={profile.github_url} target="_blank" className="p-3 border-2 border-slate-900 rounded-xl hover:bg-slate-50 transition-all font-black text-[10px] uppercase">GitHub</a>}
            {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" className="p-3 border-2 border-slate-900 rounded-xl hover:bg-slate-50 transition-all font-black text-[10px] uppercase">LinkedIn</a>}
            <button 
              onClick={() => router.push(`/dashboard/chat/${id}`)}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[6px_6px_0px_0px_rgba(79,70,229,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              Iniciar Conexão ↗
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* COLUNA: BIOGRAFIA E TECH STACK */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white border-2 border-slate-900 p-8 rounded-3xl shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 border-b border-slate-100 pb-3">Tese de Carreira</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
              "{profile.bio || "Este membro ainda não publicou sua tese profissional no protocolo YOP."}"
            </p>
          </section>

          <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Especialidades Técnicas</h3>
            <div className="flex flex-wrap gap-2">
              {profile.specialties?.split(',').map((spec: string) => (
                <span key={spec} className="px-3 py-1 border border-white/20 rounded text-[9px] font-black uppercase tracking-tighter">
                  {spec.trim()}
                </span>
              )) || <span className="text-[9px] opacity-40">NENHUMA TAG DEFINIDA</span>}
            </div>
          </section>
        </div>

        {/* COLUNA: PROJETOS ATIVOS */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] ml-2 text-slate-400">Ativos em Operação ({projects.length})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <div key={p.id} className="bg-white border-2 border-slate-900 p-6 rounded-2xl hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 rounded uppercase mb-3 inline-block tracking-tighter">{p.category}</span>
                  <h4 className="text-xl font-black uppercase italic mb-2 leading-tight">{p.title}</h4>
                  <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-6">"{p.description}"</p>
                </div>
                <button onClick={() => router.push('/dashboard/projetos')} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline text-left">
                  Ver Detalhes do Equity ↗
                </button>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-[10px] font-black uppercase text-slate-300 tracking-widest italic">
                Nenhum projeto lançado no protocolo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}