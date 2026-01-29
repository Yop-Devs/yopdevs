'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MasterAdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [content, setContent] = useState<{ posts: any[], projects: any[] }>({ posts: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  async function loadData() {
    const { data: p } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    const { data: posts } = await supabase.from('posts').select('*, profiles(full_name)').order('created_at', { ascending: false })
    const { data: projects } = await supabase.from('projects').select('*, profiles(full_name)').order('created_at', { ascending: false })
    
    setUsers(p || [])
    setContent({ posts: posts || [], projects: projects || [] })
    setLoading(false)
  }

  const deleteItem = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      setStatusMsg(`PROTOCOLO DE EXCLUSÃO EXECUTADO: ${table.toUpperCase()}`)
      loadData()
      setTimeout(() => setStatusMsg(null), 3000)
    }
  }

  const banUser = async (userId: string) => {
    // Aqui você pode mudar uma coluna 'is_banned' ou apenas remover o acesso
    const { error } = await supabase.from('profiles').update({ role: 'BANNED' }).eq('id', userId)
    if (!error) {
      setStatusMsg("USUÁRIO RESTRITO NO FIREWALL.")
      loadData()
      setTimeout(() => setStatusMsg(null), 3000)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <div className="p-20 text-center font-mono text-[10px] uppercase text-slate-400">Acessando_Nucleo_Admin...</div>

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-12 space-y-12 font-sans">
      <header className="border-b-2 border-slate-900 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Master Control</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Governança de Dados e Integridade da Rede</p>
        </div>
        {statusMsg && (
          <div className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg animate-pulse">
            {statusMsg}
          </div>
        )}
      </header>

      {/* GESTÃO DE USUÁRIOS */}
      <section className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest italic">Base de Operadores</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">
              <th className="p-6">Identidade</th>
              <th className="p-6">Status/Cargo</th>
              <th className="p-6 text-right">Ações de Segurança</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6">
                  <p className="text-sm font-black text-slate-900 uppercase">{u.full_name}</p>
                  <p className="text-[10px] font-mono text-slate-400 italic">UUID: {u.id.substring(0,18)}...</p>
                </td>
                <td className="p-6">
                  <span className={`text-[9px] font-black px-2 py-1 rounded border-2 ${
                    u.role === 'BANNED' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-900 text-slate-900'
                  }`}>
                    {u.role || 'PENDENTE'}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <button onClick={() => banUser(u.id)} className="text-[10px] font-black text-red-500 uppercase hover:underline">Banir Acesso</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* MODERAÇÃO FÓRUM */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 bg-slate-50 border-b-2 border-slate-900">
            <h2 className="text-xs font-black uppercase tracking-widest">Publicações do Fórum</h2>
          </div>
          <div className="p-4 space-y-4 h-[400px] overflow-y-auto">
            {content.posts.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 border-2 border-slate-100 rounded-xl hover:border-slate-900 transition-all">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase truncate">{p.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Autor: {p.profiles?.full_name}</p>
                </div>
                <button onClick={() => deleteItem('posts', p.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MODERAÇÃO MARKETPLACE */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 bg-slate-50 border-b-2 border-slate-900">
            <h2 className="text-xs font-black uppercase tracking-widest">Vultures / Projetos</h2>
          </div>
          <div className="p-4 space-y-4 h-[400px] overflow-y-auto">
            {content.projects.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 border-2 border-slate-100 rounded-xl hover:border-slate-900 transition-all">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase truncate">{p.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Dono: {p.profiles?.full_name}</p>
                </div>
                <button onClick={() => deleteItem('projects', p.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}