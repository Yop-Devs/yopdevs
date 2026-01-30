'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return <span className="p-2 bg-pink-50 text-pink-600 rounded-lg border-2 border-pink-200">❤</span>
      case 'CHAT': return <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border-2 border-indigo-200">✉</span>
      case 'NEWS': return <span className="p-2 bg-amber-50 text-amber-600 rounded-lg border-2 border-amber-200">⚡</span>
      case 'INTEREST': return <span className="p-2 bg-green-50 text-green-600 rounded-lg border-2 border-green-200">★</span>
      default: return <span className="p-2 bg-slate-50 text-slate-600 rounded-lg border-2 border-slate-200">⚙</span>
    }
  }

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setNotifications(data || [])
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
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
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => markAsRead(n.id)}
            className="w-full text-left bg-white border-2 border-slate-900 p-5 rounded-2xl flex items-center gap-6 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group cursor-pointer"
          >
            <div className="shrink-0">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{n.content}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase italic">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div className={`w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-indigo-600 animate-pulse'}`} title={n.is_read ? '' : 'Clique para marcar como lida'}></div>
          </button>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-24 border-4 border-dotted border-slate-100 rounded-[2rem]">
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Nenhum_Registro_Encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}