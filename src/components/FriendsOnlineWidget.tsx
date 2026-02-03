'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ONLINE_MS = 3 * 60 * 1000 // 3 min

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_MS
}

export default function FriendsOnlineWidget() {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<{ id: string; full_name: string | null; avatar_url: string | null; last_seen: string | null }[]>([])
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      setMyId(user.id)

      const { data: frData } = await supabase
        .from('friend_requests')
        .select('from_id, to_id')
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .eq('status', 'accepted')
      const friendIds = (frData || []).map((f) => (f.from_id === user.id ? f.to_id : f.from_id))
      if (friendIds.length === 0) {
        setFriends([])
        return
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, last_seen')
        .in('id', friendIds)
      if (mounted) setFriends(profs || [])
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const online = friends.filter((f) => isOnline(f.last_seen))
  const count = online.length

  if (friends.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#4c1d95] px-4 py-3 text-white shadow-lg hover:bg-violet-800 transition-all"
        aria-label="Amigos online"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        <span className="text-xs font-bold uppercase hidden sm:inline">
          {count} online
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <h3 className="text-xs font-black uppercase text-slate-700">Amigos online ({count})</h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {online.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">Nenhum amigo online no momento.</p>
              ) : (
                <ul className="space-y-1">
                  {online.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/dashboard/perfil/${f.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-black text-slate-400">
                              {f.full_name?.[0] || '?'}
                            </span>
                          )}
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                        </div>
                        <span className="flex-1 truncate text-sm font-bold text-slate-800">{f.full_name || 'Usuário'}</span>
                        <Link
                          href={`/dashboard/chat/${f.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-200"
                        >
                          Chat
                        </Link>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
