'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ProfileByIdPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    avatar_url: '',
    location: '',
    specialties: '',
  })
  const [stats, setStats] = useState({ posts: 0, projects: 0 })

  const isOwnProfile = !!id && !!currentUserId && id === currentUserId

  useEffect(() => {
    if (!id) {
      router.replace('/dashboard/perfil')
      return
    }
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error || !data) {
        setLoading(false)
        return
      }
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || '',
        github_url: data.github_url || '',
        linkedin_url: data.linkedin_url || '',
        website_url: data.website_url || '',
        avatar_url: data.avatar_url || '',
        location: data.location || '',
        specialties: data.specialties || '',
      })
      const [{ count: postsCount }, { count: projectsCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', id),
      ])
      setStats({ posts: postsCount ?? 0, projects: projectsCount ?? 0 })
      setLoading(false)
    }
    loadProfile()
  }, [id, router])

  const uploadAvatar = async (event: any) => {
    if (!isOwnProfile) return
    try {
      setUploading(true)
      const file = event.target.files[0]
      const { data: { user } } = await supabase.auth.getUser()
      if (!file || !user) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setStatus({ type: 'success', text: 'Foto atualizada.' })
      setTimeout(() => setStatus(null), 3000)
    } catch (error: any) {
      setStatus({ type: 'error', text: 'Erro no upload: ' + (error?.message || 'Tente novamente.') })
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwnProfile) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').update({
        ...formData,
        location: formData.location || null,
        specialties: formData.specialties || null,
      }).eq('id', user.id)
      if (!error) {
        setStatus({ type: 'success', text: 'Perfil atualizado com sucesso.' })
        setTimeout(() => setStatus(null), 4000)
      } else setStatus({ type: 'error', text: error.message })
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-slate-400 font-mono text-xs">Carregando perfil...</div>

  if (!formData.full_name && !formData.bio && !formData.avatar_url) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Perfil não encontrado</h1>
        <p className="text-slate-500 text-sm mb-6">Este usuário não existe ou o perfil ainda não foi preenchido.</p>
        <Link href="/dashboard/membros" className="text-[#4c1d95] font-bold hover:underline">Voltar aos membros</Link>
      </div>
    )
  }

  if (!isOwnProfile) {
    const hasLinks = formData.github_url || formData.linkedin_url || formData.website_url
    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <header className="mb-8">
          <Link href="/dashboard/membros" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-[#4c1d95] mb-4 inline-flex items-center gap-1">
            ← Voltar aos membros
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Portfólio</h1>
          <p className="text-slate-500 text-sm mt-1">Perfil de {formData.full_name || 'Membro'}</p>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
            <aside className="shrink-0 flex flex-col items-center sm:items-start">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-inner">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-4xl font-black text-slate-300">{formData.full_name?.[0] || '?'}</span>
                )}
              </div>
              <div className="flex gap-4 mt-4 sm:mt-6">
                <div className="flex flex-col items-center min-w-[4rem] px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
                  <span className="text-xl font-black text-[#4c1d95]">{stats.posts}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Publicações</span>
                </div>
                <div className="flex flex-col items-center min-w-[4rem] px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xl font-black text-slate-700">{stats.projects}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Projetos</span>
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nome</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900">{formData.full_name || '—'}</p>
              </div>
              {(formData.location || formData.specialties) && (
                <div className="flex flex-wrap gap-3 text-sm">
                  {formData.location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-medium">
                      <span className="text-slate-400">📍</span> {formData.location}
                    </span>
                  )}
                  {formData.specialties && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg text-violet-700 font-medium">
                      <span className="text-violet-400">⚡</span> {formData.specialties}
                    </span>
                  )}
                </div>
              )}
              {formData.bio && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bio</p>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{formData.bio}</p>
                </div>
              )}
              {hasLinks && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Links</p>
                  <div className="flex flex-wrap gap-3">
                    {formData.github_url && (
                      <a href={formData.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
                        GitHub
                      </a>
                    )}
                    {formData.linkedin_url && (
                      <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0a66c2] text-white rounded-lg text-xs font-bold hover:bg-[#004182] transition-colors">
                        LinkedIn
                      </a>
                    )}
                    {formData.website_url && (
                      <a href={formData.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors">
                        Site
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12 border-b border-slate-200 pb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações de Conta</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie sua identidade profissional e conexões.</p>
        {status && (
          <div className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm font-bold ${status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {status.text}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <aside className="space-y-6">
          <div className="relative group w-32 h-32 mx-auto lg:mx-0">
            <div className="w-full h-full bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-slate-400 font-bold text-2xl">{formData.full_name?.[0] || 'U'}</span>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-slate-800/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">{uploading ? 'Aguarde...' : 'Alterar'}</span>
            </label>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Foto de Perfil</p>
            <p className="text-[10px] text-slate-400 mt-1">JPG ou PNG. Máx 2MB.</p>
          </div>
        </aside>

        <form onSubmit={handleSave} className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome Completo</label>
              <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none transition-all" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bio Profissional</label>
              <textarea rows={4} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none transition-all resize-none" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
            </div>
          </section>
          <section className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Local e Especialidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Cidade / Região" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              <input type="text" placeholder="Especialidades (ex: React, Node)" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.specialties} onChange={(e) => setFormData({ ...formData, specialties: e.target.value })} />
            </div>
          </section>
          <section className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Links Externos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" placeholder="GitHub URL" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.github_url} onChange={(e) => setFormData({ ...formData, github_url: e.target.value })} />
              <input type="url" placeholder="LinkedIn URL" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} />
              <input type="url" placeholder="Site / Portfolio URL" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full md:col-span-2" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} />
            </div>
          </section>
          <button type="submit" disabled={saving} className="bg-[#4c1d95] text-white px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-md active:scale-95 disabled:opacity-50">
            {saving ? 'Sincronizando...' : 'Confirmar Alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
