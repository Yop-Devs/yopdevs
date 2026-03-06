'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'

type Portfolio = {
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
}

type Project = {
  id: string
  title: string
  description: string | null
  category: string | null
  project_url: string | null
  image_url: string | null
  tech_stack: string[]
}

type Experience = {
  id: string
  role: string
  company: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

export default function PublicPortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const [username, setUsername] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setUsername(p.username))
  }, [params])

  useEffect(() => {
    const slug = username
    if (!slug) return
    async function load() {
      try {
        const res = await fetch(`/api/u/${encodeURIComponent(String(slug))}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Portfólio não encontrado')
          setPortfolio(null)
          return
        }
        setPortfolio(data.portfolio)
        setSkills(data.skills ?? [])
        setProjects(data.projects ?? [])
        setExperiences(data.experiences ?? [])
        setError(null)
      } catch {
        setError('Erro ao carregar portfólio')
        setPortfolio(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 font-semibold text-sm uppercase tracking-widest animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <Link href="/" className="mb-6">
          <Logo variant="dark" size="lg" />
        </Link>
        <p className="text-slate-600 font-medium text-center max-w-md">{error || 'Portfólio não encontrado.'}</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const displayName = portfolio.display_name || portfolio.headline || portfolio.username

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="fixed top-0 left-0 right-0 z-50 w-full h-14 md:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center">
          <div className="max-w-6xl mx-auto w-full h-full px-4 md:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#4c1d95] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <Logo variant="dark" size="sm" />
            </Link>
            <Link href="/" className="px-4 py-2.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all">
              Entrar na rede
            </Link>
          </div>
        </header>

        {/* Hero */}
        {portfolio.banner_url && (
          <div className="pt-14 md:pt-16 h-32 md:h-40 relative bg-slate-200">
            <Image src={portfolio.banner_url} alt="" fill className="object-cover" unoptimized sizes="100vw" />
          </div>
        )}
        <section className={`px-4 ${portfolio.banner_url ? '-mt-16 md:-mt-20' : 'pt-20 md:pt-24'} pb-12 md:pb-16`}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row md:items-end gap-8">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                {portfolio.avatar_url ? (
                  <img src={portfolio.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black text-slate-400 uppercase">{displayName?.[0] || '?'}</span>
                )}
              </div>
            </div>
            <div className="text-center md:text-left pb-2">
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{displayName}</h1>
              {portfolio.headline && <p className="text-slate-600 font-medium mt-1">{portfolio.headline}</p>}
              {portfolio.location && <p className="text-sm text-slate-500 mt-2">📍 {portfolio.location}</p>}
              {portfolio.available_for_work && (
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Disponível para trabalho</span>
              )}
              <div className="mt-4">
                <Link href="/" className="inline-block px-6 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm hover:bg-violet-800 transition-all">
                  Conectar na rede YOP
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        {portfolio.bio && (
          <section id="sobre" className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sobre</h2>
              <p className="text-gray-600 leading-relaxed max-w-3xl">{portfolio.bio}</p>
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section className="py-12 md:py-16 px-4">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Projects */}
        <section id="projetos" className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Portfólio</h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">Projetos</h3>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((pr) => (
                  <div key={pr.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
                    {pr.image_url && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 mb-4">
                        <img src={pr.image_url} alt={pr.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {pr.category && <span className="text-xs uppercase tracking-wider text-purple-600 font-semibold">{pr.category}</span>}
                    <h4 className="text-lg font-bold text-slate-900 mt-2">{pr.title}</h4>
                    {pr.description && <p className="text-gray-600 text-sm mt-1 line-clamp-3">{pr.description}</p>}
                    {pr.project_url && (
                      <a href={pr.project_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm font-medium text-purple-600 hover:underline">
                        Acessar →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum projeto publicado.</p>
            )}
          </div>
        </section>

        {/* Experience */}
        {experiences.length > 0 && (
          <section id="experiencia" className="py-12 md:py-16 px-4">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Experiência</h2>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">Experiência</h3>
              <div className="space-y-6">
                {experiences.map((ex) => (
                  <div key={ex.id} className="relative pl-6 border-l-2 border-slate-200">
                    <div className="absolute left-0 top-0 w-3 h-3 -translate-x-[7px] rounded-full bg-[#4c1d95]" />
                    <p className="font-bold text-slate-900">{ex.role} · {ex.company}</p>
                    <p className="text-xs text-slate-500">
                      {ex.start_date ? new Date(ex.start_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '?'}
                      {' – '}
                      {ex.end_date ? new Date(ex.end_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Atual'}
                    </p>
                    {ex.description && <p className="text-sm text-slate-600 mt-2">{ex.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact */}
        <section id="contato" className="py-12 md:py-16 px-4 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contato</h2>
            <h3 className="text-xl font-black text-slate-900 mb-4">Conectar</h3>
            {portfolio.phone && (
              <p className="mb-4">
                <a href={`tel:${portfolio.phone.replace(/\D/g, '')}`} className="text-lg font-bold text-slate-800 hover:text-violet-600">
                  📞 {portfolio.phone}
                </a>
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {portfolio.website && (
                <a href={portfolio.website} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700">
                  Site
                </a>
              )}
              {portfolio.instagram && (
                <a href={portfolio.instagram.startsWith('http') ? portfolio.instagram : `https://instagram.com/${portfolio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700">
                  Instagram
                </a>
              )}
              {portfolio.github && (
                <a href={portfolio.github} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700">
                  GitHub
                </a>
              )}
              {portfolio.linkedin && (
                <a href={portfolio.linkedin} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700">
                  LinkedIn
                </a>
              )}
            </div>
            <Link href="/" className="inline-block mt-6 px-8 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm hover:bg-violet-800">
              Entrar na rede YOP Devs
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-slate-800 text-slate-200 py-6 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <Logo variant="light" size="sm" />
            </Link>
            <p className="text-sm text-slate-400">Portfólio de {displayName} · YOP Devs</p>
            <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">Voltar ao início</Link>
          </div>
        </footer>
      </div>
  )
}
