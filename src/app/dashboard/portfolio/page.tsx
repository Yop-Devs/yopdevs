'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

type TabId = 'perfil' | 'projetos' | 'skills' | 'experiencia'

type PortfolioRow = {
  id: string
  user_id: string
  username: string
  display_name: string | null
  headline: string | null
  bio: string | null
  location: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  github: string | null
  linkedin: string | null
  avatar_url: string | null
  banner_url: string | null
  available_for_work: boolean
  created_at: string
  updated_at: string
}

type ProjectRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  project_url: string | null
  image_url: string | null
  tech_stack: string[]
  created_at: string
}

type ExperienceRow = {
  id: string
  user_id: string
  role: string
  company: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

const BUCKET = 'portfolio-images'

function slugFromUsername(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function DashboardPortfolioPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioRow | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [tab, setTab] = useState<TabId>('perfil')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    headline: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    instagram: '',
    github: '',
    linkedin: '',
    avatar_url: '',
    banner_url: '',
    available_for_work: true,
  })

  const [newSkill, setNewSkill] = useState('')
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)
  const [editingExp, setEditingExp] = useState<ExperienceRow | null>(null)
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    category: '',
    project_url: '',
    image_url: '',
    tech_stack: '' as string,
  })
  const [expForm, setExpForm] = useState({
    role: '',
    company: '',
    description: '',
    start_date: '',
    end_date: '',
  })

  const loadPortfolio = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)
    const { data: p } = await supabase.from('user_portfolios').select('*').eq('user_id', user.id).single()
    if (p) {
      setPortfolio(p as PortfolioRow)
      setForm({
        display_name: p.display_name ?? '',
        username: p.username ?? '',
        headline: p.headline ?? '',
        bio: p.bio ?? '',
        location: p.location ?? '',
        phone: p.phone ?? '',
        website: p.website ?? '',
        instagram: p.instagram ?? '',
        github: p.github ?? '',
        linkedin: p.linkedin ?? '',
        avatar_url: p.avatar_url ?? '',
        banner_url: p.banner_url ?? '',
        available_for_work: p.available_for_work ?? true,
      })
      const { data: sk } = await supabase.from('portfolio_skills').select('skill_name').eq('user_id', user.id).order('skill_name')
      setSkills((sk ?? []).map((s) => s.skill_name))
      const { data: pr } = await supabase.from('portfolio_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setProjects((pr ?? []) as ProjectRow[])
      const { data: ex } = await supabase.from('portfolio_experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false })
      setExperiences((ex ?? []) as ExperienceRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() || 'jpg'
    const name = `${user.id}/${path}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, { upsert: true })
    if (error) {
      showMsg('error', error.message)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(name)
    return publicUrl
  }

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const usernameSlug = slugFromUsername(form.username) || form.username.toLowerCase().replace(/\s+/g, '-')
    if (!usernameSlug) {
      showMsg('error', 'Escolha um username (ex: seu-nome).')
      setSaving(false)
      return
    }
    const payload = {
      user_id: userId,
      username: usernameSlug,
      display_name: form.display_name || null,
      headline: form.headline || null,
      bio: form.bio || null,
      location: form.location || null,
      phone: form.phone || null,
      website: form.website || null,
      instagram: form.instagram || null,
      github: form.github || null,
      linkedin: form.linkedin || null,
      avatar_url: form.avatar_url || null,
      banner_url: form.banner_url || null,
      available_for_work: form.available_for_work,
    }
    const { data, error } = await supabase.from('user_portfolios').upsert(payload, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    }).select().single()
    if (error) {
      if (error.code === '23505') showMsg('error', 'Este username já está em uso. Escolha outro.')
      else showMsg('error', error.message)
    } else {
      setPortfolio(data as PortfolioRow)
      showMsg('success', 'Perfil do portfólio salvo.')
    }
    setSaving(false)
  }

  const addSkill = async () => {
    const name = newSkill.trim()
    if (!name || !userId) return
    const { error } = await supabase.from('portfolio_skills').insert({ user_id: userId, skill_name: name })
    if (error) {
      if (error.code === '23505') showMsg('error', 'Esta skill já foi adicionada.')
      else showMsg('error', error.message)
      return
    }
    setSkills((s) => [...s, name].sort())
    setNewSkill('')
    showMsg('success', 'Skill adicionada.')
  }

  const removeSkill = async (skillName: string) => {
    if (!userId) return
    await supabase.from('portfolio_skills').delete().eq('user_id', userId).eq('skill_name', skillName)
    setSkills((s) => s.filter((x) => x !== skillName))
    showMsg('success', 'Skill removida.')
  }

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const tech = projectForm.tech_stack.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
    if (editingProject) {
      const { error } = await supabase.from('portfolio_projects').update({
        title: projectForm.title,
        description: projectForm.description || null,
        category: projectForm.category || null,
        project_url: projectForm.project_url || null,
        image_url: projectForm.image_url || null,
        tech_stack: tech,
      }).eq('id', editingProject.id)
      if (error) showMsg('error', error.message)
      else {
        setProjects((p) => p.map((x) => (x.id === editingProject.id ? { ...x, ...projectForm, tech_stack: tech } : x)))
        setEditingProject(null)
        setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
        showMsg('success', 'Projeto atualizado.')
      }
    } else {
      const { data, error } = await supabase.from('portfolio_projects').insert({
        user_id: userId,
        title: projectForm.title,
        description: projectForm.description || null,
        category: projectForm.category || null,
        project_url: projectForm.project_url || null,
        image_url: projectForm.image_url || null,
        tech_stack: tech,
      }).select().single()
      if (error) showMsg('error', error.message)
      else {
        setProjects((p) => [data as ProjectRow, ...p])
        setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
        showMsg('success', 'Projeto adicionado.')
      }
    }
    setSaving(false)
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Excluir este projeto?')) return
    await supabase.from('portfolio_projects').delete().eq('id', id)
    setProjects((p) => p.filter((x) => x.id !== id))
    showMsg('success', 'Projeto excluído.')
  }

  const saveExperience = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    if (editingExp) {
      const { error } = await supabase.from('portfolio_experiences').update({
        role: expForm.role,
        company: expForm.company,
        description: expForm.description || null,
        start_date: expForm.start_date || null,
        end_date: expForm.end_date || null,
      }).eq('id', editingExp.id)
      if (error) showMsg('error', error.message)
      else {
        setExperiences((ex) => ex.map((x) => (x.id === editingExp.id ? { ...x, ...expForm } : x)))
        setEditingExp(null)
        setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
        showMsg('success', 'Experiência atualizada.')
      }
    } else {
      const { data, error } = await supabase.from('portfolio_experiences').insert({
        user_id: userId,
        role: expForm.role,
        company: expForm.company,
        description: expForm.description || null,
        start_date: expForm.start_date || null,
        end_date: expForm.end_date || null,
      }).select().single()
      if (error) showMsg('error', error.message)
      else {
        setExperiences((ex) => [data as ExperienceRow, ...ex])
        setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
        showMsg('success', 'Experiência adicionada.')
      }
    }
    setSaving(false)
  }

  const deleteExperience = async (id: string) => {
    if (!confirm('Excluir esta experiência?')) return
    await supabase.from('portfolio_experiences').delete().eq('id', id)
    setExperiences((ex) => ex.filter((x) => x.id !== id))
    showMsg('success', 'Experiência excluída.')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'projetos', label: 'Projetos' },
    { id: 'skills', label: 'Skills' },
    { id: 'experiencia', label: 'Experiência' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto bg-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-slate-900">Meu Portfólio</h1>
        {portfolio?.username && (
          <Link
            href={`/u/${portfolio.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#4c1d95] hover:underline"
          >
            Ver portfólio público →
          </Link>
        )}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-[#4c1d95] text-[#4c1d95]' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'perfil' && (
          <form onSubmit={handleSavePerfil} className="space-y-6 min-h-[calc(100dvh-12rem)] min-h-[calc(100vh-12rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome público</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                  placeholder="Seu nome no portfólio"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username (URL) *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                  placeholder="ex: joao-silva"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">yopdevs.com/u/seu-username</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Headline</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95]"
                placeholder="Ex: Desenvolvedor Full Stack"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] min-h-[100px]"
                placeholder="Sobre você..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
                <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input type="url" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GitHub</label>
                <input type="url" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                <input type="url" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4c1d95]" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={form.available_for_work}
                onChange={(e) => setForm({ ...form, available_for_work: e.target.checked })}
                className="rounded border-slate-300 text-[#4c1d95] focus:ring-[#4c1d95]"
              />
              <label htmlFor="available" className="text-sm font-medium text-slate-700">Disponível para trabalho</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Avatar</label>
                <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-slate-400">?</span>
                  )}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f || !userId) return
                    setUploading('avatar')
                    const url = await uploadFile(f, 'avatar')
                    if (url) setForm((prev) => ({ ...prev, avatar_url: url }))
                    setUploading(null)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="avatar-upload" className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-violet-800 transition-colors shadow-sm">
                  Escolher arquivo
                </label>
                {uploading === 'avatar' && <p className="text-xs text-slate-500 mt-1">Enviando...</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Banner</label>
                <div className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {form.banner_url ? (
                    <img src={form.banner_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-slate-400">Opcional</span>
                  )}
                </div>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f || !userId) return
                    setUploading('banner')
                    const url = await uploadFile(f, 'banner')
                    if (url) setForm((prev) => ({ ...prev, banner_url: url }))
                    setUploading(null)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="banner-upload" className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-violet-800 transition-colors shadow-sm">
                  Escolher arquivo
                </label>
                {uploading === 'banner' && <p className="text-xs text-slate-500 mt-1">Enviando...</p>}
              </div>
            </div>
            <button type="submit" disabled={saving} className="px-6 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm hover:bg-violet-800 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        )}

        {tab === 'projetos' && (
          <div className="space-y-6">
            <form onSubmit={saveProject} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">{editingProject ? 'Editar projeto' : 'Novo projeto'}</h3>
              <input type="text" required placeholder="Título" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
              <textarea placeholder="Descrição" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm min-h-[80px]" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
              <input type="text" placeholder="Categoria" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })} />
              <input type="url" placeholder="Link do projeto" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={projectForm.project_url} onChange={(e) => setProjectForm({ ...projectForm, project_url: e.target.value })} />
              <input type="text" placeholder="Tech stack (separado por vírgula)" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={projectForm.tech_stack} onChange={(e) => setProjectForm({ ...projectForm, tech_stack: e.target.value })} />
              <div>
                <label className="block text-sm text-slate-600 mb-1">Imagem do projeto (URL ou envie arquivo)</label>
                <input type="url" placeholder="URL da imagem" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm mb-2" value={projectForm.image_url} onChange={(e) => setProjectForm({ ...projectForm, image_url: e.target.value })} />
                <input
                  id="project-image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f || !userId) return
                    setUploading('project')
                    const url = await uploadFile(f, 'project')
                    if (url) setProjectForm((prev) => ({ ...prev, image_url: url }))
                    setUploading(null)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="project-image-upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-violet-800 transition-colors shadow-sm">
                  Escolher arquivo
                </label>
                {uploading === 'project' && <span className="ml-2 text-xs text-slate-500">Enviando...</span>}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium">Salvar</button>
                {editingProject && (
                  <button type="button" onClick={() => { setEditingProject(null); setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' }); }} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancelar</button>
                )}
              </div>
            </form>
            <ul className="space-y-3">
              {projects.map((pr) => (
                <li key={pr.id} className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{pr.title}</p>
                    {pr.category && <p className="text-xs text-slate-500">{pr.category}</p>}
                    {pr.description && <p className="text-sm text-slate-600 line-clamp-2 mt-1">{pr.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditingProject(pr); setProjectForm({ title: pr.title, description: pr.description || '', category: pr.category || '', project_url: pr.project_url || '', image_url: pr.image_url || '', tech_stack: (pr.tech_stack || []).join(', ') }); }} className="text-sm text-[#4c1d95] hover:underline">Editar</button>
                    <button type="button" onClick={() => deleteProject(pr.id)} className="text-sm text-red-600 hover:underline">Excluir</button>
                  </div>
                </li>
              ))}
              {projects.length === 0 && <p className="text-slate-500 text-sm">Nenhum projeto ainda. Adicione acima.</p>}
            </ul>
          </div>
        )}

        {tab === 'skills' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Ex: Next.js, Python..."
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm flex-1 min-w-[160px]"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button type="button" onClick={addSkill} className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium">Adicionar</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="text-purple-600 hover:text-purple-800" aria-label="Remover">×</button>
                </span>
              ))}
              {skills.length === 0 && <p className="text-slate-500 text-sm">Nenhuma skill. Adicione acima.</p>}
            </div>
          </div>
        )}

        {tab === 'experiencia' && (
          <div className="space-y-6">
            <form onSubmit={saveExperience} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">{editingExp ? 'Editar experiência' : 'Nova experiência'}</h3>
              <input type="text" required placeholder="Cargo" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={expForm.role} onChange={(e) => setExpForm({ ...expForm, role: e.target.value })} />
              <input type="text" required placeholder="Empresa" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} />
              <textarea placeholder="Descrição" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm min-h-[80px]" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg text-sm font-medium">Salvar</button>
                {editingExp && (
                  <button type="button" onClick={() => { setEditingExp(null); setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' }); }} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancelar</button>
                )}
              </div>
            </form>
            <ul className="space-y-3">
              {experiences.map((ex) => (
                <li key={ex.id} className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{ex.role} · {ex.company}</p>
                      {ex.description && <p className="text-sm text-slate-600 mt-1">{ex.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => { setEditingExp(ex); setExpForm({ role: ex.role, company: ex.company, description: ex.description || '', start_date: ex.start_date || '', end_date: ex.end_date || '' }); }} className="text-sm text-[#4c1d95] hover:underline">Editar</button>
                      <button type="button" onClick={() => deleteExperience(ex.id)} className="text-sm text-red-600 hover:underline">Excluir</button>
                    </div>
                  </div>
                </li>
              ))}
              {experiences.length === 0 && <p className="text-slate-500 text-sm">Nenhuma experiência. Adicione acima.</p>}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
