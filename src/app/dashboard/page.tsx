// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatTimeAgo } from '@/lib/format'

const ONLINE_MS = 5 * 60 * 1000

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_MS
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [latestPosts, setLatestPosts] = useState<any[]>([])
  const [projectsToday, setProjectsToday] = useState<any[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [recentComments, setRecentComments] = useState<any[]>([])
  const [activityItems, setActivityItems] = useState<{ type: 'post' | 'project'; data: any; commentCount?: number; likeCount?: number; viewsCount?: number; iLiked?: boolean }[]>([])
  const [showWelcome, setShowWelcome] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayISO = todayStart.toISOString()
      const onlineCutoff = new Date(Date.now() - ONLINE_MS).toISOString()

      const [postsRes, projsRes, projsTodayRes, profilesRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('id, title, content, category, created_at, author_id, views_count, image_urls, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(8),
        supabase.from('projects').select('id, title, description, category, created_at, owner_id, image_urls, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(8),
        supabase.from('projects').select('id, title').gte('created_at', todayISO),
        supabase.from('profiles').select('last_seen').not('last_seen', 'is', null),
        supabase.from('post_comments').select('id, post_id').order('created_at', { ascending: false }).limit(5),
      ])

      const posts = postsRes.data || []
      const projects = projsRes.data || []
      setLatestPosts(posts)
      setProjectsToday(projsTodayRes.data || [])

      const online = (profilesRes.data || []).filter((p) => isOnline(p.last_seen))
      setOnlineCount(online.length)

      setRecentComments(commentsRes.data || [])

      setMyId(user.id)
      const postIds = posts.map((p) => p.id)
      const commentCounts: Record<string, number> = {}
      const likeCounts: Record<string, number> = {}
      const myLikedIds = new Set<string>()
      if (postIds.length > 0) {
        const [ccRes, likesRes] = await Promise.all([
          supabase.from('post_comments').select('post_id').in('post_id', postIds),
          supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        ])
        ;(ccRes.data || []).forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1 })
        ;(likesRes.data || []).forEach((l) => {
          likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1
          if (l.user_id === user.id) myLikedIds.add(l.post_id)
        })
      }

      const merged: { type: 'post' | 'project'; data: any; commentCount?: number; likeCount?: number; viewsCount?: number; iLiked?: boolean }[] = []
      posts.forEach((p) => merged.push({
        type: 'post',
        data: p,
        commentCount: commentCounts[p.id] || 0,
        likeCount: likeCounts[p.id] || 0,
        viewsCount: (p as any).views_count ?? 0,
        iLiked: myLikedIds.has(p.id),
      }))
      projects.forEach((p) => merged.push({ type: 'project', data: p }))
      merged.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())
      setActivityItems(merged.slice(0, 10))

      if (typeof window !== 'undefined') {
        const seenKey = `yop_welcome_seen_${user.id}`
        setShowWelcome(!localStorage.getItem(seenKey))
      } else {
        setShowWelcome(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const toggleLike = useCallback(async (postId: string, currentILiked: boolean, currentCount: number) => {
    if (!myId) return
    setActivityItems((prev) => prev.map((item) => {
      if (item.type !== 'post' || item.data.id !== postId) return item
      return {
        ...item,
        iLiked: !currentILiked,
        likeCount: currentCount + (currentILiked ? -1 : 1),
      }
    }))
    if (currentILiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert([{ post_id: postId, user_id: myId }])
    }
  }, [myId])

  const handleDismissWelcome = () => {
    if (typeof window === 'undefined') return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        localStorage.setItem(`yop_welcome_seen_${user.id}`, '1')
        setShowWelcome(false)
      }
    })
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-100 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
      Carregando_Sessão_Segura...
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-slate-200 pb-6 sm:pb-8">
        <div>
          <h1 className="leading-none text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
            YOP Devs
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">
            Sessão ativa: <span className="text-violet-600">{profile?.full_name}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/perfil" className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            Configurações
          </Link>
          <Link href="/dashboard/projetos/novo" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-800 shadow-lg transition-all">
            Publicar oportunidade
          </Link>
          <Link href="/dashboard/forum/novo" className="px-5 py-2.5 bg-[#4c1d95] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 shadow-md transition-all">
            Novo Post
          </Link>
        </div>
      </header>

      {/* Feed no topo: Postagens, Projetos hoje, Pessoas online, Comentários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/dashboard/forum" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Postagens recentes</p>
            <p className="text-lg font-bold text-slate-800">{latestPosts.length}</p>
          </div>
        </Link>
        <Link href="/dashboard/projetos" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Oportunidades hoje</p>
            <p className="text-lg font-bold text-slate-800">{projectsToday.length}</p>
          </div>
        </Link>
        <Link href="/dashboard/membros" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pessoas online</p>
            <p className="text-lg font-bold text-slate-800">{onlineCount}</p>
          </div>
        </Link>
        <Link href="/dashboard/forum" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Comentários recentes</p>
            <p className="text-lg font-bold text-slate-800">{recentComments.length}</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Card boas-vindas: apenas primeira vez */}
          {showWelcome && (
            <div className="bg-white border-2 border-violet-200 rounded-xl p-4 sm:p-5 shadow-sm relative">
              <button
                type="button"
                onClick={handleDismissWelcome}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-violet-200 bg-slate-100 flex items-center justify-center p-1">
                  <Image src="/logoprincipal.png?v=4" alt="YOP" width={48} height={48} className="w-full h-full object-contain" unoptimized />
                </div>
                <div className="min-w-0 flex-1 pr-8">
                  <h3 className="font-bold text-slate-800 mb-1">Bem-vindo à rede</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Use o fórum para tirar dúvidas, as Oportunidades para encontrar parceiros e o chat para conversar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Elemento de movimento: pessoas online, novos projetos */}
          <div className="flex flex-wrap gap-4 py-3 px-4 bg-violet-50 border border-violet-200/60 rounded-xl">
            <span className="text-sm font-medium text-slate-700">
              <span className="font-bold text-violet-700">{onlineCount}</span> pessoa{onlineCount !== 1 ? 's' : ''} online agora
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-700">
              <span className="font-bold text-violet-700">{projectsToday.length}</span> nova{projectsToday.length !== 1 ? 's' : ''} oportunidade{projectsToday.length !== 1 ? 's' : ''} hoje
            </span>
          </div>

          {/* Atividade da rede: rica, com autor, foto, comentários, preview */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Atividade da Rede</h3>
            {activityItems.length === 0 ? (
              <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                <p className="text-slate-500 text-sm font-medium mb-2">Nenhuma atividade recente.</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Seja o primeiro a publicar uma oportunidade ou criar um tópico no fórum.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Link href="/dashboard/projetos/novo" className="text-[10px] font-black text-violet-600 hover:underline uppercase">Publicar oportunidade</Link>
                  <Link href="/dashboard/forum/novo" className="text-[10px] font-black text-violet-600 hover:underline uppercase">Novo tópico</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {activityItems.map((item) => {
                  const d = item.data
                  const profileData = d.profiles
                  const isPost = item.type === 'post'
                  const href = isPost ? `/dashboard/forum/${d.id}` : '/dashboard/projetos'
                  const replyHref = isPost ? `/dashboard/forum/${d.id}#comentarios` : '/dashboard/projetos'
                  const preview = isPost && d.content
                    ? String(d.content).replace(/\n/g, ' ').slice(0, 120) + (d.content.length > 120 ? '...' : '')
                    : !isPost && d.description
                    ? String(d.description).replace(/\n/g, ' ').slice(0, 120) + (d.description.length > 120 ? '...' : '')
                    : null
                  const comments = item.commentCount ?? 0
                  const likes = item.likeCount ?? 0
                  const views = item.viewsCount ?? 0
                  const iLiked = item.iLiked ?? false
                  return (
                    <div key={`${item.type}-${d.id}`} className="p-6 bg-white border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-md transition-all group">
                      <Link href={href} className="block">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center text-base font-black text-slate-400">
                            {profileData?.avatar_url ? (
                              <img src={profileData.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              profileData?.full_name?.[0] || '?'
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-violet-500 mb-1.5 uppercase tracking-tighter">
                              {isPost ? 'Novo no fórum' : 'Nova oportunidade'} • {formatTimeAgo(new Date(d.created_at))}
                            </p>
                            <h4 className="text-lg font-black text-slate-900 group-hover:text-violet-600 transition-colors mb-2 leading-tight">{d.title}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {profileData?.full_name || 'Anônimo'}
                            </p>
                            {preview && (
                              <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">{preview}</p>
                            )}
                            {(d.image_urls?.length ?? 0) > 0 && (
                              <div className="flex gap-2 mt-3">
                                {(d.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                                  <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-4 text-slate-500 text-sm">
                          <span title="Comentários">💬 {comments}</span>
                          {isPost && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(d.id, iLiked, likes) }}
                              className={`flex items-center gap-1 hover:scale-110 transition-transform ${iLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'}`}
                              title={iLiked ? 'Descurtir' : 'Curtir'}
                            >
                              {iLiked ? '❤️' : '🤍'} {likes}
                            </button>
                          )}
                          {isPost && <span title="Visualizações">👁 {views}</span>}
                        </div>
                        {isPost && (
                          <Link
                            href={replyHref}
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-violet-200 transition-colors"
                          >
                            Responder
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Atalhos rápidos</h4>
            <div className="space-y-2">
              <Link href="/dashboard/projetos" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Ver oportunidades
              </Link>
              <Link href="/dashboard/forum" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Comunidade
              </Link>
              <Link href="/dashboard/membros" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Conexões
              </Link>
              <Link href="/dashboard/notificacoes" className="block px-4 py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all">
                Central de Atividades
              </Link>
            </div>
          </div>
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Protocolo de Segurança</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">Sua sessão está criptografada de ponta a ponta via Supabase Auth Protocol v4.0.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
