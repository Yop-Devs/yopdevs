'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'CHAT': return 'Mensagem'
      case 'LIKE': case 'COMMENT_LIKE': return 'Curtida'
      case 'FORUM_REPLY': return 'Comentário'
      case 'INTEREST': return 'Interesse no projeto'
      case 'FRIEND_REQUEST': return 'Solicitação de amizade'
      case 'FRIEND_ACCEPTED': return 'Amizade aceita'
      case 'NEWS': return 'Novidade'
      default: return 'Notificação'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return <span className="p-2 bg-pink-50 text-pink-600 rounded-lg border-2 border-pink-200">❤</span>
      case 'CHAT': return <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border-2 border-indigo-200">✉</span>
      case 'NEWS': return <span className="p-2 bg-amber-50 text-amber-600 rounded-lg border-2 border-amber-200">⚡</span>
      case 'INTEREST': return <span className="p-2 bg-green-50 text-green-600 rounded-lg border-2 border-green-200">★</span>
      case 'FRIEND_REQUEST': return <span className="p-2 bg-violet-50 text-violet-600 rounded-lg border-2 border-violet-200">👋</span>
      case 'FRIEND_ACCEPTED': return <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border-2 border-emerald-200">✓</span>
      case 'COMMENT_LIKE': return <span className="p-2 bg-pink-50 text-pink-600 rounded-lg border-2 border-pink-200">❤</span>
      case 'FORUM_REPLY': return <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border-2 border-blue-200">💬</span>
      default: return <span className="p-2 bg-slate-50 text-slate-600 rounded-lg border-2 border-slate-200">⚙</span>
    }
  }

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
      if (n.from_user_id && n.from_user_id !== user.id) idsToFetch.add(n.from_user_id)
      if (n.metadata?.sender_id && n.metadata.sender_id !== user.id) idsToFetch.add(n.metadata.sender_id)
      if (n.metadata?.from_user_id && n.metadata.from_user_id !== user.id) idsToFetch.add(n.metadata.from_user_id)
      if ((n.type === 'CHAT' || /mensagem|message/i.test(n.content || '')) && n.link) {
        const match = n.link.match(/\/dashboard\/chat\/([a-f0-9-]+)/i)
        if (match?.[1]) idsToFetch.add(match[1])
      }
      if (n.type === 'CHAT' && !n.from_user_id && !n.link && n.metadata?.sender_id) idsToFetch.add(n.metadata.sender_id)
    })

    if (idsToFetch.size > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(idsToFetch))
      const names: Record<string, string> = {}
      ;(profs || []).forEach((p) => { names[p.id] = p.full_name || 'Usuário' })
      setSenderNames(names)
    }

    const { data: frData } = await supabase.from('friend_requests').select('from_id, to_id').or(`from_id.eq.${user.id},to_id.eq.${user.id}`).eq('status', 'accepted')
    const fIds = new Set<string>()
    ;(frData || []).forEach((f) => fIds.add(f.from_id === user.id ? f.to_id : f.from_id))
    setFriendIds(fIds)
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
  }

  const handleNotificationClick = (n: { id: string; link?: string | null; type?: string }) => {
    markAsRead(n.id)
    if (n.link) router.push(n.link)
  }

  const getSenderId = (n: { type?: string; from_user_id?: string | null; link?: string | null; metadata?: { sender_id?: string; from_user_id?: string } }) => {
    if (n.from_user_id) return n.from_user_id
    if (n.metadata?.sender_id) return n.metadata.sender_id
    if (n.metadata?.from_user_id) return n.metadata.from_user_id
    if ((n.type === 'CHAT' || /mensagem|message/i.test(n.content || '')) && n.link) {
      const m = n.link.match(/\/dashboard\/chat\/([a-f0-9-]+)/i)
      return m?.[1] ?? null
    }
    return null
  }

  const getDisplayContent = (n: { type?: string; content?: string }, senderId: string | null) => {
    const isMsg = n.type === 'CHAT' || /mensagem|message/i.test(n.content || '')
    if (isMsg && senderId && senderNames[senderId]) return `${senderNames[senderId]} enviou uma mensagem`
    if (n.type === 'FRIEND_REQUEST' && senderId && senderNames[senderId]) return `${senderNames[senderId]} enviou uma solicitação de amizade`
    if (n.type === 'FRIEND_ACCEPTED' && senderId && senderNames[senderId]) return `${senderNames[senderId]} aceitou sua solicitação de amizade`
    if (n.type === 'COMMENT_LIKE' && senderId && senderNames[senderId]) return `${senderNames[senderId]} curtiu sua resposta no fórum`
    if (n.type === 'FORUM_REPLY' && senderId && senderNames[senderId]) return `${senderNames[senderId]} respondeu no seu tópico do fórum`
    return n.content || 'Nova notificação'
  }

  const sendFriendRequest = async (fromUserId: string) => {
    if (!myId || fromUserId === myId) return
    const { error } = await supabase.from('friend_requests').insert({ from_id: myId, to_id: fromUserId, status: 'pending' })
    if (!error) setNotifications((prev) => prev.map((n) => (n.from_user_id === fromUserId ? { ...n, _friendRequestSent: true } : n)))
  }

  useEffect(() => { loadNotifications() }, [])

  if (loading) return <div className="p-10 font-mono text-[10px] text-slate-400 uppercase text-center tracking-[0.4em]">Acessando_Logs_do_Kernel...</div>

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-6 space-y-10">
      <header className="border-b-2 border-slate-900 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">NOTIFICAÇÕES</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Monitoramento de interações na rede YOP</p>
        </div>
      </header>

      <div className="space-y-4">
        {notifications.map((n) => {
          const senderId = getSenderId(n)
          const isFriend = senderId ? friendIds.has(senderId) : false
          const displayContent = getDisplayContent(n, senderId)
          const isChat = n.type === 'CHAT' || /mensagem|message/i.test(n.content || '')
          const typeLabel = getTypeLabel(n.type)
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(n)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n); } }}
              className="w-full text-left bg-white border-2 border-slate-900 p-5 rounded-2xl flex flex-wrap items-center gap-6 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group cursor-pointer"
            >
              <div className="flex flex-1 min-w-0 items-center gap-6">
                <div className="shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-200 rounded px-2 py-0.5 bg-indigo-50">
                    {typeLabel}
                  </span>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight mt-2">{displayContent}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {senderId && (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border-2 uppercase ${isFriend ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-300 text-slate-500 bg-slate-50'}`}>
                        {isFriend ? 'Amigo' : 'Usuário'}
                      </span>
                    )}
                    <p className="text-[9px] text-slate-400 font-mono uppercase italic">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-indigo-600 animate-pulse'}`} title={n.is_read ? '' : 'Não lida'} />
              </div>
              {isChat && n.link && (
                <button type="button" onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }} className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 transition-all">
                  Ver mensagem
                </button>
              )}
              {!isChat && (n.type === 'FRIEND_REQUEST' || n.type === 'FRIEND_ACCEPTED') && n.link && (
                <button type="button" onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }} className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 transition-all">
                  Ver solicitações
                </button>
              )}
              {(n.type === 'COMMENT_LIKE' || n.type === 'FORUM_REPLY') && n.link && (
                <button type="button" onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }} className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 transition-all">
                  Ver fórum
                </button>
              )}
              {n.type === 'INTEREST' && n.from_user_id && n.from_user_id !== myId && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sendFriendRequest(n.from_user_id); }}
                  disabled={!!n._friendRequestSent}
                  className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {n._friendRequestSent ? 'Solicitação enviada' : 'Adicionar como amigo'}
                </button>
              )}
            </div>
          )
        })}

        {notifications.length === 0 && (
          <div className="text-center py-24 border-4 border-dotted border-slate-100 rounded-[2rem]">
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Nenhum_Registro_Encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}