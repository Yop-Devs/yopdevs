'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function PostDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function loadData() {
    // Carrega o post e o autor
    const { data: p } = await supabase.from('posts').select('*, profiles(full_name, avatar_url)').eq('id', id).single()
    // Carrega a thread de comentários
    const { data: c } = await supabase.from('post_comments').select('*, profiles(full_name, avatar_url)').eq('post_id', id).order('created_at', { ascending: true })
    
    setPost(p)
    setComments(c || [])
  }

  useEffect(() => { loadData() }, [id])

  const sendComment = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && newComment.trim()) {
      const { error } = await supabase.from('post_comments').insert([
        { post_id: id, user_id: user.id, content: newComment }
      ])

      if (error) {
        setStatus({ type: 'error', text: 'FALHA AO TRANSMITIR RESPOSTA.' })
      } else {
        setNewComment('')
        setStatus({ type: 'success', text: 'CONTRIBUIÇÃO REGISTRADA NA THREAD.' })
        loadData()
      }
      setTimeout(() => setStatus(null), 3000)
    }
  }

  if (!post) return <div className="p-10 font-mono text-[10px] text-center uppercase text-slate-400">Acessando_Dados_da_Discussao...</div>

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-10 pb-32">
      {/* Tópico Principal */}
      <article className="bg-white border-2 border-slate-900 rounded-2xl p-10 shadow-sm relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl border-2 border-slate-900 overflow-hidden flex items-center justify-center font-black text-slate-400">
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" /> : post.profiles?.full_name?.[0]}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{post.profiles?.full_name}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Autor do Tópico • {new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-6 leading-tight">{post.title}</h1>
        <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap text-lg">{post.content}</p>
      </article>

      {/* Seção de Respostas (Thread) */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Contribuições ({comments.length})</h3>
          {status && (
            <span className={`text-[9px] font-black uppercase ${status.type === 'success' ? 'text-green-600' : 'text-red-600'} animate-pulse`}>
              {status.text}
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50/50 border-2 border-slate-900 p-6 rounded-2xl flex gap-5 hover:bg-white transition-colors shadow-sm">
              <div className="w-10 h-10 bg-white rounded-lg border-2 border-slate-900 shrink-0 flex items-center justify-center text-xs font-black text-slate-300 overflow-hidden">
                 {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : comment.profiles?.full_name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mb-2">{comment.profiles?.full_name}</p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input para Nova Resposta */}
        <form onSubmit={sendComment} className="mt-12 bg-white border-2 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <textarea 
            rows={4}
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-indigo-600 outline-none resize-none transition-all"
            placeholder="Adicione sua visão técnica ou solução..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="flex justify-end mt-4">
            <button type="submit" className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">
              Publicar Resposta
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}