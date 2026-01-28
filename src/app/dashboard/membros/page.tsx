'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    m.specialties?.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.5em]">Scanning_Network_Nodes...</div>

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-12 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-slate-900 pb-10">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 text-[10px]">Conexões de Rede</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3 italic">Indexação de capital humano e competências técnicas</p>
        </div>
        
        <input 
          type="text" 
          placeholder="PESQUISAR POR NOME OU TECH STACK..." 
          className="px-6 py-4 bg-white border-2 border-slate-900 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-100 transition-all w-full md:w-96 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          onChange={(e) => setFilter(e.target.value)}
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white border-2 border-slate-900 rounded-[2rem] p-8 flex flex-col items-center text-center hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden">
            {/* Badge de Status */}
            <div className="absolute top-4 right-4">
              <span className={`text-[8px] font-black px-2 py-1 rounded border-2 uppercase ${
                member.availability_status === 'DISPONÍVEL' ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-200 text-slate-400 bg-slate-50'
              }`}>
                {member.availability_status || 'ATIVO'}
              </span>
            </div>

            <div className="w-24 h-24 bg-slate-50 border-4 border-slate-900 rounded-3xl overflow-hidden mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform">
              {member.avatar_url ? (
                <img src={member.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-slate-200 flex items-center justify-center h-full uppercase">{member.full_name?.[0]}</span>
              )}
            </div>

            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 mb-1">{member.full_name}</h3>
            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-4">{member.role || 'MEMBRO'}</p>
            
            <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6 h-10 italic">
              {member.bio || "Sem tese de carreira definida no protocolo."}
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {member.specialties?.split(',').slice(0, 3).map((spec: string) => (
                <span key={spec} className="text-[8px] font-black border-2 border-slate-900 px-2 py-0.5 rounded-lg uppercase tracking-tighter">
                  {spec.trim()}
                </span>
              ))}
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <Link 
                href={`/dashboard/perfil/${member.id}`}
                className="py-3 border-2 border-slate-900 rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all"
              >
                Ver Portfólio
              </Link>
              <Link 
                href={`/dashboard/chat/${member.id}`}
                className="py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 transition-all shadow-md"
              >
                Conectar ↗
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}