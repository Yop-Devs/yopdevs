'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [profileRole, setProfileRole] = useState<string>('')
  const [formData, setFormData] = useState({ 
    full_name: '', 
    bio: '', 
    github_url: '', 
    linkedin_url: '', 
    website_url: '', 
    avatar_url: '',
    location: '',
    specialties: ''
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
            bio: data.bio || '',
            github_url: data.github_url || '',
            linkedin_url: data.linkedin_url || '',
            website_url: data.website_url || '',
            avatar_url: data.avatar_url || '',
            location: data.location || '',
            specialties: data.specialties || ''
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatus({ type, text })
    setTimeout(() => setStatus(null), 4000)
  }

  const uploadAvatar = async (e: any) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      const { data: { user } } = await supabase.auth.getUser()
      if (!file || !user) return

      const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(fileName, file)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      showStatus('success', 'IMAGEM SINCRONIZADA NO STORAGE.')
    } catch (err: any) { showStatus('error', err.message) } finally { setUploading(false) }
  }

  const handleSave = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({
          full_name: formData.full_name,
          bio: formData.bio,
          github_url: formData.github_url,
          linkedin_url: formData.linkedin_url,
          website_url: formData.website_url,
          avatar_url: formData.avatar_url,
          location: formData.location,
          specialties: formData.specialties
        }).eq('id', user?.id)
    if (error) showStatus('error', error.message)
    else showStatus('success', 'PERFIL ATUALIZADO NO KERNEL.')
  }

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.5em]">Sync_Profile_Data...</div>

  return (
    <div className="max-w-[1200px] mx-auto py-8 sm:py-16 px-4 sm:px-8 space-y-8 sm:space-y-12">
      <header className="flex justify-between items-end border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Configurações de Identidade</h1>
            {profileRole && (
              <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border-2 uppercase tracking-widest ${
                profileRole === 'ADMIN' ? 'bg-violet-100 border-violet-400 text-violet-700' :
                profileRole === 'BANNED' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}>
                {profileRole === 'ADMIN' ? 'Admin' : profileRole === 'BANNED' ? 'Restrito' : 'Membro'}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Gerenciamento de credenciais e ativos digitais</p>
        </div>
        
        {status && (
          <div className={`px-6 py-3 border-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-md animate-bounce ${
            status.type === 'success' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-red-50 border-red-500 text-red-600'
          }`}>
            {status.text}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* COLUNA ESQUERDA: AVATAR E STATUS */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="relative group w-full aspect-square max-w-[320px] mx-auto lg:mx-0">
            <div className="w-full h-full bg-white border-2 border-slate-200 rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-md">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl font-black text-slate-100">{formData.full_name?.[0]}</span>
              )}
            </div>
            <label className="absolute inset-0 bg-slate-800/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer rounded-[2.5rem] backdrop-blur-sm text-white">
              <input type="file" className="hidden" onChange={uploadAvatar} disabled={uploading} accept="image/*" />
              <span className="text-2xl mb-2">📸</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Aguarde...' : 'Alterar Imagem'}</span>
            </label>
          </div>
        </aside>

        {/* COLUNA DIREITA: DADOS */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nome de Exibição</label>
              <input className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-slate-50 transition-all" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Localização (Cidade/Estado)</label>
              <input placeholder="Ex: São Paulo, SP" className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Especialidades (tags por vírgula)</label>
            <input placeholder="Ex: React, Python, Venture Capital..." className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Bio (dev ou empresário)</label>
            <textarea rows={4} placeholder="Breve bio ou tese: CTO, fundador, desenvolvedor full-stack..." className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium resize-none outline-none focus:bg-slate-50" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">GitHub</label>
              <input type="url" placeholder="https://..." className="p-4 border border-slate-200 rounded-xl text-xs font-semibold w-full outline-none" value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">LinkedIn</label>
              <input type="url" placeholder="https://..." className="p-4 border border-slate-200 rounded-xl text-xs font-semibold w-full outline-none" value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Site / Portfólio</label>
              <input type="url" placeholder="https://..." className="p-4 border border-slate-200 rounded-xl text-xs font-semibold w-full outline-none" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full lg:w-auto px-20 py-5 bg-[#4c1d95] text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-violet-800 transition-all active:scale-95 shadow-md hover:shadow-lg">
            SALVAR ALTERAÇÕES
          </button>
        </form>
      </div>
    </div>
  )
}