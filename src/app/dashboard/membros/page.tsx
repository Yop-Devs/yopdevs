'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Tab = 'conexoes' | 'convites' | 'explorar'

const AREA_OPTIONS = [
  { value: '', label: 'Todas as áreas' },
  { value: 'Dev', label: 'Dev' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Investidor', label: 'Investidor' },
  { value: 'Produto', label: 'Produto' },
  { value: 'Outros', label: 'Outros' },
] as const

const LOOKING_FOR_LABELS: Record<string, string> = {
  ENTRAR_PROJETO: 'Quero entrar em um projeto',
  CRIANDO_PRECISO_TIME: 'Criando algo, preciso de time',
  NETWORKING: 'Busco networking',
  EXPLORANDO: 'Apenas explorando',
}

function matchArea(area: string, title: string, specialties: string, bio: string): boolean {
  const text = `${(title || '')} ${(specialties || '')} ${(bio || '')}`.toLowerCase()
  const terms: Record<string, string[]> = {
    Dev: ['dev', 'desenvolvedor', 'developer', 'frontend', 'backend', 'full stack', 'react', 'node', 'python', 'javascript', 'engenheiro de software'],
    Design: ['design', 'ui', 'ux', 'figma', 'interface', 'designer'],
    Marketing: ['marketing', 'growth', 'growth hacker', 'mídia', 'comunicação'],
    Investidor: ['investidor', 'investimento', 'venture', 'angel', 'capital'],
    Produto: ['produto', 'product', 'pm', 'product manager'],
    Outros: [],
  }
  const keywords = terms[area as keyof typeof terms]
  if (!keywords || keywords.length === 0) return true
  return keywords.some((k) => text.includes(k))
}

export default function ConexoesPage() {
  const [tab, setTab] = useState<Tab>('conexoes')
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [techFilter, setTechFilter] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState<Record<string, boolean>>({})
  const [acceptFeedback, setAcceptFeedback] = useState(false)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setMyId(user.id)

    const { data: reqData, error: reqErr } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_id', user.id)
      .eq('status', 'pending')
    const reqList = reqErr ? [] : (reqData || [])
    if (reqList.length > 0) {
      const fromIds = reqList.map((r) => r.from_id)
      const { data: fromProfs } = await supabase.from('profiles').select('id, full_name, avatar_url, role, title').in('id', fromIds)
      const byId = (fromProfs || []).reduce((acc: Record<string, any>, p) => { acc[p.id] = p; return acc }, {})
      setRequests(reqList.map((r) => ({ ...r, from: byId[r.from_id] })))
    } else {
      setRequests([])
    }

    const { data: frData, error: frErr } = await supabase
      .from('friend_requests')
      .select('from_id, to_id')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .eq('status', 'accepted')
    const friendIds = frErr ? [] : (frData || []).map((f) => (f.from_id === user.id ? f.to_id : f.from_id))
    if (friendIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, bio, specialties, role, last_seen, title, looking_for, availability_badge').in('id', friendIds).order('full_name')
      setFriends(profs || [])
    } else {
      setFriends([])
    }

    const { data: users } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
    setAllUsers(users || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const acceptRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    setAcceptFeedback(true)
    setTimeout(() => setAcceptFeedback(false), 4000)
    loadData()
  }

  const rejectRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    setRequests((prev) => prev.filter((r) => r.id !== requestId))
  }

  const sendFriendRequest = async (toId: string) => {
    if (!myId || toId === myId) return
    const { error } = await supabase.from('friend_requests').insert({ from_id: myId, to_id: toId, status: 'pending' })
    if (!error) setRequestSent((prev) => ({ ...prev, [toId]: true }))
  }

  const removeFriend = async (friendId: string) => {
    if (!myId || friendId === myId) return
    await supabase.from('friend_requests')
      .delete()
      .or(`and(from_id.eq.${myId},to_id.eq.${friendId}),and(from_id.eq.${friendId},to_id.eq.${myId})`)
    loadData()
  }

  const filteredUsers = allUsers.filter((m) => {
    if (m.role === 'BANNED' || m.id === myId) return false
    const searchMatch = !filter ||
      m.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
      m.specialties?.toLowerCase().includes(filter.toLowerCase()) ||
      m.title?.toLowerCase().includes(filter.toLowerCase())
    if (!searchMatch) return false
    if (areaFilter && areaFilter !== 'Outros' && !matchArea(areaFilter, m.title || '', m.specialties || '', m.bio || '')) return false
    if (areaFilter === 'Outros') {
      const hasOther = !matchArea('Dev', m.title || '', m.specialties || '', m.bio || '') &&
        !matchArea('Design', m.title || '', m.specialties || '', m.bio || '') &&
        !matchArea('Marketing', m.title || '', m.specialties || '', m.bio || '') &&
        !matchArea('Investidor', m.title || '', m.specialties || '', m.bio || '') &&
        !matchArea('Produto', m.title || '', m.specialties || '', m.bio || '')
      if (!hasOther) return false
    }
    if (techFilter) {
      const tech = techFilter.toLowerCase()
      const specs = (m.specialties || '').toLowerCase().split(',').map((s: string) => s.trim())
      if (!specs.some((s) => s.includes(tech))) return false
    }
    if (availableOnly) {
      const badge = m.availability_badge
      if (!badge || !['AVAILABLE', 'SEEKING_PARTNER', 'OPEN_OPPORTUNITIES'].includes(badge)) return false
    }
    return true
  })

  const isFriend = (id: string) => friends.some((f) => f.id === id)
  const isOnline = (lastSeen: string | null | undefined): boolean => {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
  }
  const isMe = (id: string): boolean => !!myId && id === myId
  const isAvailableForCollab = (badge: string | null | undefined) =>
    badge && ['AVAILABLE', 'SEEKING_PARTNER', 'OPEN_OPPORTUNITIES'].includes(badge)

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Carregando sua rede...</p>
      </div>
    )
  }

  const tabButtons: { key: Tab; label: string }[] = [
    { key: 'conexoes', label: 'Conexões' },
    { key: 'convites', label: 'Convites' },
    { key: 'explorar', label: 'Explorar Pessoas' },
  ]

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <header className="border-b-2 border-slate-200 pb-6">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800">Conexões</h1>
        <p className="text-slate-500 font-medium text-sm mt-2">
          Conecte-se com devs, empreendedores e criadores.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          {tabButtons.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key
                  ? 'bg-[#4c1d95] text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {acceptFeedback && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm font-medium">
          Agora vocês fazem parte da mesma rede.
        </div>
      )}

      {tab === 'conexoes' && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-700 font-bold text-lg mb-2">Nenhuma conexão ainda</p>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Use &quot;Explorar Pessoas&quot; para encontrar alguém ou aceite convites em &quot;Convites&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {friends.map((member) => (
                <UserCard
                  key={member.id}
                  member={member}
                  myId={myId}
                  isMe={false}
                  isFriend={true}
                  isOnline={isOnline(member.last_seen)}
                  requestSent={false}
                  onAdd={() => {}}
                  onRemoveFriend={() => removeFriend(member.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'convites' && (
        <>
          {requests.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-700 font-bold text-lg mb-2">Nenhum convite pendente</p>
              <p className="text-slate-500 text-sm">Quando alguém quiser se conectar, aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <Link href={`/dashboard/perfil/${r.from_id}`} className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                      {r.from?.avatar_url ? <img src={r.from.avatar_url} className="w-full h-full object-cover" alt="" /> : r.from?.full_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.from?.full_name || 'Alguém'}</p>
                      {r.from?.title && <p className="text-sm text-slate-600 truncate">{r.from.title}</p>}
                    </div>
                  </Link>
                  <div className="flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => acceptRequest(r.id)}
                      className="px-5 py-2.5 rounded-xl bg-[#4c1d95] text-white text-sm font-bold hover:bg-violet-800 transition-all"
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectRequest(r.id)}
                      className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-bold hover:border-slate-300 transition-all"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'explorar' && (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <input
              type="text"
              placeholder="Nome ou tecnologias..."
              className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] w-full sm:w-64"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#4c1d95] w-full sm:w-40"
            >
              {AREA_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Tech (ex: React, Node)"
              className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#4c1d95] w-full sm:w-40"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
            />
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#4c1d95] focus:ring-[#4c1d95]"
              />
              <span className="text-sm font-medium text-slate-700">Disponível para projetos</span>
            </label>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-700 font-bold text-lg mb-2">Nenhuma pessoa encontrada com esses filtros.</p>
              <p className="text-slate-500 text-sm">Tente ajustar a busca ou explore a comunidade 🚀</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((member) => (
                <UserCard
                  key={member.id}
                  member={member}
                  myId={myId}
                  isMe={isMe(member.id)}
                  isFriend={isFriend(member.id)}
                  isOnline={isOnline(member.last_seen)}
                  requestSent={!!requestSent[member.id]}
                  onAdd={() => sendFriendRequest(member.id)}
                  onRemoveFriend={undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function UserCard({
  member,
  myId,
  isMe,
  isFriend,
  isOnline,
  requestSent,
  onAdd,
  onRemoveFriend,
}: {
  member: any
  myId: string | null
  isMe: boolean
  isFriend: boolean
  isOnline?: boolean
  requestSent: boolean
  onAdd: () => void
  onRemoveFriend?: () => void
}) {
  const lookingForLabel = member.looking_for ? LOOKING_FOR_LABELS[member.looking_for] : null
  const available = member.availability_badge && ['AVAILABLE', 'SEEKING_PARTNER', 'OPEN_OPPORTUNITIES'].includes(member.availability_badge)
  const specs = (member.specialties || '').split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 5)

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 hover:border-violet-200 hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-lg font-bold text-slate-400 shrink-0">
            {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" /> : member.full_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 truncate">{member.full_name || 'Membro'}</p>
            {member.title && <p className="text-xs text-slate-600 truncate">{member.title}</p>}
          </div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {available && (
        <span className="inline-flex items-center gap-1 w-fit text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg mb-3">
          ✓ Disponível para colaborar
        </span>
      )}

      {lookingForLabel && (
        <p className="text-xs text-violet-700 font-medium mb-2 px-2 py-1 rounded-lg bg-violet-50">Buscando: {lookingForLabel}</p>
      )}

      {specs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {specs.map((s) => (
            <span key={s} className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
        <Link
          href={`/dashboard/perfil/${member.id}`}
          className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold text-center hover:bg-slate-50 transition-all"
        >
          Ver perfil
        </Link>
        {isMe ? (
          <span className="py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold text-center">Você</span>
        ) : isFriend ? (
          <Link
            href={`/dashboard/chat/${member.id}`}
            className="flex-1 py-2.5 rounded-xl bg-[#4c1d95] text-white text-sm font-bold text-center hover:bg-violet-800 transition-all"
          >
            Mensagem
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={requestSent}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              requestSent
                ? 'bg-green-100 text-green-700 border-2 border-green-200 cursor-default'
                : 'bg-[#4c1d95] text-white hover:bg-violet-800'
            }`}
          >
            {requestSent ? 'Convite enviado 🚀' : 'Conectar'}
          </button>
        )}
      </div>
      {isFriend && onRemoveFriend && (
        <button
          type="button"
          onClick={onRemoveFriend}
          className="mt-2 py-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          Remover conexão
        </button>
      )}
    </div>
  )
}
