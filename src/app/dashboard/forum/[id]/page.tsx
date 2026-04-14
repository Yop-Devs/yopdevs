'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'
import { formatTimeAgo, formatAuthorName } from '@/lib/format'
import { forumPostHeadlineAndBody } from '@/lib/forum-post-display'

export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [likesByComment, setLikesByComment] = useState<Record<string, { count: number; iLiked: boolean }>>({})
  const [postLike, setPostLike] = useState<{ count: number; iLiked: boolean }>({ count: 0, iLiked: false })
  const [postUseful, setPostUseful] = useState<{ count: number; iUsed: boolean }>({ count: 0, iUsed: false })
  const [postInteresting, setPostInteresting] = useState<{ count: number; iUsed: boolean }>({ count: 0, iUsed: false })
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const viewedPostsRef = useRef<Set<string>>(new Set())
  const router = useRouter()

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

    const { data: reactions } = await supabase.from('post_reactions').select('user_id, reaction_type').eq('post_id', id)
    const usefulCount = (reactions || []).filter((r: any) => r.reaction_type === 'useful').length
    const interestingCount = (reactions || []).filter((r: any) => r.reaction_type === 'interesting').length
    const iUseful = user ? (reactions || []).some((r: any) => r.reaction_type === 'useful' && r.user_id === user.id) : false
    const iInteresting = user ? (reactions || []).some((r: any) => r.reaction_type === 'interesting' && r.user_id === user.id) : false
    setPostUseful({ count: usefulCount, iUsed: iUseful })
    setPostInteresting({ count: interestingCount, iUsed: iInteresting })

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

  useEffect(() => {
    const postId = Array.isArray(id) ? id[0] : id
    if (!postId || viewedPostsRef.current.has(postId)) return
    viewedPostsRef.current.add(postId)
    void (async () => {
      try {
        await supabase.rpc('increment_post_views', { p_post_id: postId })
      } catch { /* ignora se a função não existir */ }
    })()
  }, [id])

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
    } else {
      await supabase.from('post_likes').insert([{ post_id: id, user_id: myId }])
    }
    loadData()
  }

  const toggleUseful = async () => {
    if (!myId || !id) return
    const iUsed = postUseful.iUsed
    if (iUsed) {
      await supabase.from('post_reactions').delete().eq('post_id', id).eq('user_id', myId).eq('reaction_type', 'useful')
    } else {
      await supabase.from('post_reactions').insert([{ post_id: id, user_id: myId, reaction_type: 'useful' }])
    }
    loadData()
  }

  const toggleInteresting = async () => {
    if (!myId || !id) return
    const iUsed = postInteresting.iUsed
    if (iUsed) {
      await supabase.from('post_reactions').delete().eq('post_id', id).eq('user_id', myId).eq('reaction_type', 'interesting')
    } else {
      await supabase.from('post_reactions').insert([{ post_id: id, user_id: myId, reaction_type: 'interesting' }])
    }
    loadData()
  }

  const requestDeletePost = () => {
    if (!myId || !id || post?.author_id !== myId) return
    setConfirmDeleteOpen(true)
  }

  const executeDeletePost = async () => {
    if (!myId || !id || post?.author_id !== myId) return
    setDeleting(true)
    const { error } = await supabase.from('posts').delete().eq('id', id).eq('author_id', myId)
    setDeleting(false)
    setConfirmDeleteOpen(false)
    if (!error) router.push('/dashboard/forum')
    else setStatus({ type: 'error', text: 'Não foi possível excluir. Tente novamente.' })
  }

  const requestDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId)
  }

  const executeDeleteComment = async () => {
    if (!commentToDelete || !myId) return
    setDeletingCommentId(commentToDelete)
    const { error } = await supabase.from('post_comments').delete().eq('id', commentToDelete).eq('user_id', myId)
    setDeletingCommentId(null)
    setCommentToDelete(null)
    if (!error) loadData()
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

  const { showHeadline, headline, body: postBody } = forumPostHeadlineAndBody(post.title, post.content)

  return (
    <div className="max-w-4xl mx-auto w-full min-w-0 py-4 sm:py-8 md:py-12 px-4 sm:px-6 space-y-6 sm:space-y-8 md:space-y-10 pb-24 sm:pb-32">
      {/* Tópico Principal */}
      <article className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center font-black text-slate-400">
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" /> : post.profiles?.full_name?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{formatAuthorName(post.profiles?.full_name)}</p>
            <p className="text-slate-500 text-sm mt-0.5">{formatTimeAgo(new Date(post.created_at))}.</p>
            {post.category && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wide">[ {post.category} ]</span>
            )}
          </div>
        </div>

        {showHeadline ? (
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-4 sm:mb-6 leading-tight break-words">{headline}</h1>
        ) : null}
        <p className={`leading-relaxed font-medium whitespace-pre-wrap text-lg ${showHeadline ? 'text-slate-600' : 'text-slate-800'}`}>{postBody}</p>
        {(post.image_urls?.length ?? 0) > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {(post.image_urls || []).map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-full max-w-xs rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                <img src={url} alt="" className="w-full h-48 object-cover" />
              </a>
            ))}
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePostLike}
            disabled={!myId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${postLike.iLiked ? 'bg-pink-50 border-pink-300 text-pink-600' : 'bg-white border-slate-200 text-slate-500 hover:border-pink-200'}`}
          >
            <span>{postLike.iLiked ? '❤' : '🤍'}</span>
            <span>{postLike.count}</span>
            <span>{postLike.iLiked ? 'Descurtir' : 'Curtir'}</span>
          </button>
          <button
            type="button"
            onClick={toggleUseful}
            disabled={!myId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${postUseful.iUsed ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'}`}
          >
            💡 Útil {postUseful.count > 0 && `(${postUseful.count})`}
          </button>
          <button
            type="button"
            onClick={toggleInteresting}
            disabled={!myId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${postInteresting.iUsed ? 'bg-violet-50 border-violet-300 text-violet-600' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-200'}`}
          >
            🚀 Interessante {postInteresting.count > 0 && `(${postInteresting.count})`}
          </button>
          {post.author_id === myId && (
            <button
              type="button"
              onClick={requestDeletePost}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-60"
            >
              Excluir minha publicação
            </button>
          )}
        </div>
      </article>

      {/* Seção de Respostas (Thread) */}
      <section id="comentarios" className="space-y-6">
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
              <div key={comment.id} className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl flex gap-5 hover:bg-white transition-colors shadow-sm">
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 shrink-0 flex items-center justify-center text-xs font-black text-slate-300 overflow-hidden">
                  {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : comment.profiles?.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{comment.profiles?.full_name}</p>
                    {comment.user_id === myId && (
                      <button
                        type="button"
                        onClick={() => requestDeleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                        className="text-[9px] font-bold uppercase text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                      >
                        {deletingCommentId === comment.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </div>
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
        <form onSubmit={sendComment} className="mt-12 bg-white border border-slate-200 p-6 rounded-3xl shadow-lg">
          <textarea 
            rows={4}
            spellCheck={false}
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-[#4c1d95] outline-none resize-none transition-all"
            placeholder="Adicione sua visão técnica ou solução..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="flex justify-end mt-4">
            <button type="submit" className="px-10 py-3 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all active:scale-95 shadow-lg">
              Publicar Resposta
            </button>
          </div>
        </form>
      </section>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Excluir publicação"
        message="As respostas também serão removidas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir publicação"
        cancelLabel="Manter publicação"
        onConfirm={executeDeletePost}
        variant="danger"
        loading={deleting}
      />

      <ConfirmModal
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        title="Excluir comentário"
        message="Tem certeza que deseja excluir seu comentário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={executeDeleteComment}
        variant="danger"
        loading={!!deletingCommentId}
      />
    </div>
  )
}