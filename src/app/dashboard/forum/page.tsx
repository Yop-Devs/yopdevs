'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type SortBy = 'recent' | 'comments' | 'likes'

export default function ForumPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      if (data.length > 0) {
        const ids = data.map((p) => p.id)
        const [commentsRes, likesRes] = await Promise.all([
          supabase.from('post_comments').select('post_id').in('post_id', ids),
          supabase.from('post_likes').select('post_id').in('post_id', ids),
        ])
        const counts: Record<string, number> = {}
        const likes: Record<string, number> = {}
        ids.forEach((id) => { counts[id] = 0; likes[id] = 0 })
        commentsRes.data?.forEach((c) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1 })
        likesRes.data?.forEach((l) => { likes[l.post_id] = (likes[l.post_id] || 0) + 1 })
        setCommentCounts(counts)
        setLikeCounts(likes)
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  const filteredPosts = posts
    .filter((post) => post.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'comments') {
        const ca = commentCounts[a.id] || 0
        const cb = commentCounts[b.id] || 0
        return cb - ca
      }
      if (sortBy === 'likes') {
        const la = likeCounts[a.id] || 0
        const lb = likeCounts[b.id] || 0
        return lb - la
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  if (loading) return <div className="p-10 font-mono text-[10px] text-slate-400 uppercase tracking-widest text-center">Sincronizando_Dados...</div>

  return (
    <div className="max-w-[1200px] mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-6 sm:space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b-2 border-slate-200 pb-6 sm:pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800">Inteligência Coletiva</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Valide teses e tire dúvidas técnicas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <input 
            type="text" 
            placeholder="Pesquisar tópicos..." 
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'recent' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}
            >
              Recentes
            </button>
            <button
              type="button"
              onClick={() => setSortBy('comments')}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'comments' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}
            >
              Mais comentados
            </button>
            <button
              type="button"
              onClick={() => setSortBy('likes')}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'likes' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}
            >
              Mais curtidos
            </button>
          </div>
          <Link href="/dashboard/forum/novo" className="px-6 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-violet-800 transition-all shadow-md">
            Novo Tópico
          </Link>
        </div>
      </header>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-600 font-bold text-lg mb-2">Nenhum tópico encontrado</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {searchTerm ? 'Tente outro termo de busca.' : 'Seja o primeiro a criar uma discussão.'}
          </p>
          {!searchTerm && (
            <Link href="/dashboard/forum/novo" className="inline-block px-6 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-violet-800 transition-all shadow-md">
              Novo tópico
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Link href={`/dashboard/forum/${post.id}`} key={post.id} className="block group">
              <div className="bg-white border-2 border-slate-200 p-4 sm:p-6 rounded-xl group-hover:shadow-lg group-hover:border-violet-200 group-hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex gap-3 sm:gap-6 items-center min-w-0">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg border-2 border-slate-200 overflow-hidden flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                    {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : post.profiles?.full_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 uppercase italic tracking-tight group-hover:text-violet-700 line-clamp-2 break-words">{post.title}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1 truncate">
                      Por {post.profiles?.full_name} • {new Date(post.created_at).toLocaleDateString('pt-BR')}
                      {(commentCounts[post.id] ?? 0) > 0 && (
                        <span className="ml-2 text-indigo-500">• {commentCounts[post.id]} {commentCounts[post.id] === 1 ? 'resposta' : 'respostas'}</span>
                      )}
                    </p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}