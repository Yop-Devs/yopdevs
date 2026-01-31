'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ChatListPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca usuários únicos com quem houve troca de mensagens
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    const contactIds = Array.from(new Set(data?.map(m => 
      m.sender_id === user.id ? m.receiver_id : m.sender_id
    ))).filter((id) => id !== user.id)

    if (contactIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', contactIds)
      setContacts(profiles || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadContacts() }, [])

  if (loading) return <div className="p-10 font-mono text-[10px] text-slate-400 uppercase text-center">Iniciando_Protocolo_de_Comunicação...</div>

  return (
    <div className="max-w-[1000px] mx-auto py-6 sm:py-12 px-4 sm:px-6 space-y-6 sm:space-y-10">
      <header className="border-b border-slate-200 pb-4 sm:pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Comunicações</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1 sm:mt-2">Canais diretos com parceiros e desenvolvedores</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {contacts.map((contact) => (
          <Link href={`/dashboard/chat/${contact.id}`} key={contact.id}>
            <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl sm:rounded-2xl flex items-center justify-between gap-3 hover:shadow-md hover:border-violet-200 transition-all group">
              <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center font-black text-slate-300 shrink-0">
                  {contact.avatar_url ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" /> : contact.full_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-tight truncate">{contact.full_name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{contact.role || 'Membro da Rede'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-1 rounded border border-green-100">Online</span>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-violet-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>
        ))}

        {contacts.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Nenhum_Canal_Ativo</p>
            <Link href="/dashboard/projetos" className="text-[#4c1d95] text-[10px] font-bold uppercase underline mt-4 block">Explorar Marketplace para Iniciar Contatos</Link>
          </div>
        )}
      </div>
    </div>
  )
}