'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChatRoomPage() {
  const { id: receiver_id } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiver, setReceiver] = useState<any>(null)
  const [me, setMe] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState<boolean | null>(null)
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

    const { data: friends } = await supabase
      .from('friend_requests')
      .select('from_id, to_id')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .eq('status', 'accepted')
    const friendIds = new Set((friends || []).map((f) => (f.from_id === user.id ? f.to_id : f.from_id)))
    setIsFriend(friendIds.has(receiver_id as string))

    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    const channel = supabase.channel(`chat_${receiver_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        if ((p.new.sender_id === user.id && p.new.receiver_id === receiver_id) || (p.new.sender_id === receiver_id && p.new.receiver_id === user.id)) {
          setMessages((prev) => (prev.some((m) => m.id === p.new.id) ? prev : [...prev, p.new]))
        }
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  useEffect(() => { init() }, [receiver_id])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e: any) => {
    e.preventDefault()
    if (!newMessage.trim() || !me || receiver_id === me) return
    if (!isFriend) return
    const content = newMessage.trim()
    setNewMessage('')
    const { data: inserted } = await supabase.from('messages').insert([{ sender_id: me, receiver_id, content }]).select('*').single()
    if (inserted) setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]))
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-[1000px] mx-auto py-6">
      <header className="bg-white border border-slate-200 p-6 rounded-t-3xl flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center font-black">
          {receiver?.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" /> : receiver?.full_name?.[0]}
        </div>
        <div>
          <h2 className="text-sm font-black uppercase italic tracking-tight text-slate-900">{receiver?.full_name || 'Protocolando...'}</h2>
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mt-1 italic">● Conexão Criptografada</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white border-x border-slate-200 p-8 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-5 border-2 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
              m.sender_id === me ? 'bg-[#4c1d95] border-[#4c1d95] text-white rounded-br-none' : 'bg-slate-50 border-slate-200 text-slate-800 rounded-bl-none'
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

      {isFriend === false && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-b-3xl text-center">
          <p className="text-sm font-bold text-amber-800">Só é possível enviar mensagens para amigos.</p>
          <p className="text-xs text-amber-700 mt-1">Adicione <span className="font-black">{receiver?.full_name || 'esta pessoa'}</span> em <Link href="/dashboard/membros" className="text-violet-600 underline font-black">Membros</Link> e aguarde a aceitação.</p>
        </div>
      )}
      <form onSubmit={send} className="bg-white border border-slate-200 p-4 rounded-b-3xl flex gap-3 shadow-lg">
        <input
          className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300 disabled:opacity-60"
          placeholder="Escreva sua mensagem..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          disabled={!isFriend}
        />
        <button type="submit" disabled={!isFriend} className="bg-[#4c1d95] text-white px-10 rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
          ENVIAR
        </button>
      </form>
    </div>
  )
}