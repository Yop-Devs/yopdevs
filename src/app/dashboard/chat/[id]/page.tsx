'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const CHAT_BUCKET = 'chat-images'
const MAX_IMAGE_BYTES = 400 * 1024 // ~400KB alvo após compressão (economia no Supabase)
const MAX_DIMENSION = 800 // largura/altura máx. em px

/** Redimensiona e comprime imagem para o chat (economiza Storage). */
async function resizeImageForChat(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) {
          h = Math.round((h * MAX_DIMENSION) / w)
          w = MAX_DIMENSION
        } else {
          w = Math.round((w * MAX_DIMENSION) / h)
          h = MAX_DIMENSION
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas não disponível'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      let q = 0.85
      const tryBlob = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir'))
              return
            }
            if (blob.size <= MAX_IMAGE_BYTES || q <= 0.45) {
              resolve(blob)
              return
            }
            q -= 0.15
            tryBlob()
          },
          'image/jpeg',
          Math.max(0.4, q)
        )
      }
      tryBlob()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagem inválida'))
    }
    img.src = url
  })
}

const EMOJIS = ['😀', '😊', '👍', '❤️', '🔥', '👋', '😂', '😍', '✨', '🎉', '💪', '🙏', '😎', '🤔', '✅', '❌', '💬', '📌', '🔗', '📷']

function linkify(text: string, isOwn: boolean) {
  if (!text?.trim()) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline break-all ${isOwn ? 'text-white/90 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}>
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function ChatRoomPage() {
  const { id: receiver_id } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiver, setReceiver] = useState<any>(null)
  const [me, setMe] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState<boolean | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const send = async (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault()
    if (!me || receiver_id === me) return
    if (!isFriend) return
    const content = newMessage.trim()
    if (!content && !imageUrl) return
    setNewMessage('')
    setUploadError(null)
    const payload: { sender_id: string; receiver_id: string; content: string; image_url?: string } = {
      sender_id: me,
      receiver_id: receiver_id as string,
      content: content || (imageUrl ? '' : '')
    }
    if (imageUrl) payload.image_url = imageUrl
    const { data: inserted } = await supabase.from('messages').insert([payload]).select('*').single()
    if (inserted) setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]))
  }

  const handleSubmit = (e: React.FormEvent) => send(e)

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !me || !receiver_id || !isFriend) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Envie apenas imagens (JPG, PNG, GIF, WebP).')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await resizeImageForChat(file)
      const path = `${me}/${receiver_id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage.from(CHAT_BUCKET).upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
    if (uploadErr) {
      setUploadError('Falha ao enviar imagem. Crie o bucket "chat-images" no Supabase Storage (público para leitura).')
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path)
    await send({ preventDefault: () => {} } as React.FormEvent, urlData.publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao processar imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-[1000px] mx-auto py-6">
      <header className="bg-white border border-slate-200 p-6 rounded-t-3xl flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center font-black">
          {receiver?.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt="" /> : receiver?.full_name?.[0]}
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
              {m.image_url && (
                <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2 rounded-lg overflow-hidden">
                  <img src={m.image_url} alt="Enviada no chat" className="max-w-full max-h-64 object-contain" />
                </a>
              )}
              {m.content ? <span className="break-words whitespace-pre-wrap">{linkify(m.content, m.sender_id === me)}</span> : null}
              <p className="text-[7px] font-black uppercase mt-3 opacity-40 italic tracking-widest text-right">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 mx-4 rounded-xl">
          {uploadError}
        </div>
      )}

      {isFriend === false && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-b-3xl text-center">
          <p className="text-sm font-bold text-amber-800">Só é possível enviar mensagens para amigos.</p>
          <p className="text-xs text-amber-700 mt-1">Adicione <span className="font-black">{receiver?.full_name || 'esta pessoa'}</span> em <Link href="/dashboard/membros" className="text-violet-600 underline font-black">Membros</Link> e aguarde a aceitação.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-4 rounded-b-3xl flex flex-col gap-2 shadow-lg">
        {emojiOpen && (
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
            {EMOJIS.map((emoji, i) => (
              <button key={i} type="button" onClick={() => addEmoji(emoji)} className="text-xl p-1 hover:bg-slate-200 rounded transition-colors">
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={!isFriend}
            className="p-2 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-all"
            title="Emojis"
          >
            😀
          </button>
          <input
            ref={inputRef}
            className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300 disabled:opacity-60"
            placeholder="Escreva sua mensagem, cole um link..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={!isFriend}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isFriend || uploading}
            className="p-2 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-all"
            title="Enviar imagem (redimensionada automaticamente)"
          >
            📷
          </button>
          <button type="submit" disabled={(!newMessage.trim() && !uploading) || !isFriend} className="bg-[#4c1d95] text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {uploading ? '...' : 'Enviar'}
          </button>
        </div>
        <p className="text-[9px] text-slate-400">Links viram clicáveis. Imagens: redimensionadas e comprimidas automaticamente para economizar espaço.</p>
      </form>
    </div>
  )
}
