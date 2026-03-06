'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    logo: '/projetos/tryly.png',
  },
  {
    title: 'YOP Devs',
    url: 'https://yopdevs.com.br',
    description: 'Rede de equity, fórum e projetos. Conecta empreendedores, desenvolvedores e investidores.',
    tag: 'Plataforma',
    logo: '/projetos/yopdevs.png',
  },
  {
    title: 'Fenix Gestora',
    url: 'https://fenixgestora.com.br',
    description: 'Sistema e site da Fenix Gestora — desenvolvimento e entrega.',
    tag: 'Sistema / Site',
    logo: '/projetos/fenix.png',
  },
  {
    title: 'Plify',
    url: '#',
    description: 'Empresa de SaaS com propostas comerciais, sistema de gestão completa e módulo financeiro.',
    tag: 'SaaS',
    logo: '/projetos/plify.png',
  },
  {
    title: 'Automações WhatsApp (Meta)',
    url: '#',
    description: 'Automações de envio de boletos integradas à API oficial do WhatsApp (Meta). Fluxos para cobrança e notificações.',
    tag: 'Automação',
    logo: null,
  },
  {
    title: 'Sistemas internos',
    url: '#',
    description: 'Automações e sistemas internos para empresas — processos, integrações e ferramentas sob medida.',
    tag: 'Automação',
    logo: null,
  },
  {
    title: 'Sport Club Westham',
    url: 'https://westham.vercel.app',
    description: 'Site oficial do Westham: FUT 7, Campo e Futsal, área do sócio, loja oficial, notícias e cronograma de jogos.',
    tag: 'Site institucional',
    logo: '/projetos/westham.ico',
  },
  {
    title: 'Cap. Cavaleiros do Guaporé nº 862',
    url: 'https://capitulo862.vercel.app',
    description: 'Site do Capítulo DeMolay — Ordem DeMolay, fraternidade, reverência e companheirismo. Informações, membros e secretaria.',
    tag: 'Site institucional',
    logo: '/projetos/capitulo.webp',
  },
]

const GABRIEL_STACKS = ['Next.js', 'Supabase', 'Node', 'Automação WhatsApp']

const GABRIEL_COUNTERS = [
  { value: '10+', label: 'projetos' },
  { value: '5', label: 'sistemas ativos' },
  { value: '3', label: 'empresas atendidas' },
]

type ShowcaseProject = (typeof SHOWCASE_PROJECTS_GABRIEL)[number]

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
      {/* Header fixo — mobile h-14, centralização e padding padronizados */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full h-14 md:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center overflow-hidden">
        <div className="max-w-6xl mx-auto w-full h-full px-4 md:px-6 flex items-center justify-between">
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
      <section className="pt-20 md:pt-24 pb-12 md:pb-16 px-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-xl overflow-hidden border border-slate-200/80 shadow-lg bg-slate-200 flex items-center justify-center aspect-square">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover"
                  priority
                  sizes="(max-width: 768px) 200px, 300px"
                  unoptimized
                />
              ) : (
                <span className="text-5xl sm:text-6xl md:text-8xl font-black text-slate-400 uppercase">
                  {profile.full_name?.[0] || '?'}
                </span>
              )}
            </div>
          </div>
          <div className="text-center md:text-left max-w-2xl md:max-w-none">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 mb-2">
              Portfolio · YOP Devs
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-3">
              {profile.full_name}
            </h1>
            <p className="text-base md:text-lg text-slate-600 font-medium mb-3 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="inline-block px-3 py-1 bg-slate-800 text-white text-sm font-bold uppercase rounded-lg tracking-wider">
                {displayRole}
              </span>
              {fenixRole && (
                <span className="inline-block px-3 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded-lg tracking-wider border border-violet-200">
                  {fenixRole}
                </span>
              )}
            </p>
            {(profile.location || profile.availability_status || contactPhone) && (
              <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
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
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                href="/"
                className="px-6 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm transition-all hover:bg-violet-800 hover:scale-105 hover:shadow-md w-full sm:w-auto text-center"
              >
                Conectar na rede YOP
              </Link>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:scale-105 hover:shadow-md w-full sm:w-auto text-center"
                >
                  Instagram
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:scale-105 hover:shadow-md w-full sm:w-auto text-center"
                >
                  LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:scale-105 hover:shadow-md w-full sm:w-auto text-center"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contadores (Gabriel) */}
      {slug === 'gabriel-costa-carrara' && (
        <section className="py-10 md:py-12 px-4 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
              {GABRIEL_COUNTERS.map((c) => (
                <div key={c.label} className="flex flex-col items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-black text-[#4c1d95] tabular-nums">{c.value}</span>
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider mt-1">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sobre */}
      <section id="sobre" className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 text-center md:text-left">
            Sobre
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 text-center md:text-left">
            Tese profissional
          </h3>
          <p className="text-gray-600 text-base leading-relaxed max-w-3xl mx-auto text-center md:text-left">
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

      {/* Especialidades / Competências */}
      {specialties.length > 0 && (
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 text-center md:text-left">
              Especialidades
            </h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 text-center md:text-left">
              Competências e foco
            </h3>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {specialties.map((spec) => (
                <span
                  key={spec}
                  className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stacks (Gabriel) */}
      {slug === 'gabriel-costa-carrara' && (
        <section className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 text-center md:text-left">
              Tech
            </h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 text-center md:text-left">
              Stacks
            </h3>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {GABRIEL_STACKS.map((stack) => (
                <span
                  key={stack}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-medium text-sm border border-slate-200"
                >
                  {stack}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Apps e sistemas desenvolvidos (Gabriel Costa Carrara) */}
      {slug === 'gabriel-costa-carrara' && (
        <section id="projetos" className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 text-center md:text-left">
              Portfolio
            </h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 text-center md:text-left">
              Apps e sistemas desenvolvidos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SHOWCASE_PROJECTS_GABRIEL.map((item: ShowcaseProject) => {
                const logo = item.logo ?? null
                const CardContent = () => (
                  <>
                    {logo && (
                      <div className="mb-4 w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {logo.endsWith('.ico') ? (
                          <img src={logo} alt="" className="w-9 h-9 object-contain" />
                        ) : (
                          <Image src={logo} alt="" width={56} height={56} className="w-9 h-9 object-contain" />
                        )}
                      </div>
                    )}
                    <span className="text-xs uppercase tracking-wider text-purple-600 font-semibold mb-2 block">
                      {item.tag}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-violet-700 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>
                    {item.url !== '#' && (
                      <span className="text-sm font-medium text-purple-600 hover:underline">
                        Acessar →
                      </span>
                    )}
                  </>
                )
                return item.url !== '#' ? (
                  <a
                    key={item.title}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
                  >
                    <CardContent />
                  </a>
                ) : (
                  <div
                    key={item.title}
                    className="bg-white border border-slate-200 rounded-xl p-6"
                  >
                    <CardContent />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Projetos na rede YOP */}
      <section id={slug === 'gabriel-costa-carrara' ? 'projetos-rede' : 'projetos'} className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 text-center md:text-left">
            Ativos na rede
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 text-center md:text-left">
            Projetos na rede YOP
          </h3>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  {p.category && (
                    <span className="text-xs uppercase tracking-wider text-purple-600 font-semibold mb-2 block">
                      {p.category}
                    </span>
                  )}
                  <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                    {p.title}
                  </h4>
                  {p.description && (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
                      {p.description}
                    </p>
                  )}
                  <Link
                    href="/"
                    className="text-sm font-medium text-purple-600 hover:underline"
                  >
                    Ver na rede YOP →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto py-12 px-6 border border-slate-200 rounded-xl bg-white shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold mb-1">
                Nenhum projeto publicado ainda
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Entre na rede YOP Devs para publicar projetos
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm hover:bg-violet-800 hover:scale-105 hover:shadow-md transition-all"
              >
                Entrar na rede
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
            Contato
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4">
            Vamos conectar?
          </h3>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
            Entre na rede YOP Devs para ver projetos, participar do fórum e falar diretamente com {profile.full_name.split(' ')[0]}.
          </p>
          {contactPhone && (
            <p className="mb-6">
              <a href={contactTelHref} className="inline-flex items-center gap-2 text-lg font-bold text-slate-800 hover:text-violet-600 transition-colors">
                <span className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </span>
                {contactPhone}
              </a>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 hover:scale-105 hover:shadow-md transition-all w-full sm:w-auto"
              >
                Instagram
              </a>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 hover:scale-105 hover:shadow-md transition-all w-full sm:w-auto"
              >
                Site
              </a>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 hover:scale-105 hover:shadow-md transition-all w-full sm:w-auto"
              >
                GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 hover:scale-105 hover:shadow-md transition-all w-full sm:w-auto"
              >
                LinkedIn
              </a>
            )}
          </div>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#4c1d95] text-white rounded-lg font-medium text-sm hover:bg-violet-800 hover:scale-105 hover:shadow-md transition-all"
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
