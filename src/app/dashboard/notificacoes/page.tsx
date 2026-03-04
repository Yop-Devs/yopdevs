'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatTimeAgo, formatAuthorName } from '@/lib/format'

type ActivityCategory = 'all' | 'connections' | 'comments' | 'likes' | 'opportunities' | 'system'

function getCategory(type: string | null | undefined): ActivityCategory {
  switch (type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return 'connections'
    case 'FORUM_REPLY':
      return 'comments'
    case 'LIKE':
    case 'COMMENT_LIKE':
      return 'likes'
    case 'INTEREST':
      return 'opportunities'
    case 'CHAT':
    case 'NEWS':
      return 'system'
    default:
      return 'system'
  }
}

function categoryLabel(cat: ActivityCategory): string {
  switch (cat) {
    case 'connections':
      return 'Conexões'
    case 'comments':
      return 'Comentários'
    case 'likes':
      return 'Curtidas'
    case 'opportunities':
      return 'Oportunidades'
    case 'system':
      return 'Sistema'
    default:
      return 'Todas'
  }
}

function categoryIcon(cat: ActivityCategory): string {
  switch (cat) {
    case 'connections':
      return '🤝'
    case 'comments':
      return '💬'
    case 'likes':
      return '❤️'
    case 'opportunities':
      return '🚀'
    case 'system':
      return '⚡'
    default:
      return '✨'
  }
}

function typeIcon(type: string | null | undefined): string {
  switch (type) {
    case 'LIKE':
    case 'COMMENT_LIKE':
      return '❤️'
    case 'FORUM_REPLY':
      return '💬'
    case 'FRIEND_REQUEST':
      return '👋'
    case 'FRIEND_ACCEPTED':
      return '✅'
    case 'INTEREST':
      return '🚀'
    case 'CHAT':
      return '✉️'
    case 'NEWS':
      return '⚡'
    default:
      return '🔔'
  }
}

function getSenderId(n: any): string | null {
  if (n?.from_user_id) return n.from_user_id
  if (n?.metadata?.sender_id) return n.metadata.sender_id
  if (n?.metadata?.from_user_id) return n.metadata.from_user_id
  if ((n?.type === 'CHAT' || /mensagem|message/i.test(n?.content || '')) && n?.link) {
    const m = String(n.link).match(/\/dashboard\/chat\/([a-f0-9-]+)/i)
    return m?.[1] ?? null
  }
  return null
}

function buildSummary(n: any, senderName: string | null): string {
  const name = senderName ? formatAuthorName(senderName) : 'Alguém'
  switch (n?.type) {
    case 'CHAT':
      return `${name} te enviou uma mensagem`
    case 'FRIEND_REQUEST':
      return `${name} quer se conectar com você`
    case 'FRIEND_ACCEPTED':
      return `${name} aceitou sua conexão`
    case 'LIKE':
      return `${name} curtiu sua publicação`
    case 'COMMENT_LIKE':
      return `${name} curtiu seu comentário`
    case 'FORUM_REPLY':
      return `${name} comentou na sua publicação`
    case 'INTEREST':
      return `${name} mostrou interesse em uma oportunidade`
    default:
      return n?.content || 'Nova atividade na sua rede'
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({})
  const [filterCategory, setFilterCategory] = useState<ActivityCategory>('all')
  const [busyAllRead, setBusyAllRead] = useState(false)

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setMyId(user.id)

    const { data: list } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    const notifs = list || []
    setNotifications(notifs)

    const idsToFetch = new Set<string>()
    notifs.forEach((n) => {
      const sid = getSenderId(n)
      if (sid && sid !== user.id) idsToFetch.add(sid)
    })

    if (idsToFetch.size > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(idsToFetch))
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
      ;(profs || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null } })
      setSenderProfiles(map)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
  }

  const markAllAsRead = async () => {
    if (!myId) return
    setBusyAllRead(true)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', myId).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setBusyAllRead(false)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
  }

  const handleNotificationClick = (n: { id: string; link?: string | null }) => {
    void markAsRead(n.id)
    if (n.link) router.push(n.link)
  }

  useEffect(() => { void loadNotifications() }, [])

  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` },
        async (payload) => {
          const newRow = payload.new as any
          if (!newRow?.id) return
          setNotifications((prev) => [newRow, ...prev])
          const sid = getSenderId(newRow)
          if (sid && sid !== myId) {
            const { data: prof } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', sid).single()
            if (prof) setSenderProfiles((prev) => ({ ...prev, [prof.id]: { full_name: prof.full_name ?? null, avatar_url: prof.avatar_url ?? null } }))
          }
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])
  const categories: ActivityCategory[] = ['all', 'connections', 'comments', 'likes', 'opportunities', 'system']

  const filteredNotifications = useMemo(() => (
    filterCategory === 'all' ? notifications : notifications.filter((n) => getCategory(n.type) === filterCategory)
  ), [filterCategory, notifications])

  const grouped = useMemo(() => {
    const acc: Record<string, any[]> = {}
    filteredNotifications.forEach((n) => {
      const cat = getCategory(n.type)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(n)
    })
    return acc
  }, [filteredNotifications])

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando atividades...</div>

  return (
    <div className="max-w-[1000px] mx-auto py-6 sm:py-12 px-4 sm:px-6 space-y-6 sm:space-y-10">
      <header className="border-b-2 border-slate-200 pb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800">Central de Atividades</h1>
          <p className="text-slate-500 text-sm mt-2">Acompanhe interações, convites e movimentações na sua rede.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCategory(c)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterCategory === c ? 'bg-[#4c1d95] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span className="mr-2">{categoryIcon(c)}</span>
                {categoryLabel(c)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}` : 'Tudo em dia'}
            </span>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || busyAllRead}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busyAllRead ? 'Marcando...' : 'Marcar todas como lidas'}
            </button>
          </div>
        </div>
      </header>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-700 font-bold text-lg mb-2">Ainda não há atividades por aqui.</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Quando alguém curtir, comentar ou se conectar com você, aparecerá aqui 🚀
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/forum')}
            className="inline-block px-6 py-2.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all shadow-md"
          >
            Ir para Comunidade
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filterCategory === 'all' ? (
            categories.filter((c) => c !== 'all').map((c) => {
              const items = grouped[c] || []
              if (items.length === 0) return null
              return (
                <section key={c} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcon(c)}</span>
                    <h2 className="text-sm font-bold text-slate-800">{categoryLabel(c)}</h2>
                  </div>
                  <div className="space-y-3">
                    {items.map((n: any) => (
                      <ActivityCard
                        key={n.id}
                        n={n}
                        senderProfiles={senderProfiles}
                        onOpen={() => handleNotificationClick(n)}
                        onMarkRead={() => markAsRead(n.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n: any) => (
                <ActivityCard
                  key={n.id}
                  n={n}
                  senderProfiles={senderProfiles}
                  onOpen={() => handleNotificationClick(n)}
                  onMarkRead={() => markAsRead(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityCard({
  n,
  senderProfiles,
  onOpen,
  onMarkRead,
}: {
  n: any
  senderProfiles: Record<string, { full_name: string | null; avatar_url: string | null }>
  onOpen: () => void
  onMarkRead: () => void
}) {
  const senderId = getSenderId(n)
  const sender = senderId ? senderProfiles[senderId] : null
  const senderName = sender?.full_name || null
  const summary = buildSummary(n, senderName)
  const time = n?.created_at ? formatTimeAgo(new Date(n.created_at)) : ''
  const unread = !n?.is_read
  const icon = typeIcon(n?.type)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`bg-white rounded-2xl p-5 sm:p-6 transition-all cursor-pointer ${unread ? 'border-2 border-violet-300 shadow-sm' : 'border-2 border-slate-200'} hover:border-violet-200 hover:shadow-md`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center text-sm font-black text-slate-400 bg-slate-50 shrink-0">
          {sender?.avatar_url ? (
            <img src={sender.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span>{formatAuthorName(senderName || 'Usuário')[0]}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{icon}</span>
            <p className="text-sm font-semibold text-slate-900 break-words">{summary}</p>
            {unread && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-1 rounded-lg">
                Novo
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
            {time && <span>{time}</span>}
            {n?.type && <span className="text-slate-300">•</span>}
            {n?.type && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {categoryLabel(getCategory(n.type))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onOpen}
          className="px-4 py-2 rounded-xl bg-[#4c1d95] text-white text-sm font-bold hover:bg-violet-800 transition-all"
        >
          Ver
        </button>
        <button
          type="button"
          onClick={onMarkRead}
          disabled={!unread}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Marcar como lida
        </button>
      </div>
    </div>
  )
}
