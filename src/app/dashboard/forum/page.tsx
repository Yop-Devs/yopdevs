'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatTimeAgo, formatAuthorName } from '@/lib/format'

type SortBy = 'recent' | 'comments' | 'likes'

const POST_TAGS = ['Discussão', 'Pergunta', 'Ideia', 'Conquista'] as const
const CONTENT_BUCKET = 'content-images'
const MAX_IMAGES = 3
const LIMITE_POSTS_POR_DIA = 5

const EM_ALTA_COMENTARIOS = 20
const EM_ALTA_VISUALIZACOES = 50

export default function ForumPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [usefulCounts, setUsefulCounts] = useState<Record<string, number>>({})
  const [interestingCounts, setInterestingCounts] = useState<Record<string, number>>({})
  const [myLikedIds, setMyLikedIds] = useState<Set<string>>(new Set())
  const [myUsefulIds, setMyUsefulIds] = useState<Set<string>>(new Set())
  const [myInterestingIds, setMyInterestingIds] = useState<Set<string>>(new Set())
  const [myId, setMyId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null)
  const [previewComments, setPreviewComments] = useState<Record<string, { full_name: string; content: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostTag, setNewPostTag] = useState<string>('Discussão')
  const [newPostImages, setNewPostImages] = useState<File[]>([])
  const [newPostPreviews, setNewPostPreviews] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function fetchPosts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setMyId(user.id)
      const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      setMyProfile(prof || null)
    }

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      if (data.length > 0) {
        const ids = data.map((p) => p.id)
        const [commentsRes, likesRes, reactionsRes, allCommentsRes, myLikesRes, myReactionsRes] = await Promise.all([
          supabase.from('post_comments').select('post_id').in('post_id', ids),
          supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
          supabase.from('post_reactions').select('post_id, user_id, reaction_type').in('post_id', ids),
          supabase.from('post_comments').select('post_id, content, profiles(full_name)').in('post_id', ids).order('created_at', { ascending: false }),
          user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', ids) : Promise.resolve({ data: [] }),
          user ? supabase.from('post_reactions').select('post_id, reaction_type').eq('user_id', user.id).in('post_id', ids) : Promise.resolve({ data: [] }),
        ])
        const counts: Record<string, number> = {}
        const likes: Record<string, number> = {}
        const useful: Record<string, number> = {}
        const interesting: Record<string, number> = {}
        ids.forEach((id) => { counts[id] = 0; likes[id] = 0; useful[id] = 0; interesting[id] = 0 })
        commentsRes.data?.forEach((c) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1 })
        likesRes.data?.forEach((l) => { likes[l.post_id] = (likes[l.post_id] || 0) + 1 })
        ;((reactionsRes as any)?.data || []).forEach((r: any) => {
          if (r.reaction_type === 'useful') useful[r.post_id] = (useful[r.post_id] || 0) + 1
          else if (r.reaction_type === 'interesting') interesting[r.post_id] = (interesting[r.post_id] || 0) + 1
        })
        setCommentCounts(counts)
        setLikeCounts(likes)
        setUsefulCounts(useful)
        setInterestingCounts(interesting)
        setMyLikedIds(new Set((myLikesRes.data || []).map((l) => l.post_id)))
        const myUseful = new Set<string>()
        const myInteresting = new Set<string>()
        ;((myReactionsRes as any)?.data || []).forEach((r: any) => {
          if (r.reaction_type === 'useful') myUseful.add(r.post_id)
          else if (r.reaction_type === 'interesting') myInteresting.add(r.post_id)
        })
        setMyUsefulIds(myUseful)
        setMyInterestingIds(myInteresting)

        const byPost: Record<string, { full_name: string; content: string }[]> = {}
        ;(allCommentsRes.data || []).forEach((c: any) => {
          if (!byPost[c.post_id]) byPost[c.post_id] = []
          if (byPost[c.post_id].length < 2 && c.profiles) {
            byPost[c.post_id].push({
              full_name: c.profiles.full_name || 'Usuário',
              content: String(c.content || '').slice(0, 80) + (c.content?.length > 80 ? '...' : ''),
            })
          }
        })
        setPreviewComments(byPost)
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  // Rolar até o composer quando a URL tiver #composer (ex.: link "Publicar na Comunidade" do dashboard)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#composer') {
      const scroll = () => {
        const el = document.getElementById('composer')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      const t = setTimeout(scroll, 300)
      return () => clearTimeout(t)
    }
  }, [loading])

  const handleNewPostImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    const total = [...newPostImages, ...files].slice(0, MAX_IMAGES)
    setNewPostImages(total)
    setNewPostPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u))
      return total.map((f) => URL.createObjectURL(f))
    })
    e.target.value = ''
  }

  const removeNewPostImage = (index: number) => {
    setNewPostPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setNewPostImages((prev) => prev.filter((_, i) => i !== index))
  }

  const publishPost = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newPostContent.trim()
    if (!content || !myId) return
    setPublishing(true)
    setPublishStatus(null)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', myId).gte('created_at', hoje.toISOString())
    if ((count ?? 0) >= LIMITE_POSTS_POR_DIA) {
      setPublishStatus({ type: 'error', text: 'Limite diário de publicações atingido. Tente amanhã.' })
      setPublishing(false)
      return
    }
    const title = content.split('\n')[0]?.slice(0, 120) || 'Publicação'
    let imageUrls: string[] = []
    for (let i = 0; i < newPostImages.length; i++) {
      const file = newPostImages[i]
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `posts/${myId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from(CONTENT_BUCKET).upload(path, file, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }
    }
    const { error } = await supabase.from('posts').insert([{ author_id: myId, title, content, category: newPostTag, image_urls: imageUrls }])
    if (error) {
      setPublishStatus({ type: 'error', text: error.message })
      setPublishing(false)
      return
    }
    setNewPostContent('')
    setNewPostImages([])
    setNewPostPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return [] })
    setPublishStatus({ type: 'success', text: 'Publicado!' })
    setTimeout(() => setPublishStatus(null), 3000)
    fetchPosts()
    setPublishing(false)
  }

  const refetchReactionsForPost = useCallback(async (postId: string) => {
    const [likesRes, reactionsRes] = await Promise.all([
      supabase.from('post_likes').select('user_id').eq('post_id', postId),
      supabase.from('post_reactions').select('user_id, reaction_type').eq('post_id', postId),
    ])
    const likes = likesRes.data || []
    const reactions = (reactionsRes.data || []) as { user_id: string; reaction_type: string }[]
    const likeCount = likes.length
    const iLiked = myId ? likes.some((l) => l.user_id === myId) : false
    const usefulCount = reactions.filter((r) => r.reaction_type === 'useful').length
    const interestingCount = reactions.filter((r) => r.reaction_type === 'interesting').length
    const iUseful = myId ? reactions.some((r) => r.reaction_type === 'useful' && r.user_id === myId) : false
    const iInteresting = myId ? reactions.some((r) => r.reaction_type === 'interesting' && r.user_id === myId) : false
    setLikeCounts((prev) => ({ ...prev, [postId]: likeCount }))
    setUsefulCounts((prev) => ({ ...prev, [postId]: usefulCount }))
    setInterestingCounts((prev) => ({ ...prev, [postId]: interestingCount }))
    setMyLikedIds((prev) => {
      const next = new Set(prev)
      if (iLiked) next.add(postId)
      else next.delete(postId)
      return next
    })
    setMyUsefulIds((prev) => {
      const next = new Set(prev)
      if (iUseful) next.add(postId)
      else next.delete(postId)
      return next
    })
    setMyInterestingIds((prev) => {
      const next = new Set(prev)
      if (iInteresting) next.add(postId)
      else next.delete(postId)
      return next
    })
  }, [myId])

  const toggleLike = useCallback(async (postId: string) => {
    if (!myId) return
    const liked = myLikedIds.has(postId)
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert([{ post_id: postId, user_id: myId }])
    }
    await refetchReactionsForPost(postId)
  }, [myId, myLikedIds, refetchReactionsForPost])

  const toggleUseful = useCallback(async (postId: string) => {
    if (!myId) return
    const active = myUsefulIds.has(postId)
    if (active) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', myId).eq('reaction_type', 'useful')
    } else {
      await supabase.from('post_reactions').insert([{ post_id: postId, user_id: myId, reaction_type: 'useful' }])
    }
    await refetchReactionsForPost(postId)
  }, [myId, myUsefulIds, refetchReactionsForPost])

  const toggleInteresting = useCallback(async (postId: string) => {
    if (!myId) return
    const active = myInterestingIds.has(postId)
    if (active) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', myId).eq('reaction_type', 'interesting')
    } else {
      await supabase.from('post_reactions').insert([{ post_id: postId, user_id: myId, reaction_type: 'interesting' }])
    }
    await refetchReactionsForPost(postId)
  }, [myId, myInterestingIds, refetchReactionsForPost])

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
    <div className="max-w-[1200px] mx-auto w-full min-w-0 py-4 sm:py-6 md:py-10 px-4 sm:px-6 space-y-4 sm:space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b-2 border-slate-200 pb-4 sm:pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-800">Comunidade YOP</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Conecte, compartilhe e aprenda com a rede</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full sm:w-64 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all min-w-0"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSortBy('recent')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'recent' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}>Recentes</button>
            <button type="button" onClick={() => setSortBy('comments')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'comments' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}>Mais comentados</button>
            <button type="button" onClick={() => setSortBy('likes')} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-2 transition-all ${sortBy === 'likes' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-600'}`}>Mais curtidos</button>
          </div>
        </div>
      </header>

      {/* Composer: publicar direto na comunidade */}
      <form id="composer" onSubmit={publishPost} className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 w-full min-w-0">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-start">
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center text-base font-black text-slate-400 bg-slate-50 shrink-0">
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} className="w-full h-full object-cover" alt="" /> : myProfile?.full_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-slate-600 text-sm font-medium mb-2">No que você está pensando?</label>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Compartilhe uma dúvida, ideia ou conquista..."
              rows={4}
              className="w-full p-4 border-2 border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] outline-none transition-all"
              required
            />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                <span>📷</span>
                <span>adicionar imagem</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleNewPostImage} />
              </label>
              <span className="text-slate-400 text-[10px] font-bold">🏷 tags</span>
              {POST_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNewPostTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all ${newPostTag === tag ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}
                >
                  [ {tag} ]
                </button>
              ))}
            </div>
            {newPostPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newPostPreviews.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewPostImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none" aria-label="Remover">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {publishStatus && (
          <p className={`text-sm font-medium ${publishStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{publishStatus.text}</p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={publishing || !newPostContent.trim() || !myId} className="w-full sm:w-auto px-6 py-2.5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-600 font-bold text-lg mb-2">Nenhum tópico encontrado</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">{searchTerm ? 'Tente outro termo de busca.' : 'Seja o primeiro a compartilhar.'}</p>
          {!searchTerm && (
            <button type="button" onClick={() => document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth' })} className="inline-block px-6 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-violet-800 transition-all shadow-md">
              Criar publicação
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => {
            const comments = commentCounts[post.id] ?? 0
            const likes = likeCounts[post.id] ?? 0
            const views = post.views_count ?? 0
            const isEmAlta = comments >= EM_ALTA_COMENTARIOS || views >= EM_ALTA_VISUALIZACOES
            const iLiked = myLikedIds.has(post.id)
            const preview = post.content ? String(post.content).replace(/\n/g, ' ').slice(0, 120) + (post.content.length > 120 ? '...' : '') : ''
            const commentPreviews = previewComments[post.id] || []

            const iUseful = myUsefulIds.has(post.id)
            const iInteresting = myInterestingIds.has(post.id)
            const usefulCount = usefulCounts[post.id] ?? 0
            const interestingCount = interestingCounts[post.id] ?? 0

            return (
              <div key={post.id} className={`bg-white rounded-2xl p-4 sm:p-5 md:p-6 transition-all group w-full min-w-0 ${isEmAlta ? 'border-2 border-violet-400 shadow-md group-hover:shadow-lg group-hover:border-violet-500 group-hover:-translate-y-0.5' : 'border-2 border-slate-200 group-hover:border-violet-200 group-hover:shadow-md group-hover:-translate-y-0.5'}`}>
                {isEmAlta && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-wider">🔥 Em alta</span>
                  </div>
                )}
                <Link href={`/dashboard/forum/${post.id}`} className="flex gap-4 block">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/perfil/${post.author_id}`) }}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/perfil/${post.author_id}`)}
                    className="shrink-0 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center text-sm font-black text-slate-400 bg-slate-50">
                      {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : post.profiles?.full_name?.[0]}
                    </div>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/perfil/${post.author_id}`) }}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/perfil/${post.author_id}`)}
                        className="text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors cursor-pointer"
                      >
                        {formatAuthorName(post.profiles?.full_name)}
                      </span>
                      {post.category && (
                        <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wide">
                          [ {post.category} ]
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">{formatTimeAgo(new Date(post.created_at))}.</p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors mt-2 leading-snug">{post.title}</h3>
                    {preview && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{preview}</p>}
                    {commentPreviews.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-2">
                        {commentPreviews.map((cmt, i) => (
                          <p key={i} className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">{cmt.full_name}</span> comentou: "{cmt.content}"
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-slate-500 text-sm">
                      <span>💬 {comments} {comments === 1 ? 'comentário' : 'comentários'}</span>
                      <span>❤️ {likes}</span>
                      <span>👁 {views}</span>
                      {isEmAlta && <span className="text-amber-600">🔥 Em alta</span>}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 self-start" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </Link>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => toggleLike(post.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${iLiked ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200'}`}>
                    ❤️ Curtir
                  </button>
                  <button type="button" onClick={() => toggleUseful(post.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${iUseful ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-200'}`}>
                    💡 Útil {usefulCount > 0 && <span>({usefulCount})</span>}
                  </button>
                  <button type="button" onClick={() => toggleInteresting(post.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${iInteresting ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-violet-50 hover:text-violet-500 hover:border-violet-200'}`}>
                    🚀 Interessante {interestingCount > 0 && <span>({interestingCount})</span>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
