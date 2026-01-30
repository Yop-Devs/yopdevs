'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Tab = 'amigos' | 'solicitacoes' | 'procurar'
type RoleFilter = '' | 'DEV' | 'BUSINESS'

export default function VerAmigosPage() {
  const [tab, setTab] = useState<Tab>('amigos')
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [myId, setMyId] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState<Record<string, boolean>>({})

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
      const { data: fromProfs } = await supabase.from('profiles').select('id, full_name, avatar_url, role').in('id', fromIds)
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
      const { data: profs } = await supabase.from('profiles').select('*').in('id', friendIds).order('full_name')
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

  const filteredUsers = allUsers.filter((m) => {
    const matchesSearch = !filter || m.full_name?.toLowerCase().includes(filter.toLowerCase()) || m.specialties?.toLowerCase().includes(filter.toLowerCase())
    const matchesRole = !roleFilter || m.role === roleFilter
    return matchesSearch && matchesRole && m.role !== 'BANNED' && m.id !== myId
  })

  const isFriend = (id: string) => friends.some((f) => f.id === id)
  const hasPendingFromMe = async (id: string) => {
    const { data } = await supabase.from('friend_requests').select('id').eq('from_id', myId).eq('to_id', id).eq('status', 'pending').maybeSingle()
    return !!data
  }
  const isMe = (id: string) => myId && id === myId

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.5em]">Carregando...</div>

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-12 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-slate-900 pb-10">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Ver Amigos</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3 italic">Amigos, solicitações e procurar usuários</p>
        </div>

        <div className="flex gap-2">
          {(['amigos', 'solicitacoes', 'procurar'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${tab === t ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900'}`}
            >
              {t === 'amigos' ? 'Amigos' : t === 'solicitacoes' ? 'Solicitações' : 'Procurar usuário'}
            </button>
          ))}
        </div>
      </header>

      {tab === 'amigos' && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-600 font-bold text-lg mb-2">Nenhum amigo ainda</p>
              <p className="text-slate-500 text-sm max-w-md mx-auto">Use a aba &quot;Procurar usuário&quot; para adicionar amigos ou aceite solicitações na aba &quot;Solicitações&quot;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {friends.map((member) => (
                <FriendCard key={member.id} member={member} myId={myId} isMe={!!myId && member.id === myId} isFriend={true} requestSent={false} onAdd={() => {}} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'solicitacoes' && (
        <>
          {requests.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-600 font-bold text-lg mb-2">Nenhuma solicitação pendente</p>
              <p className="text-slate-500 text-sm">Quando alguém te adicionar, aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="bg-white border-2 border-slate-900 p-6 rounded-2xl flex items-center gap-6 flex-wrap">
                  <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 rounded-xl overflow-hidden flex items-center justify-center font-black text-slate-400">
                    {r.from?.avatar_url ? <img src={r.from.avatar_url} className="w-full h-full object-cover" alt="" /> : r.from?.full_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 uppercase tracking-tight">{r.from?.full_name || 'Usuário'}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{r.from?.role || 'Membro'}</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => acceptRequest(r.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500">Aceitar</button>
                    <button type="button" onClick={() => rejectRequest(r.id)} className="px-4 py-2 border-2 border-slate-300 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:border-red-400 hover:text-red-600">Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'procurar' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setRoleFilter('')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${!roleFilter ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900'}`}>Todos</button>
              <button type="button" onClick={() => setRoleFilter('DEV')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${roleFilter === 'DEV' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900'}`}>Devs</button>
              <button type="button" onClick={() => setRoleFilter('BUSINESS')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${roleFilter === 'BUSINESS' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900'}`}>Empresários</button>
            </div>
            <input type="text" placeholder="Pesquisar por nome ou especialidade..." className="px-6 py-4 bg-white border-2 border-slate-900 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-100 transition-all w-full md:w-96" onChange={(e) => setFilter(e.target.value)} />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-600 font-bold text-lg mb-2">Nenhum usuário encontrado</p>
              <p className="text-slate-500 text-sm">Tente outro filtro ou termo de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredUsers.map((member) => (
                <FriendCard
                  key={member.id}
                  member={member}
                  myId={myId}
                  isMe={isMe(member.id)}
                  isFriend={isFriend(member.id)}
                  requestSent={!!requestSent[member.id]}
                  onAdd={() => sendFriendRequest(member.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FriendCard({
  member,
  myId,
  isMe,
  isFriend,
  requestSent,
  onAdd,
}: {
  member: any
  myId: string | null
  isMe: boolean
  isFriend: boolean
  requestSent: boolean
  onAdd: () => void
}) {
  return (
    <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-8 flex flex-col items-center text-center hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <span className={`text-[8px] font-black px-2 py-1 rounded border-2 uppercase ${member.availability_status === 'DISPONÍVEL' ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>{member.availability_status || 'ATIVO'}</span>
      </div>
      <div className="w-24 h-24 bg-slate-50 border-4 border-slate-900 rounded-3xl overflow-hidden mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform">
        {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-4xl font-black text-slate-200 flex items-center justify-center h-full uppercase">{member.full_name?.[0]}</span>}
      </div>
      <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 mb-1">{member.full_name}</h3>
      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-4">{member.role || 'MEMBRO'}</p>
      <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6 h-10 italic">{member.bio || 'Sem bio.'}</p>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {member.specialties?.split(',').slice(0, 3).map((spec: string) => (
          <span key={spec} className="text-[8px] font-black border-2 border-slate-900 px-2 py-0.5 rounded-lg uppercase tracking-tighter">{spec.trim()}</span>
        ))}
      </div>
      <div className="w-full grid grid-cols-2 gap-3">
        <Link href={`/dashboard/perfil/${member.id}`} className="py-3 border-2 border-slate-900 rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">Ver Portfólio</Link>
        {isMe ? (
          <span className="py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase text-center cursor-not-allowed">Você</span>
        ) : (
          <>
            <Link href={`/dashboard/chat/${member.id}`} className="py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 transition-all shadow-md text-center">Conectar</Link>
            {!isFriend && (
              <button type="button" onClick={onAdd} disabled={requestSent} className="py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed">
                {requestSent ? 'Enviado' : 'Adicionar amigo'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
