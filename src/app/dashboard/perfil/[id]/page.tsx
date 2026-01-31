'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    avatar_url: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          github_url: data.github_url || '',
          linkedin_url: data.linkedin_url || '',
          website_url: data.website_url || '',
          avatar_url: data.avatar_url || '',
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const uploadAvatar = async (event: any) => {
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
    } catch (error: any) {
      setStatus({ type: 'error', text: 'Erro no upload: ' + (error?.message || 'Tente novamente.') })
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').update(formData).eq('id', user.id)
      if (!error) {
        setStatus({ type: 'success', text: 'Perfil atualizado com sucesso.' })
        setTimeout(() => setStatus(null), 4000)
      } else setStatus({ type: 'error', text: error.message })
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-slate-400 font-mono text-xs">INITIALIZING_SESSION...</div>

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
              <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none transition-all" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bio Profissional</label>
              <textarea rows={4} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none transition-all resize-none" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
            </div>
          </section>

          <section className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Links Externos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" placeholder="GitHub URL" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.github_url} onChange={(e) => setFormData({...formData, github_url: e.target.value})} />
              <input type="url" placeholder="LinkedIn URL" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#4c1d95] outline-none w-full" value={formData.linkedin_url} onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})} />
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