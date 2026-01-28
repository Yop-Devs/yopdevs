'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForumPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    
    if (data) setPosts(data)
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  const filteredPosts = posts.filter(post => 
    post.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="p-10 font-mono text-[10px] text-slate-400 uppercase tracking-widest text-center">Sincronizando_Dados...</div>

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-6 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Inteligência Coletiva</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Valide teses e tire dúvidas técnicas</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="Pesquisar tópicos..." 
            className="px-4 py-2 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Link href="/dashboard/forum/novo" className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Novo Tópico
          </Link>
        </div>
      </header>

      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <Link href={`/dashboard/forum/${post.id}`} key={post.id} className="block group">
            <div className="bg-white border-2 border-slate-900 p-6 rounded-xl group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-all flex items-center justify-between">
              <div className="flex gap-6 items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-lg border-2 border-slate-900 overflow-hidden flex items-center justify-center text-xs font-black text-slate-400">
                  {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" /> : post.profiles?.full_name?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase italic tracking-tight group-hover:text-indigo-600">{post.title}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Por {post.profiles?.full_name} • {new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}