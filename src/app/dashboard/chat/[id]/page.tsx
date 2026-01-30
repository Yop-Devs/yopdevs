'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function ChatRoomPage() {
  const { id: receiver_id } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiver, setReceiver] = useState<any>(null)
  const [me, setMe] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMe(user.id)
    if (receiver_id === user.id) {
      router.replace('/dashboard/chat')
      return
    }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', receiver_id).single()
    setReceiver(prof)

    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    const channel = supabase.channel(`chat_${receiver_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        if ((p.new.sender_id === user.id && p.new.receiver_id === receiver_id) || (p.new.sender_id === receiver_id && p.new.receiver_id === user.id)) {
          setMessages(prev => [...prev, p.new])
        }
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  useEffect(() => { init() }, [receiver_id])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e: any) => {
    e.preventDefault()
    if (!newMessage.trim() || !me || receiver_id === me) return
    await supabase.from('messages').insert([{ sender_id: me, receiver_id, content: newMessage }])
    setNewMessage('')
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-[1000px] mx-auto py-6">
      <header className="bg-white border-2 border-slate-900 p-6 rounded-t-3xl flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 border-2 border-slate-900 rounded-xl overflow-hidden flex items-center justify-center font-black">
          {receiver?.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" /> : receiver?.full_name?.[0]}
        </div>
        <div>
          <h2 className="text-sm font-black uppercase italic tracking-tight text-slate-900">{receiver?.full_name || 'Protocolando...'}</h2>
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mt-1 italic">● Conexão Criptografada</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white border-x-2 border-slate-900 p-8 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-5 border-2 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
              m.sender_id === me ? 'bg-slate-900 border-slate-900 text-white rounded-br-none' : 'bg-slate-50 border-slate-200 text-slate-800 rounded-bl-none'
            }`}>
              {m.content}
              <p className="text-[7px] font-black uppercase mt-3 opacity-40 italic tracking-widest text-right">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={send} className="bg-white border-2 border-slate-900 p-4 rounded-b-3xl flex gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <input 
          className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300" 
          placeholder="Transmitir mensagem técnica..." 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
        />
        <button className="bg-slate-900 text-white px-10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">
          ENVIAR
        </button>
      </form>
    </div>
  )
}