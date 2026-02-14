'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

type Profile = {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  github_url: string | null
  linkedin_url: string | null
  website_url: string | null
  location: string | null
  specialties: string | null
  availability_status: string | null
  role: string | null
}

type Project = {
  id: string
  title: string
  category: string | null
  description: string | null
  created_at: string
}

// Projetos desenvolvidos (portfolio Gabriel Costa Carrara)
const SHOWCASE_PROJECTS_GABRIEL = [
  {
    title: 'TrylyApp',
    url: 'https://tryly.com.br',
    description: 'Aplicativo e plataforma Tryly — solução desenvolvida e em operação.',
    tag: 'App / Plataforma',
  },
  {
    title: 'YOP Devs',
    url: 'https://yopdevs.com.br',
    description: 'Rede de equity, fórum e projetos. Conecta empreendedores, desenvolvedores e investidores.',
    tag: 'Plataforma',
  },
  {
    title: 'Fenix Gestora',
    url: 'https://fenixgestora.com.br',
    description: 'Sistema e site da Fenix Gestora — desenvolvimento e entrega.',
    tag: 'Sistema / Site',
  },
  {
    title: 'Automações WhatsApp (Meta)',
    url: '#',
    description: 'Automações de envio de boletos integradas à API oficial do WhatsApp (Meta). Fluxos para cobrança e notificações.',
    tag: 'Automação',
  },
  {
    title: 'Sistemas internos',
    url: '#',
    description: 'Automações e sistemas internos para empresas — processos, integrações e ferramentas sob medida.',
    tag: 'Automação',
  },
  {
    title: 'Sport Club Westham',
    url: 'https://westham.vercel.app',
    description: 'Site oficial do Westham: FUT 7, Campo e Futsal, área do sócio, loja oficial, notícias e cronograma de jogos.',
    tag: 'Site institucional',
  },
  {
    title: 'Cap. Cavaleiros do Guaporé nº 862',
    url: 'https://capitulo862.vercel.app',
    description: 'Site do Capítulo DeMolay — Ordem DeMolay, fraternidade, reverência e companheirismo. Informações, membros e secretaria.',
    tag: 'Site institucional',
  },
]

export default function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [slug, setSlug] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (document && profile) {
      document.title = `${profile.full_name} | Portfolio · YOP Devs`
    }
  }, [profile])

  useEffect(() => {
    if (!slug) return
    const slugStr: string = slug
    async function load() {
      try {
        const res = await fetch(`/api/portfolio/${encodeURIComponent(slugStr)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Perfil não encontrado')
          setProfile(null)
          setProjects([])
          return
        }
        setProfile(data.profile)
        setProjects(data.projects || [])
        setError(null)
      } catch {
        setError('Erro ao carregar portfolio')
        setProfile(null)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 font-semibold text-sm uppercase tracking-widest animate-pulse">
          Carregando portfolio...
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <Link href="/" className="mb-6">
          <Logo variant="dark" size="lg" />
        </Link>
        <p className="text-slate-600 font-medium text-center max-w-md">
          {error || 'Este portfolio não está disponível.'}
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-700 transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    )
  }

  const specialties = profile.specialties
    ? profile.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const isGabriel = slug === 'gabriel-costa-carrara'
  const displayRole = isGabriel && (profile.role === 'MEMBER' || !profile.role) ? 'CEO' : (profile.role || 'Membro da rede YOP Devs')
  const fenixRole = isGabriel ? 'Diretor Administrativo · Fênix Consórcios' : null
  const instagramUrl = isGabriel ? 'https://instagram.com/gabriel.carrara_' : null
  const contactPhone = isGabriel ? '65 9 9226-3485' : null
  const contactTelHref = isGabriel ? 'tel:+5565992263485' : '#'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4c1d95] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Logo variant="dark" size="sm" />
          </Link>
          <nav className="flex items-center gap-4">
            <a href="#sobre" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">
              Sobre
            </a>
            <a href="#projetos" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">
              Projetos
            </a>
            <a href="#contato" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">
              Contato
            </a>
            {slug && (
              <Link
                href={`/cv/${slug}`}
                className="text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                title="Resume in English"
              >
                EN
              </Link>
            )}
            <Link
              href="/"
              className="px-4 py-2.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all"
            >
              Entrar na rede
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 md:pt-24 pb-10 md:pb-14 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-slate-200 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl md:text-8xl font-black text-slate-400 uppercase">
                  {profile.full_name?.[0] || '?'}
                </span>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 mb-2">
              Portfolio · YOP Devs
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-3">
              {profile.full_name}
            </h1>
            <p className="text-base md:text-lg text-slate-600 font-medium max-w-xl mb-3">
              <span className="inline-block px-3 py-1 bg-slate-800 text-white text-sm font-bold uppercase rounded-lg tracking-wider">
                {displayRole}
              </span>
              {fenixRole && (
                <span className="inline-block ml-2 px-3 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded-lg tracking-wider border border-violet-200">
                  {fenixRole}
                </span>
              )}
            </p>
            {(profile.location || profile.availability_status || contactPhone) && (
              <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                {profile.location && <span>📍 {profile.location}</span>}
                {contactPhone && (
                  <a href={contactTelHref} className="hover:text-violet-600 transition-colors">📞 {contactPhone}</a>
                )}
                {profile.availability_status && (
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-black">
                    {profile.availability_status}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Link
                href="/"
                className="px-6 py-3 bg-[#4c1d95] text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-violet-800 transition-all shadow-md"
              >
                Conectar na rede YOP
              </Link>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all"
                >
                  Instagram
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all"
                >
                  LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-10 md:py-14 px-4 md:px-6 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
            Sobre
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4">
            Tese profissional
          </h3>
          <p className="text-slate-600 text-base leading-relaxed font-medium">
            {profile.bio || (
              <span className="italic text-slate-500">
                {isGabriel
                  ? `${profile.full_name} é CEO e Diretor Administrativo da Fênix Consórcios. Faz parte da rede YOP Devs — ecossistema que conecta empreendedores, desenvolvedores e investidores.`
                  : `${profile.full_name} faz parte da rede YOP Devs — ecossistema que conecta empreendedores, desenvolvedores e investidores. Perfil em construção.`}
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Especialidades */}
      {specialties.length > 0 && (
        <section className="py-10 md:py-14 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Especialidades
            </h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-5">
              Competências e foco
            </h3>
            <div className="flex flex-wrap gap-3">
              {specialties.map((spec) => (
                <span
                  key={spec}
                  className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider hover:border-violet-300 hover:text-violet-700 transition-all"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Apps e sistemas desenvolvidos (Gabriel Costa Carrara) */}
      {slug === 'gabriel-costa-carrara' && (
        <section id="projetos" className="py-10 md:py-14 px-4 md:px-6 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Portfolio
            </h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">
              Apps e sistemas desenvolvidos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SHOWCASE_PROJECTS_GABRIEL.map((item) => (
                item.url !== '#' ? (
                  <a
                    key={item.title}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-100 border-2 border-slate-200 rounded-2xl p-8 hover:border-violet-300 hover:shadow-lg transition-all group"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-3 block">
                      {item.tag}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-violet-700 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>
                    <span className="text-sm font-bold text-[#4c1d95] uppercase tracking-wider">
                      Acessar →
                    </span>
                  </a>
                ) : (
                  <div
                    key={item.title}
                    className="bg-slate-100 border-2 border-slate-200 rounded-xl p-6"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-3 block">
                      {item.tag}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 mb-3 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projetos na rede YOP */}
      <section id={slug === 'gabriel-costa-carrara' ? 'projetos-rede' : 'projetos'} className="py-10 md:py-14 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
            Ativos na rede
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">
            Projetos na rede YOP
          </h3>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-8 hover:border-violet-200 hover:shadow-lg transition-all"
                >
                  {p.category && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-3 block">
                      {p.category}
                    </span>
                  )}
                  <h4 className="text-xl font-black text-slate-900 mb-3 leading-tight">
                    {p.title}
                  </h4>
                  {p.description && (
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-6">
                      {p.description}
                    </p>
                  )}
                  <Link
                    href="/"
                    className="text-sm font-bold text-[#4c1d95] hover:underline uppercase tracking-wider"
                  >
                    Ver na rede YOP →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-slate-500 font-medium">
                Nenhum projeto publicado na rede ainda.
              </p>
              <Link href="/" className="inline-block mt-4 text-sm font-bold text-violet-600 hover:underline">
                Conheça a rede YOP Devs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-10 md:py-14 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
            Contato
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4">
            Vamos conectar?
          </h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            Entre na rede YOP Devs para ver projetos, participar do fórum e falar diretamente com {profile.full_name.split(' ')[0]}.
          </p>
          {contactPhone && (
            <p className="mb-5">
              <a href={contactTelHref} className="text-lg font-bold text-slate-800 hover:text-violet-600 transition-colors">
                📞 {contactPhone}
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all"
              >
                Instagram
              </a>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all"
              >
                GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all"
              >
                LinkedIn
              </a>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all"
              >
                Site
              </a>
            )}
          </div>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#4c1d95] text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-violet-800 transition-all shadow-md"
          >
            Entrar na rede YOP Devs
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-800 text-slate-200 py-6 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Logo variant="light" size="sm" />
          </Link>
          <p className="text-sm text-slate-400">
            Portfolio de <strong className="text-white">{profile.full_name}</strong> · Integrado à rede YOP Devs
          </p>
          <div className="flex items-center gap-4">
            {slug && (
              <Link
                href={`/cv/${slug}`}
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                title="Resume in English"
              >
                English version
              </Link>
            )}
            <Link
              href="/"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
