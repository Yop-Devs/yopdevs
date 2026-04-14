'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { notifyPublicPortfolioUpdated } from '@/lib/portfolio-preview-sync'
import { supabase } from '@/lib/supabase'
import { isReservedPortfolioUsername, RESERVED_PORTFOLIO_USERNAME_MESSAGE } from '@/lib/reserved-portfolio-usernames'
import {
  formationEntriesForDatabase,
  parseFormationEntries,
  type PortfolioFormationEntry,
} from '@/lib/portfolio-formation'
import {
  MAX_SKILL_CARDS,
  parseSkillCards,
  skillCardsForDatabase,
  type PortfolioSkillCard,
} from '@/lib/portfolio-skill-cards'

type PortfolioRow = {
  id: string
  user_id: string
  username: string
  display_name: string | null
  headline: string | null
  bio: string | null
  about_text: string | null
  about_highlight: string | null
  about_age: string | null
  about_marital_status: string | null
  about_status_line: string | null
  skill_cards: PortfolioSkillCard[] | null
  formation_entries: unknown
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

type EditorStep = 'apresentacao' | 'sobre' | 'contato' | 'foto' | 'skills' | 'projetos' | 'experiencia' | 'formacao'

const BUCKET = 'portfolio-images'

const STEPS: { id: EditorStep; label: string }[] = [
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'contato', label: 'Contato' },
  { id: 'foto', label: 'Foto' },
  { id: 'skills', label: 'Competências' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'experiencia', label: 'Experiência' },
  { id: 'formacao', label: 'Formação' },
]

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20'
const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wider text-violet-800/90'

function slugFromUsername(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function emptyPortfolioForm() {
  return {
    display_name: '',
    username: '',
    headline: '',
    bio: '',
    about_text: '',
    about_highlight: '',
    about_age: '',
    about_marital_status: '',
    about_status_line: '',
    location: '',
    phone: '',
    website: '',
    instagram: '',
    github: '',
    linkedin: '',
    avatar_url: '',
    available_for_work: true,
  }
}

function formatExpDate(d: string | null) {
  if (!d) return '—'
  return d.length >= 10 ? d.slice(0, 10) : d
}

export default function DashboardPortfolioPage() {
  const [step, setStep] = useState<EditorStep>('apresentacao')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioRow | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'project' | 'experience'; id: string } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  /** URL absoluta do /u/username — mostrada após guardar a apresentação para pré-visualização em tempo real */
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null)
  const [portfolioWipeOpen, setPortfolioWipeOpen] = useState(false)
  const [portfolioWipePassword, setPortfolioWipePassword] = useState('')
  const [portfolioWiping, setPortfolioWiping] = useState(false)

  const [form, setForm] = useState(emptyPortfolioForm)

  const [skillCards, setSkillCards] = useState<PortfolioSkillCard[]>([])
  const [educationEntries, setEducationEntries] = useState<PortfolioFormationEntry[]>([])
  const [tagDraftByCard, setTagDraftByCard] = useState<Record<number, string>>({})
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)
    const { data: p, error: portfolioLoadError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (portfolioLoadError) {
      toast.error(portfolioLoadError.message)
      setLoading(false)
      return
    }
    if (!p) {
      setPortfolio(null)
      setForm(emptyPortfolioForm())
      setSkillCards([])
      setEducationEntries([])
      setSkills([])
      setProjects([])
      setExperiences([])
      setLivePreviewUrl(null)
      setEditingProject(null)
      setEditingExp(null)
      setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
      setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
      setTagDraftByCard({})
      setLoading(false)
      return
    }
    const portfolioRow = p as PortfolioRow
    setPortfolio(portfolioRow)
    setForm({
      display_name: portfolioRow.display_name ?? '',
      username: portfolioRow.username ?? '',
      headline: portfolioRow.headline ?? '',
      bio: portfolioRow.bio ?? '',
      about_text: portfolioRow.about_text ?? '',
      about_highlight: portfolioRow.about_highlight ?? '',
      about_age: portfolioRow.about_age ?? '',
      about_marital_status: portfolioRow.about_marital_status ?? '',
      about_status_line: portfolioRow.about_status_line ?? '',
      location: portfolioRow.location ?? '',
      phone: portfolioRow.phone ?? '',
      website: portfolioRow.website ?? '',
      instagram: portfolioRow.instagram ?? '',
      github: portfolioRow.github ?? '',
      linkedin: portfolioRow.linkedin ?? '',
      avatar_url: portfolioRow.avatar_url ?? '',
      available_for_work: portfolioRow.available_for_work ?? true,
    })
    setSkillCards(parseSkillCards(portfolioRow.skill_cards))
    setEducationEntries(parseFormationEntries(portfolioRow.formation_entries))
    const { data: sk } = await supabase.from('portfolio_skills').select('skill_name').eq('user_id', user.id).order('skill_name')
    setSkills((sk ?? []).map((s) => s.skill_name))
    const { data: projectsData } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setProjects((projectsData ?? []) as ProjectRow[])
    const { data: ex } = await supabase.from('portfolio_experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false })
    setExperiences((ex ?? []) as ExperienceRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() || 'jpg'
    const name = `${user.id}/${path}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      return null
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(name)
    return publicUrl
  }

  const handleSavePerfil = async (
    e: React.FormEvent,
    origin: 'apresentacao' | 'sobre' | 'contato' | 'foto' | 'skills' | 'formacao'
  ) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const usernameSlug = slugFromUsername(form.username) || form.username.toLowerCase().replace(/\s+/g, '-')
    if (!usernameSlug) {
      toast.error('Escolhe um username (ex: o-teu-nome).')
      setSaving(false)
      return
    }
    if (isReservedPortfolioUsername(usernameSlug)) {
      toast.error(RESERVED_PORTFOLIO_USERNAME_MESSAGE)
      setSaving(false)
      return
    }
    const payload = {
      user_id: userId,
      username: usernameSlug,
      display_name: form.display_name || null,
      headline: form.headline || null,
      bio: form.bio || null,
      about_text: form.about_text || null,
      about_highlight: form.about_highlight.trim() || null,
      about_age: form.about_age.trim() || null,
      about_marital_status: form.about_marital_status.trim() || null,
      about_status_line: form.about_status_line.trim() || null,
      location: form.location || null,
      phone: form.phone || null,
      website: form.website || null,
      instagram: form.instagram || null,
      github: form.github || null,
      linkedin: form.linkedin || null,
      avatar_url: form.avatar_url || null,
      banner_url: null,
      available_for_work: form.available_for_work,
      skill_cards: skillCardsForDatabase(skillCards),
      formation_entries: formationEntriesForDatabase(educationEntries),
    }
    const { data, error } = await supabase
      .from('user_portfolios')
      .upsert(payload, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') toast.error('Este username já está em uso. Escolhe outro.')
      else toast.error(error.message)
    } else {
      const row = data as PortfolioRow
      setPortfolio(row)
      setSkillCards(parseSkillCards(row.skill_cards))
      setEducationEntries(parseFormationEntries(row.formation_entries))
      toast.success('Alterações guardadas.')
      if (row.username && typeof window !== 'undefined') {
        setLivePreviewUrl(`${window.location.origin}/u/${row.username}`)
      }
      notifyPublicPortfolioUpdated(row.username)
    }
    setSaving(false)
  }

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const tech = projectForm.tech_stack
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (editingProject) {
      const { error } = await supabase
        .from('portfolio_projects')
        .update({
          title: projectForm.title,
          description: projectForm.description || null,
          category: projectForm.category || null,
          project_url: projectForm.project_url || null,
          image_url: projectForm.image_url || null,
          tech_stack: tech,
        })
        .eq('id', editingProject.id)
      if (error) toast.error(error.message)
      else {
        setProjects((p) => p.map((x) => (x.id === editingProject.id ? { ...x, ...projectForm, tech_stack: tech } : x)))
        setEditingProject(null)
        setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
        toast.success('Projeto atualizado.')
        notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
      }
    } else {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .insert({
          user_id: userId,
          title: projectForm.title,
          description: projectForm.description || null,
          category: projectForm.category || null,
          project_url: projectForm.project_url || null,
          image_url: projectForm.image_url || null,
          tech_stack: tech,
        })
        .select()
        .single()
      if (error) toast.error(error.message)
      else {
        setProjects((p) => [data as ProjectRow, ...p])
        setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
        toast.success('Projeto adicionado.')
        notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
      }
    }
    setSaving(false)
  }

  const executePendingDelete = async () => {
    if (!pendingDelete) return
    const { kind, id } = pendingDelete
    setPendingDelete(null)
    if (kind === 'project') {
      await supabase.from('portfolio_projects').delete().eq('id', id)
      setProjects((p) => p.filter((x) => x.id !== id))
      toast.success('Projeto excluído.')
      notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
    } else {
      await supabase.from('portfolio_experiences').delete().eq('id', id)
      setExperiences((ex) => ex.filter((x) => x.id !== id))
      toast.success('Experiência excluída.')
      notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
    }
  }

  const saveExperience = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    if (editingExp) {
      const { error } = await supabase
        .from('portfolio_experiences')
        .update({
          role: expForm.role,
          company: expForm.company,
          description: expForm.description || null,
          start_date: expForm.start_date || null,
          end_date: expForm.end_date || null,
        })
        .eq('id', editingExp.id)
      if (error) toast.error(error.message)
      else {
        setExperiences((ex) => ex.map((x) => (x.id === editingExp.id ? { ...x, ...expForm } : x)))
        setEditingExp(null)
        setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
        toast.success('Experiência atualizada.')
        notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
      }
    } else {
      const { data, error } = await supabase
        .from('portfolio_experiences')
        .insert({
          user_id: userId,
          role: expForm.role,
          company: expForm.company,
          description: expForm.description || null,
          start_date: expForm.start_date || null,
          end_date: expForm.end_date || null,
        })
        .select()
        .single()
      if (error) toast.error(error.message)
      else {
        setExperiences((ex) => [data as ExperienceRow, ...ex])
        setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
        toast.success('Experiência adicionada.')
        notifyPublicPortfolioUpdated((portfolio?.username ?? slugFromUsername(form.username)) || undefined)
      }
    }
    setSaving(false)
  }

  const confirmWipePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const pwd = portfolioWipePassword.trim()
    if (!pwd) {
      toast.error('Introduz a tua palavra-passe.')
      return
    }
    setPortfolioWiping(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = user?.email
    if (!email) {
      toast.error('Conta sem email. Usa o método de login da tua conta para gerir o portfólio.')
      setPortfolioWiping(false)
      return
    }
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pwd })
    if (authErr) {
      toast.error('Palavra-passe incorreta.')
      setPortfolioWiping(false)
      return
    }
    const oldUsername = portfolio?.username
    await supabase.from('portfolio_skills').delete().eq('user_id', userId)
    await supabase.from('portfolio_projects').delete().eq('user_id', userId)
    await supabase.from('portfolio_experiences').delete().eq('user_id', userId)
    const { error: delErr } = await supabase.from('user_portfolios').delete().eq('user_id', userId)
    if (delErr) {
      toast.error(delErr.message)
      setPortfolioWiping(false)
      return
    }
    notifyPublicPortfolioUpdated(oldUsername ?? undefined)
    setPortfolioWipeOpen(false)
    setPortfolioWipePassword('')
    setLivePreviewUrl(null)
    toast.success('Portfólio removido. Podes criar de novo no passo Apresentação.')
    setStep('apresentacao')
    await loadPortfolio()
    setPortfolioWiping(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-slate-600">A carregar editor…</p>
      </div>
    )
  }

  const navBtn =
    'rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide transition sm:text-xs sm:px-4 sm:py-2.5'
  const navBtnActive = 'bg-violet-600 text-white shadow-md'
  const navBtnIdle = 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'

  const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'

  return (
    <div className="min-h-full min-w-0 bg-slate-100 pb-8 text-slate-900">
      <div className="mx-auto max-w-5xl px-3 pt-6 sm:px-4 sm:pt-8">
        <div className="mb-6 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/30 px-5 py-6 shadow-sm sm:px-8 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">Editor do portfólio</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Portfólio público</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Escolhe uma secção no menu. Só essa parte aparece aqui — podes editar tudo à tua velocidade. A página pública usa a marca YOP Devs no topo.
              </p>
            </div>
            {portfolio?.username ? (
              <Link
                href={`/u/${portfolio.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Ver página pública
              </Link>
            ) : null}
          </div>
        </div>

        <nav
          className="sticky top-0 z-20 -mx-1 mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur-sm"
          aria-label="Secções do editor"
        >
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`${navBtn} ${step === s.id ? navBtnActive : navBtnIdle}`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {livePreviewUrl ? (
          <div className="relative mb-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 pr-10 text-sm text-violet-950 shadow-sm sm:px-5 sm:py-4">
            <button
              type="button"
              onClick={() => setLivePreviewUrl(null)}
              className="absolute right-2 top-2 rounded-md p-1.5 text-violet-700 hover:bg-violet-100/80"
              aria-label="Fechar aviso do link"
            >
              ×
            </button>
            <p className="font-semibold text-violet-900">Vê o portfólio em tempo real</p>
            <p className="mt-1 text-violet-800/90">
              Com o portfólio aberto noutro separador, as alterações aparecem ao guardar (sem precisar de atualizar manualmente). Se não mudar, recarrega uma vez.
            </p>
            <a
              href={livePreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              Abrir portfólio público
              <span aria-hidden className="text-xs opacity-90">
                ↗
              </span>
            </a>
          </div>
        ) : null}

        {step === 'apresentacao' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'apresentacao')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Apresentação</h2>
            <p className="mt-1 text-sm text-slate-600">
              Nome público, URL, headline, <strong className="font-semibold text-slate-800">bio curta</strong> (só no topo, por baixo da headline) e disponibilidade.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nome público</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Como queres ser apresentado"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Username (URL) *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="ex: joao-silva"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                <p className="mt-1.5 text-xs text-slate-500">yopdevs.com/u/o-teu-username</p>
              </div>
            </div>
            <div className="mt-5">
              <label className={labelClass}>Headline</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex.: Desenvolvedor full stack"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
            </div>
            <div className="mt-5">
              <label className={labelClass}>Bio (resumo no topo)</label>
              <p className="mb-2 text-xs text-slate-500">Frase ou parágrafo curto; aparece no hero logo abaixo da headline.</p>
              <textarea
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="Ex.: Transformando ideias em soluções digitais…"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                id="available"
                checked={form.available_for_work}
                onChange={(e) => setForm({ ...form, available_for_work: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="available" className="text-sm font-medium text-slate-800">
                Disponível para trabalho / colaborações
              </label>
            </div>
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar apresentação'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'sobre' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'sobre')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Sobre</h2>
            <p className="mt-1 text-sm text-slate-600">
              Texto <strong className="font-semibold text-slate-800">mais longo</strong>, só na secção &quot;Sobre&quot; da página pública — diferente da bio curta do topo. Os cartões abaixo aparecem na mesma secção (estilo grelha).
            </p>
            <div className="mt-6">
              <label className={labelClass}>Texto da secção Sobre</label>
              <textarea
                className={`${inputClass} min-h-[240px] resize-y`}
                placeholder="Histórico, objetivos, o que quiseres contar aos visitantes…"
                value={form.about_text}
                onChange={(e) => setForm({ ...form, about_text: e.target.value })}
              />
            </div>
            <div className="mt-5">
              <label className={labelClass}>Destaque (opcional)</label>
              <p className="mb-2 text-xs text-slate-500">Segundo bloco, em destaque (ex.: frase a cores / itálico) abaixo do texto principal.</p>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Ex.: Disponível para projetos internacionais…"
                value={form.about_highlight}
                onChange={(e) => setForm({ ...form, about_highlight: e.target.value })}
              />
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Localização (onde moras)</label>
                <p className="mb-2 text-xs text-slate-500">Mesmo valor que em Contato; aparece no cartão &quot;Localização&quot;.</p>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex.: Cidade — UF, País"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Idade</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex.: 22 anos"
                  value={form.about_age}
                  onChange={(e) => setForm({ ...form, about_age: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Estado civil</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex.: Solteiro(a)"
                  value={form.about_marital_status}
                  onChange={(e) => setForm({ ...form, about_marital_status: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Status</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex.: Disponível para oportunidades globais"
                  value={form.about_status_line}
                  onChange={(e) => setForm({ ...form, about_status_line: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar sobre'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'contato' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'contato')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Contato e redes</h2>
            <p className="mt-1 text-sm text-slate-600">Telefone e links na página pública. A localização também pode ser editada no passo Sobre (cartão na mesma secção).</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Localização</label>
                <p className="mb-2 text-xs text-slate-500">Sincronizada com o passo Sobre.</p>
                <input type="text" className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input type="text" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Website</label>
                <input type="url" className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="@utilizador"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>GitHub</label>
                <input type="url" className={inputClass} value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input type="url" className={inputClass} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
              </div>
            </div>
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar contato'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'foto' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'foto')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Foto do portfólio</h2>
            <p className="mt-1 text-sm text-slate-600">Imagem circular na página pública — não altera o avatar da conta na rede.</p>
            <div className="mt-6 max-w-md">
              <label className={labelClass}>Foto</label>
              <p className="mb-3 text-xs text-slate-500">Envia um ficheiro ou cola uma URL.</p>
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {form.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
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
              <label
                htmlFor="avatar-upload"
                className="mt-3 inline-flex cursor-pointer items-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Escolher ficheiro
              </label>
              {uploading === 'avatar' ? <p className="mt-2 text-xs text-slate-500">A enviar…</p> : null}
              <input
                type="url"
                placeholder="https://…"
                className={`${inputClass} mt-3`}
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              />
            </div>
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar foto'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'skills' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'skills')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Habilidades &amp; tecnologias</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cria até <strong className="font-semibold text-slate-800">{MAX_SKILL_CARDS} cartões</strong>. Em cada um defines um{' '}
              <strong className="font-semibold text-slate-800">título</strong> (ex.: Frontend) e as <strong className="font-semibold text-slate-800">tags</strong> dentro do cartão.
              Na página pública aparecem em grelha 2×2, como no portfólio de referência.
            </p>
            <div className="mt-6 space-y-6">
              {skillCards.map((card, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cartão {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSkillCards((c) => c.filter((_, j) => j !== idx))
                        setTagDraftByCard((d) => {
                          const next = { ...d }
                          delete next[idx]
                          return next
                        })
                      }}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remover cartão
                    </button>
                  </div>
                  <label className={labelClass}>Título</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ex.: Frontend, Backend, Automação…"
                    value={card.title}
                    onChange={(e) => {
                      const v = e.target.value
                      setSkillCards((c) => c.map((x, j) => (j === idx ? { ...x, title: v } : x)))
                    }}
                  />
                  <label className={`${labelClass} mt-4`}>Tags</label>
                  <div className="mb-2 flex min-h-[2rem] flex-wrap gap-2">
                    {card.tags.map((t) => (
                      <span
                        key={`${idx}-${t}`}
                        className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900"
                      >
                        {t}
                        <button
                          type="button"
                          className="text-violet-600 hover:text-violet-950"
                          aria-label={`Remover ${t}`}
                          onClick={() =>
                            setSkillCards((c) =>
                              c.map((x, j) => (j === idx ? { ...x, tags: x.tags.filter((tag) => tag !== t) } : x))
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {card.tags.length === 0 ? <span className="text-xs text-slate-400">Nenhuma tag neste cartão.</span> : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Escreve uma ou várias separadas por vírgula"
                      value={tagDraftByCard[idx] ?? ''}
                      onChange={(e) => setTagDraftByCard((d) => ({ ...d, [idx]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        const raw = (tagDraftByCard[idx] ?? '').trim()
                        if (!raw) return
                        const parts = raw
                          .split(/[,;]/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                        if (!parts.length) return
                        setSkillCards((c) =>
                          c.map((x, j) =>
                            j === idx
                              ? {
                                  ...x,
                                  tags: [...new Set([...x.tags, ...parts])].slice(0, 40),
                                }
                              : x
                          )
                        )
                        setTagDraftByCard((d) => ({ ...d, [idx]: '' }))
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-xl bg-violet-100 px-4 py-2.5 text-sm font-bold text-violet-900 ring-1 ring-violet-200 hover:bg-violet-200"
                      onClick={() => {
                        const raw = (tagDraftByCard[idx] ?? '').trim()
                        if (!raw) return
                        const parts = raw
                          .split(/[,;]/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                        if (!parts.length) return
                        setSkillCards((c) =>
                          c.map((x, j) =>
                            j === idx
                              ? {
                                  ...x,
                                  tags: [...new Set([...x.tags, ...parts])].slice(0, 40),
                                }
                              : x
                          )
                        )
                        setTagDraftByCard((d) => ({ ...d, [idx]: '' }))
                      }}
                    >
                      Adicionar tags
                    </button>
                  </div>
                </div>
              ))}
              {skillCards.length === 0 ? (
                <p className="text-sm text-slate-500">Ainda sem cartões. Usa o botão abaixo para criar o primeiro.</p>
              ) : null}
            </div>
            {skillCards.length < MAX_SKILL_CARDS ? (
              <button
                type="button"
                className="mt-6 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-sm font-bold text-violet-800 hover:bg-violet-100"
                onClick={() => setSkillCards((c) => [...c, { title: '', tags: [] }])}
              >
                + Adicionar cartão ({skillCards.length}/{MAX_SKILL_CARDS})
              </button>
            ) : null}
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar competências'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'projetos' ? (
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Projetos</h2>
            <p className="mt-1 text-sm text-slate-600">Podes criar vários — cada guardar adiciona ou atualiza um item.</p>
            <form onSubmit={saveProject} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="font-semibold text-violet-900">{editingProject ? 'Editar projeto' : 'Novo projeto'}</h3>
              <input
                type="text"
                required
                placeholder="Título *"
                className={inputClass}
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
              />
              <textarea
                placeholder="Descrição"
                className={`${inputClass} min-h-[88px]`}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Categoria"
                  className={inputClass}
                  value={projectForm.category}
                  onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                />
                <input
                  type="url"
                  placeholder="Link do projeto"
                  className={inputClass}
                  value={projectForm.project_url}
                  onChange={(e) => setProjectForm({ ...projectForm, project_url: e.target.value })}
                />
              </div>
              <input
                type="text"
                placeholder="Stack (React, Node, … separado por vírgula)"
                className={inputClass}
                value={projectForm.tech_stack}
                onChange={(e) => setProjectForm({ ...projectForm, tech_stack: e.target.value })}
              />
              <div>
                <label className={labelClass}>Imagem</label>
                <input
                  type="url"
                  placeholder="URL da imagem"
                  className={`${inputClass} mb-2`}
                  value={projectForm.image_url}
                  onChange={(e) => setProjectForm({ ...projectForm, image_url: e.target.value })}
                />
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
                <label htmlFor="project-image-upload" className="inline-flex cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                  Enviar ficheiro
                </label>
                {uploading === 'project' ? <span className="ml-2 text-xs text-slate-500">A enviar…</span> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                  Guardar projeto
                </button>
                {editingProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(null)
                      setProjectForm({ title: '', description: '', category: '', project_url: '', image_url: '', tech_stack: '' })
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </form>
            <ul className="mt-6 space-y-3">
              {projects.map((pr) => (
                <li key={pr.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{pr.title}</p>
                    {pr.category ? <p className="text-xs text-violet-700">{pr.category}</p> : null}
                    {pr.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{pr.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProject(pr)
                        setProjectForm({
                          title: pr.title,
                          description: pr.description || '',
                          category: pr.category || '',
                          project_url: pr.project_url || '',
                          image_url: pr.image_url || '',
                          tech_stack: (pr.tech_stack || []).join(', '),
                        })
                      }}
                      className="text-sm font-medium text-violet-700 hover:text-violet-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ kind: 'project', id: pr.id })}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
              {projects.length === 0 ? <p className="text-sm text-slate-500">Sem projetos. Cria o primeiro no formulário acima.</p> : null}
            </ul>
          </div>
        ) : null}

        {step === 'experiencia' ? (
          <div className={`${cardClass} sm:mb-8`}>
            <h2 className="text-lg font-bold text-slate-900">Experiência profissional</h2>
            <p className="mt-1 text-sm text-slate-600">Várias entradas: cada guardar adiciona ou atualiza um registo.</p>
            <form onSubmit={saveExperience} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="font-semibold text-violet-900">{editingExp ? 'Editar experiência' : 'Nova experiência'}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Cargo *</label>
                  <input
                    type="text"
                    required
                    className={inputClass}
                    value={expForm.role}
                    onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Empresa *</label>
                  <input
                    type="text"
                    required
                    className={inputClass}
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Início</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={expForm.start_date ? expForm.start_date.slice(0, 10) : ''}
                    onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fim</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={expForm.end_date ? expForm.end_date.slice(0, 10) : ''}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-slate-500">Vazio = ainda na função.</p>
                </div>
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                  className={`${inputClass} min-h-[88px]`}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                  Guardar experiência
                </button>
                {editingExp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExp(null)
                      setExpForm({ role: '', company: '', description: '', start_date: '', end_date: '' })
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </form>
            <ul className="mt-6 space-y-3">
              {experiences.map((ex) => (
                <li key={ex.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {ex.role} <span className="text-slate-400">·</span> {ex.company}
                      </p>
                      <p className="mt-1 text-xs text-violet-700">
                        {formatExpDate(ex.start_date)} — {ex.end_date ? formatExpDate(ex.end_date) : 'em curso'}
                      </p>
                      {ex.description ? <p className="mt-2 text-sm text-slate-600">{ex.description}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExp(ex)
                          setExpForm({
                            role: ex.role,
                            company: ex.company,
                            description: ex.description || '',
                            start_date: ex.start_date ? ex.start_date.slice(0, 10) : '',
                            end_date: ex.end_date ? ex.end_date.slice(0, 10) : '',
                          })
                        }}
                        className="text-sm font-medium text-violet-700 hover:text-violet-900"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'experience', id: ex.id })}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {experiences.length === 0 ? <p className="text-sm text-slate-500">Sem experiências. Adiciona acima.</p> : null}
            </ul>
          </div>
        ) : null}

        {step === 'formacao' ? (
          <form onSubmit={(e) => void handleSavePerfil(e, 'formacao')} className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Formação & certificações</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cartões na página pública <strong className="font-semibold text-slate-800">abaixo da experiência</strong>. Podes adicionar quantas entradas quiseres (instituição, curso, ano opcional).
            </p>
            <div className="mt-6 space-y-4">
              {educationEntries.map((row, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-800/90">Entrada {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setEducationEntries((list) => list.filter((_, i) => i !== index))}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Instituição</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={row.institution}
                        onChange={(e) => {
                          const v = e.target.value
                          setEducationEntries((list) => list.map((r, i) => (i === index ? { ...r, institution: v } : r)))
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Curso / certificação</label>
                      <textarea
                        className={`${inputClass} min-h-[72px] resize-y`}
                        value={row.course}
                        onChange={(e) => {
                          const v = e.target.value
                          setEducationEntries((list) => list.map((r, i) => (i === index ? { ...r, course: v } : r)))
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ano (opcional)</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Ex.: 2021"
                        value={row.year ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setEducationEntries((list) =>
                            list.map((r, i) => (i === index ? { ...r, year: v.trim() || null } : r))
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEducationEntries((list) => [...list, { institution: '', course: '', year: null }])}
                className="w-full rounded-xl border border-dashed border-violet-300 bg-violet-50/50 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
              >
                + Adicionar entrada
              </button>
            </div>
            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar formação'}
              </button>
            </div>
          </form>
        ) : null}

        {portfolio ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-red-900">Zona de perigo</h2>
            <p className="mt-1 max-w-2xl text-sm text-red-900/85">
              Remove o teu portfólio público na íntegra (dados na página <span className="font-mono">/u/…</span>, projetos,
              experiências e competências em lista). Depois podes voltar a preencher o passo <strong>Apresentação</strong> como se fosse a primeira vez.
            </p>
            <button
              type="button"
              onClick={() => setPortfolioWipeOpen(true)}
              className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-50"
            >
              Excluir portfólio e recomeçar
            </button>
          </div>
        ) : null}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {pendingDelete?.kind === 'project' ? 'Excluir este projeto?' : 'Excluir esta experiência?'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void executePendingDelete()}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={portfolioWipeOpen}
        onOpenChange={(open) => {
          setPortfolioWipeOpen(open)
          if (!open) setPortfolioWipePassword('')
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Excluir todo o portfólio?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Isto apaga a linha do portfólio, projetos, experiências e tags de competências (lista antiga). Os cartões de skills e formação guardados no perfil também deixam de existir. Não podes desfazer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void confirmWipePortfolio(e)} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="portfolio-wipe-password">
                Confirma com a tua palavra-passe
              </label>
              <input
                id="portfolio-wipe-password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={portfolioWipePassword}
                onChange={(e) => setPortfolioWipePassword(e.target.value)}
                placeholder="••••••••"
              />
              <p className="mt-2 text-xs text-slate-500">
                Só contas com login por email e palavra-passe. Se entraste só com Google/outro provedor, define uma palavra-passe em Segurança antes.
              </p>
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={() => setPortfolioWipeOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={portfolioWiping}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {portfolioWiping ? 'A remover…' : 'Excluir definitivamente'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
