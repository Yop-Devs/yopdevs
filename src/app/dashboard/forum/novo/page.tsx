'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovoPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Geral' })

  const LIMITE_POSTS_POR_DIA = 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const inicioDoDia = hoje.toISOString()

    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .gte('created_at', inicioDoDia)

    if ((count ?? 0) >= LIMITE_POSTS_POR_DIA) {
      setStatus({ type: 'error', text: `LIMITE DIÁRIO ATINGIDO: VOCÊ JÁ PUBLICOU ${LIMITE_POSTS_POR_DIA} TÓPICOS HOJE. TENTE AMANHÃ.` })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('posts').insert([{ ...formData, author_id: user.id }])
    if (error) {
      setStatus({ type: 'error', text: `ERRO DE PUBLICAÇÃO: ${error.message.toUpperCase()}` })
      setSaving(false)
    } else {
      setStatus({ type: 'success', text: 'TÓPICO CRIADO COM SUCESSO.' })
      setTimeout(() => router.push('/dashboard/forum'), 1500)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-slate-900">Nova Discussão</h1>
      <form onSubmit={handleSubmit} className="bg-white p-10 border border-slate-200 rounded-2xl space-y-8 shadow-lg">
        {status && (
          <div className={`p-4 border-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
            status.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {status.text}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Assunto do Tópico</label>
          <input required className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Conteúdo</label>
          <textarea required rows={8} className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none resize-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
        </div>
        <button type="submit" disabled={saving} className="w-full py-4 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-lg">
          {saving ? 'TRANSMITINDO...' : 'PUBLICAR DISCUSSÃO'}
        </button>
      </form>
    </div>
  )
}