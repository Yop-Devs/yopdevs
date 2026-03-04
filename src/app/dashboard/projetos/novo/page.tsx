'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CONTENT_BUCKET = 'content-images'
const MAX_IMAGES = 3

const OPPORTUNITY_TYPES = [
  { value: 'DEV', label: '👨‍💻 Preciso de desenvolvedor' },
  { value: 'SOCIO', label: '🤝 Procuro sócio' },
  { value: 'INVESTIDOR', label: '💰 Busco investidor' },
  { value: 'MENTOR', label: '🧠 Preciso de mentor' },
  { value: 'ENTRAR', label: '🚀 Quero entrar em um projeto' },
] as const

export default function NovaOportunidadePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: 'DEV' as (typeof OPPORTUNITY_TYPES)[number]['value'],
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const LIMITE_PROJETOS_POR_DIA = 5

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [})
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
        const path = `projects/${userId}/${Date.now()}_${i}.${ext}`
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
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', inicioDoDia)

    if ((count ?? 0) >= LIMITE_PROJETOS_POR_DIA) {
      setStatus({ type: 'error', text: 'Você já publicou o limite de oportunidades por hoje. Tente amanhã.' })
      setSaving(false)
      return
    }

    let imageUrls: string[] = []
    try {
      imageUrls = await uploadImages(user.id)
    } catch (err: any) {
      setStatus({ type: 'error', text: 'Não foi possível enviar as imagens. Tente de novo.' })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('projects').insert([
      {
        owner_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.projectType,
        tech_stack: '',
        equity_offered: 0,
        image_urls: imageUrls,
      },
    ])

    if (error) {
      setStatus({ type: 'error', text: error.message })
      setSaving(false)
      return
    }

    setStatus({ type: 'success', text: 'Oportunidade publicada! Redirecionando...' })
    setTimeout(() => router.push('/dashboard/projetos'), 1500)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800">Publicar oportunidade</h1>
        <p className="text-slate-500 text-sm mt-2">Conte o que você busca ou o que você oferece. Sem formalidade.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        {status && (
          <div
            className={`p-4 rounded-xl text-sm font-medium ${
              status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {status.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Título</label>
          <input
            required
            placeholder="Ex: Procuro dev para app de finanças pessoais"
            className="w-full p-4 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Descrição</label>
          <textarea
            required
            rows={5}
            placeholder="Explique sua ideia de forma simples. O que você quer construir? Quem você procura? Não precisa ser formal."
            className="w-full p-4 border-2 border-slate-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {OPPORTUNITY_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData({ ...formData, projectType: opt.value })}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all ${
                  formData.projectType === opt.value
                    ? 'bg-[#4c1d95] border-[#4c1d95] text-white'
                    : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">📷 Imagens (até 3)</label>
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover"
                >
                  ×
                </button>
              </div>
            ))}
            {imageFiles.length < MAX_IMAGES && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                <span className="text-xl text-slate-400">+</span>
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploadingImages}
          className="w-full py-4 bg-[#4c1d95] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-violet-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploadingImages ? 'Enviando imagens...' : saving ? 'Publicando...' : 'Publicar oportunidade'}
        </button>
      </form>
    </div>
  )
}
