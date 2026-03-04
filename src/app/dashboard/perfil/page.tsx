'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AVAILABILITY_BADGES = [
  { value: '', label: 'Nenhum' },
  { value: 'AVAILABLE', label: '🚀 Disponível para projetos' },
  { value: 'SEEKING_PARTNER', label: '🤝 Buscando sócio' },
  { value: 'OPEN_OPPORTUNITIES', label: '💼 Aberto a oportunidades' },
] as const

const LOOKING_FOR_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'ENTRAR_PROJETO', label: 'Quero entrar em um projeto' },
  { value: 'CRIANDO_PRECISO_TIME', label: 'Estou criando algo e preciso de time' },
  { value: 'NETWORKING', label: 'Busco networking' },
  { value: 'EXPLORANDO', label: 'Apenas explorando' },
] as const

function parseSpecialties(s: string): string[] {
  return (s || '').split(',').map((t) => t.trim()).filter(Boolean)
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileRole, setProfileRole] = useState<string>('')
  const [formData, setFormData] = useState({
    full_name: '',
    title: '',
    availability_badge: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    avatar_url: '',
    location: '',
    specialties: '',
    looking_for: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfileRole(data.role || '')
          setFormData({
            full_name: data.full_name || '',
            title: data.title || '',
            availability_badge: data.availability_badge || '',
            bio: data.bio || '',
            github_url: data.github_url || '',
            linkedin_url: data.linkedin_url || '',
            website_url: data.website_url || '',
            avatar_url: data.avatar_url || '',
            location: data.location || '',
            specialties: data.specialties || '',
            looking_for: data.looking_for || '',
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      const { data: { user } } = await supabase.auth.getUser()
      if (!file || !user) return
      const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(fileName, file)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }))
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setStatus({ type: 'success', text: 'Foto atualizada.' })
      setTimeout(() => setStatus(null), 3000)
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message })
      setTimeout(() => setStatus(null), 4000)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        title: formData.title || null,
        availability_badge: formData.availability_badge || null,
        bio: formData.bio,
        github_url: formData.github_url || null,
        linkedin_url: formData.linkedin_url || null,
        website_url: formData.website_url || null,
        avatar_url: formData.avatar_url || null,
        location: formData.location || null,
        specialties: formData.specialties || null,
        looking_for: formData.looking_for || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setStatus({ type: 'error', text: error.message })
      setTimeout(() => setStatus(null), 4000)
    } else {
      setStatus({ type: 'success', text: 'Perfil atualizado com sucesso 🚀' })
      setTimeout(() => setStatus(null), 5000)
    }
  }

  const tags = parseSpecialties(formData.specialties)

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Carregando seu perfil...</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {status && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* COLUNA ESQUERDA: CARTÃO VISUAL / SOCIAL */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="relative group w-full aspect-square max-w-[240px] mx-auto">
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl font-black text-slate-300">{formData.full_name?.[0] || '?'}</span>
                )}
              </div>
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl text-white text-sm font-medium">
                <input type="file" className="hidden" onChange={uploadAvatar} disabled={uploading} accept="image/*" />
                <span className="text-2xl mb-1">📷</span>
                {uploading ? 'Enviando...' : 'Trocar foto'}
              </label>
            </div>

            <div className="mt-6 text-center lg:text-left space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                {formData.full_name || 'Seu nome'}
              </h2>
              {formData.title && (
                <p className="text-sm text-slate-600">{formData.title}</p>
              )}
              {formData.availability_badge && (
                <p className="text-sm">
                  {AVAILABILITY_BADGES.find((b) => b.value === formData.availability_badge)?.label}
                </p>
              )}
              {profileRole === 'ADMIN' && (
                <span className="inline-block px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-[10px] font-bold uppercase">
                  Admin
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: INFORMAÇÕES */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Informações do perfil</h3>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Como você quer ser conhecido?</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
                placeholder="Seu nome ou como prefere ser chamado"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Título principal</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
                placeholder="Ex: Desenvolvedor Full Stack | Criador de SaaS"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Badge (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_BADGES.filter((b) => b.value).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, availability_badge: formData.availability_badge === opt.value ? '' : opt.value })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      formData.availability_badge === opt.value
                        ? 'bg-[#4c1d95] border-[#4c1d95] text-white'
                        : 'border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Localização</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
                placeholder="Ex: São Paulo, SP"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Habilidades e Tecnologias</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
                placeholder="Ex: React, Node, UI/UX, IA, Startup"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-xs font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Sobre você</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all"
                placeholder="Conte sua história. O que você constrói? O que você procura? Que tipo de projeto te anima?"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">O que você está buscando agora?</label>
              <select
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] transition-all bg-white"
                value={formData.looking_for}
                onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
              >
                {LOOKING_FOR_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Links profissionais */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Links profissionais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">GitHub</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">LinkedIn</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Portfólio / Site</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                />
              </div>
            </div>
            {(formData.github_url || formData.linkedin_url || formData.website_url) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {formData.github_url && (
                  <a
                    href={formData.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                    GitHub
                  </a>
                )}
                {formData.linkedin_url && (
                  <a
                    href={formData.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a66c2] text-white text-sm font-semibold hover:bg-[#004182] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {formData.website_url && (
                  <a
                    href={formData.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    Portfólio
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {saving ? 'Salvando...' : 'Atualizar meu perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}
