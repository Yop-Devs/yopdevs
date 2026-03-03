'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CONTENT_BUCKET = 'content-images'
const MAX_IMAGES = 3

export default function NovoPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Geral' })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const LIMITE_POSTS_POR_DIA = 5

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => f.type.startsWith('image/'))
    const total = [...imageFiles, ...valid].slice(0, MAX_IMAGES)
    setImageFiles(total)
    setImagePreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u))
      return total.map((f) => URL.createObjectURL(f))
    })
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (userId: string): Promise<string[]> => {
    if (imageFiles.length === 0) return []
    setUploadingImages(true)
    const urls: string[] = []
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `posts/${userId}/${Date.now()}_${i}.${ext}`
        const { error } = await supabase.storage.from(CONTENT_BUCKET).upload(path, file, { upsert: false })
        if (error) throw error
        const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      return urls
    } finally {
      setUploadingImages(false)
    }
  }

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

    let imageUrls: string[] = []
    try {
      imageUrls = await uploadImages(user.id)
    } catch (err: any) {
      setStatus({ type: 'error', text: `FALHA NO UPLOAD DE IMAGENS: ${err.message?.toUpperCase() || 'VERIFIQUE O BUCKET content-images.'}` })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('posts').insert([{ ...formData, author_id: user.id, image_urls: imageUrls }])
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
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Imagens (até 3)</label>
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remover">×</button>
              </div>
            ))}
            {imageFiles.length < MAX_IMAGES && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                <span className="text-2xl text-slate-400">+</span>
              </label>
            )}
          </div>
        </div>
        <button type="submit" disabled={saving || uploadingImages} className="w-full py-4 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-lg disabled:opacity-60">
          {uploadingImages ? 'ENVIANDO IMAGENS...' : saving ? 'TRANSMITINDO...' : 'PUBLICAR DISCUSSÃO'}
        </button>
      </form>
    </div>
  )
}