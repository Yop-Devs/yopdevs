'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ConfirmModal from '@/components/ConfirmModal'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('')

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteError(null)
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', myId!)
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
    } else {
      setDeleteError('Não foi possível apagar. Rode no Supabase a política "Users can delete own notifications".')
    }
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('notifications').delete().in('id', Array.from(selectedIds)).eq('user_id', myId!)
    if (!error) {
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)))
      setSelectedIds(new Set())
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
    } else {
      setDeleteError('Não foi possível apagar. Rode no Supabase a política "Users can delete own notifications".')
    }
    setDeleting(false)
  }

  const requestDeleteAll = () => {
    if (!myId || notifications.length === 0) return
    setConfirmDeleteAllOpen(true)
  }

  const executeDeleteAll = async () => {
    if (!myId) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('notifications').delete().eq('user_id', myId)
    setConfirmDeleteAllOpen(false)
    if (!error) {
      setNotifications([])
      setSelectedIds(new Set())
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated'))
    } else {
      setDeleteError('Não foi possível apagar. Rode no Supabase a política "Users can delete own notifications".')
    }
    setDeleting(false)
  }

  const handleNotificationClick = (n: { id: string; link?: string | null; type?: string }) => {
    markAsRead(n.id)
    if (n.link) router.push(n.link)
  }

  const getSenderId = (n: { type?: string; content?: string; from_user_id?: string | null; link?: string | null; metadata?: { sender_id?: string; from_user_id?: string } }) => {
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
    if (isMsg && senderId && senderNames[senderId]) return `Você recebeu uma nova mensagem de ${senderNames[senderId]}`
    if (n.type === 'FRIEND_REQUEST' && senderId && senderNames[senderId]) return `${senderNames[senderId]} enviou uma solicitação de amizade`
    if (n.type === 'FRIEND_ACCEPTED' && senderId && senderNames[senderId]) return `${senderNames[senderId]} aceitou sua solicitação de amizade`
    if (n.type === 'LIKE' && senderId && senderNames[senderId]) return `${senderNames[senderId]} curtiu sua postagem`
    if (n.type === 'COMMENT_LIKE' && senderId && senderNames[senderId]) return `${senderNames[senderId]} curtiu sua resposta no fórum`
    if (n.type === 'FORUM_REPLY' && senderId && senderNames[senderId]) return `${senderNames[senderId]} respondeu na sua postagem do fórum`
    return n.content || 'Nova notificação'
  }

  const sendFriendRequest = async (fromUserId: string) => {
    if (!myId || fromUserId === myId) return
    const { error } = await supabase.from('friend_requests').insert({ from_id: myId, to_id: fromUserId, status: 'pending' })
    if (!error) setNotifications((prev) => prev.map((n) => (n.from_user_id === fromUserId ? { ...n, _friendRequestSent: true } : n)))
  }

  const filteredNotifications = filterType
    ? notifications.filter((n) => (n.type === filterType) || (filterType === 'LIKE' && (n.type === 'COMMENT_LIKE' || n.type === 'LIKE')))
    : notifications

  useEffect(() => { loadNotifications() }, [])

  if (loading) return <div className="p-10 font-mono text-[10px] text-slate-400 uppercase text-center tracking-[0.4em]">Acessando_Logs_do_Kernel...</div>

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-6 space-y-10">
      <header className="border-b border-slate-200 pb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">NOTIFICAÇÕES</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Monitoramento de interações na rede YOP Devs</p>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="mt-3 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-[#4c1d95]">
            <option value="">Todas</option>
            <option value="CHAT">Mensagem</option>
            <option value="LIKE">Curtida</option>
            <option value="FORUM_REPLY">Comentário</option>
            <option value="INTEREST">Interesse no projeto</option>
            <option value="FRIEND_REQUEST">Solicitação de amizade</option>
            <option value="FRIEND_ACCEPTED">Amizade aceita</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleSelectAll} className="px-4 py-2 border-2 border-slate-200 rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">
            {selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0 ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
          <button type="button" onClick={deleteSelected} disabled={selectedIds.size === 0 || deleting} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Apagar selecionadas {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
          <button type="button" onClick={requestDeleteAll} disabled={notifications.length === 0 || deleting} className="px-4 py-2 bg-red-100 text-red-700 border-2 border-red-200 rounded-xl text-[9px] font-black uppercase hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Apagar todas
          </button>
        </div>
      </header>

      {deleteError && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-bold mb-4">
          {deleteError}
        </div>
      )}
      <div className="space-y-4">
        {filteredNotifications.map((n) => {
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
              className="w-full text-left bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center gap-6 hover:shadow-md hover:border-violet-200 transition-all group cursor-pointer"
            >
              <div className="flex shrink-0 items-center">
                <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              </div>
              <button type="button" onClick={(e) => deleteOne(n.id, e)} className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Apagar esta notificação">✕</button>
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
              {(n.type === 'LIKE' || n.type === 'COMMENT_LIKE' || n.type === 'FORUM_REPLY') && n.link && (
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

        {filteredNotifications.length === 0 && (
          <div className="text-center py-24 border-4 border-dotted border-slate-100 rounded-[2rem]">
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">{filterType ? 'Nenhuma notificação deste tipo.' : 'Nenhum_Registro_Encontrado'}</p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteAllOpen}
        onClose={() => setConfirmDeleteAllOpen(false)}
        title="Apagar todas as notificações"
        message="Esta ação não pode ser desfeita. Todas as notificações serão removidas da sua rede."
        confirmLabel="Apagar todas"
        cancelLabel="Cancelar"
        onConfirm={executeDeleteAll}
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}