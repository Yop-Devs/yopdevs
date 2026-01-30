'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [likesByComment, setLikesByComment] = useState<Record<string, { count: number; iLiked: boolean }>>({})
  const [postLike, setPostLike] = useState<{ count: number; iLiked: boolean }>({ count: 0, iLiked: false })

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const { data: p } = await supabase.from('posts').select('*, profiles(full_name, avatar_url)').eq('id', id).single()
    const { data: c } = await supabase.from('post_comments').select('*, profiles(full_name, avatar_url)').eq('post_id', id).order('created_at', { ascending: true })
    setPost(p)
    const commentList = c || []
    setComments(commentList)

    const { data: postLikes } = await supabase.from('post_likes').select('user_id').eq('post_id', id)
    const postLikeCount = postLikes?.length ?? 0
    const postILiked = user ? (postLikes?.some((l) => l.user_id === user.id) ?? false) : false
    setPostLike({ count: postLikeCount, iLiked: postILiked })

    if (commentList.length > 0) {
      const commentIds = commentList.map((x) => x.id)
      const { data: allLikes } = await supabase.from('post_comment_likes').select('comment_id, user_id').in('comment_id', commentIds)
      const countByComment: Record<string, number> = {}
      const myLiked = new Set<string>()
      ;(allLikes || []).forEach((r) => {
        if (r.comment_id) {
          countByComment[r.comment_id] = (countByComment[r.comment_id] || 0) + 1
          if (user && r.user_id === user.id) myLiked.add(r.comment_id)
        }
      })
      const next: Record<string, { count: number; iLiked: boolean }> = {}
      commentIds.forEach((cid) => {
        next[cid] = { count: countByComment[cid] || 0, iLiked: myLiked.has(cid) }
      })
      setLikesByComment(next)
    } else {
      setLikesByComment({})
    }
  }

  useEffect(() => { loadData() }, [id])

  const sendComment = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && newComment.trim()) {
      const { error } = await supabase.from('post_comments').insert([{ post_id: id, user_id: user.id, content: newComment }])
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

  const togglePostLike = async () => {
    if (!myId || !id) return
    const iLiked = postLike.iLiked
    if (iLiked) {
      await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', myId)
      setPostLike((prev) => ({ count: Math.max(0, prev.count - 1), iLiked: false }))
    } else {
      await supabase.from('post_likes').insert([{ post_id: id, user_id: myId }])
      setPostLike((prev) => ({ count: prev.count + 1, iLiked: true }))
    }
  }

  const toggleLike = async (commentId: string) => {
    if (!myId) return
    const cur = likesByComment[commentId]
    const iLiked = cur?.iLiked ?? false
    if (iLiked) {
      await supabase.from('post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', myId)
      setLikesByComment((prev) => ({ ...prev, [commentId]: { count: Math.max(0, (prev[commentId]?.count ?? 0) - 1), iLiked: false } }))
    } else {
      await supabase.from('post_comment_likes').insert([{ comment_id: commentId, user_id: myId }])
      setLikesByComment((prev) => ({ ...prev, [commentId]: { count: (prev[commentId]?.count ?? 0) + 1, iLiked: true } }))
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
        <div className="mt-6 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={togglePostLike}
            disabled={!myId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${postLike.iLiked ? 'bg-pink-50 border-pink-300 text-pink-600' : 'bg-white border-slate-200 text-slate-500 hover:border-pink-200'}`}
          >
            <span>{postLike.iLiked ? '❤' : '🤍'}</span>
            <span>{postLike.count}</span>
            <span>{postLike.iLiked ? 'Descurtir postagem' : 'Curtir postagem'}</span>
          </button>
        </div>
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
          {comments.map((comment) => {
            const likeInfo = likesByComment[comment.id] ?? { count: 0, iLiked: false }
            return (
              <div key={comment.id} className="bg-slate-50/50 border-2 border-slate-900 p-6 rounded-2xl flex gap-5 hover:bg-white transition-colors shadow-sm">
                <div className="w-10 h-10 bg-white rounded-lg border-2 border-slate-900 shrink-0 flex items-center justify-center text-xs font-black text-slate-300 overflow-hidden">
                  {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : comment.profiles?.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mb-2">{comment.profiles?.full_name}</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                  <button
                    type="button"
                    onClick={() => toggleLike(comment.id)}
                    className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${likeInfo.iLiked ? 'bg-pink-50 border-pink-300 text-pink-600' : 'bg-white border-slate-200 text-slate-500 hover:border-pink-200'}`}
                  >
                    <span>{likeInfo.iLiked ? '❤' : '🤍'}</span>
                    <span>{likeInfo.count}</span>
                    <span>{likeInfo.iLiked ? 'Descurtir' : 'Curtir'}</span>
                  </button>
                </div>
              </div>
            )
          })}
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