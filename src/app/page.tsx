'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Space_Grotesk, JetBrains_Mono, Wallpoet } from 'next/font/google'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/allowed-emails'
import {
  FEATURED_PROJECTS,
  SERVICES,
  TECH_STACK,
  type FeaturedProject,
} from '@/lib/featured-projects'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-yop-display',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-yop-mono',
})

const wallpoet = Wallpoet({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-yop-brand',
})

type AuthMode = 'login' | 'reset'

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`yop-brand ${wallpoet.className} ${className}`} aria-label="YOP Devs">
      <span className="yop-brand-text" aria-hidden>
        YOP Devs
      </span>
    </span>
  )
}

function ServiceIcon({ name, className = 'h-5 w-5 shrink-0 text-violet-200' }: { name: string; className?: string }) {
  const cls = className
  switch (name) {
    case 'globe':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9s-1.5-6.5-4-9m0 18c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9m-7.5 9h15" />
        </svg>
      )
    case 'code':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 9l-3 3 3 3m8-6l3 3-3 3M13 5l-2 14" />
        </svg>
      )
    case 'mobile':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 18h.01M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      )
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
  }
}

function CircuitDecor() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden>
      <defs>
        <linearGradient id="yop-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M40 720 H280 L340 660 H520" stroke="url(#yop-line)" strokeWidth="1.5" fill="none" />
      <circle cx="280" cy="720" r="4" fill="#fff" fillOpacity="0.7" />
      <circle cx="340" cy="660" r="4" fill="#fff" fillOpacity="0.7" />
      <path d="M1480 180 H1680 L1740 240 H1880" stroke="url(#yop-line)" strokeWidth="1.5" fill="none" />
      <circle cx="1680" cy="180" r="4" fill="#fff" fillOpacity="0.7" />
      <circle cx="1740" cy="240" r="4" fill="#fff" fillOpacity="0.7" />
      <path d="M80 120 H180 L220 160" stroke="url(#yop-line)" strokeWidth="1.2" fill="none" />
      <circle cx="180" cy="120" r="3.5" fill="#fff" fillOpacity="0.55" />
    </svg>
  )
}

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'Descoberta',
    text: 'Mapeamos processos, regras de negócio e o resultado que precisa existir em produção.',
  },
  {
    n: '02',
    title: 'Construção',
    text: 'Desenvolvemos com arquitetura limpa, segurança, performance e UX orientada a operação.',
  },
  {
    n: '03',
    title: 'Entrega e evolução',
    text: 'Publicamos, treinamos o time e evoluímos com métricas reais de uso.',
  },
] as const

function LandingPageContent() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({})
  const [heroReady, setHeroReady] = useState(false)
  const [logoIndex, setLogoIndex] = useState(0)
  const [serviceIndex, setServiceIndex] = useState(0)
  const [servicePaused, setServicePaused] = useState(false)
  const [lightbox, setLightbox] = useState<FeaturedProject | null>(null)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const closeModal = useCallback(() => {
    setShowModal(false)
    setMessage(null)
  }, [])

  function getAuthErrorMessage(err: unknown): string {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    if (msg.includes('invalid login') || msg.includes('invalid credentials'))
      return 'E-mail ou senha incorretos. Tente novamente.'
    if (msg.includes('email not confirmed') || msg.includes('confirm your email'))
      return 'Confirme seu e-mail antes de entrar.'
    if (msg.includes('invalid email') || msg.includes('valid email'))
      return 'Informe um e-mail válido.'
    if (msg.includes('password') && (msg.includes('6') || msg.includes('least')))
      return 'A senha deve ter no mínimo 6 caracteres.'
    return err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.'
  }

  useEffect(() => {
    const t = requestAnimationFrame(() => setHeroReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    if (FEATURED_PROJECTS.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setLogoIndex((i) => (i + 1) % FEATURED_PROJECTS.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (servicePaused || SERVICES.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setServiceIndex((i) => (i + 1) % SERVICES.length)
    }, 4200)
    return () => window.clearInterval(id)
  }, [servicePaused])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'auth-code-error') {
      setShowModal(true)
      setMode('login')
      setMessage({ type: 'error', text: 'Falha na autenticação. Tente novamente.' })
    } else if (err === 'unauthorized') {
      setShowModal(true)
      setMode('login')
      setMessage({ type: 'error', text: 'Acesso restrito. Esta conta não está autorizada.' })
    }
  }, [searchParams])

  useEffect(() => {
    async function redirectIfLoggedIn() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email && isEmailAllowed(session.user.email)) {
        window.location.href = '/dashboard/portfolio'
      }
    }
    redirectIfLoggedIn()
  }, [])

  useEffect(() => {
    const nodes = document.querySelectorAll('.yop-reveal')
    if (!nodes.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const openLightbox = (project: FeaturedProject) => {
    setLightbox(project)
    setGalleryIndex(0)
  }

  const galleryImages = lightbox
    ? (('gallery' in lightbox && lightbox.gallery?.length)
        ? [...lightbox.gallery]
        : [lightbox.print])
    : []

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        if (error) {
          setMessage({ type: 'error', text: getAuthErrorMessage(error) })
        } else {
          setMessage({ type: 'success', text: 'Se o e-mail existir, enviamos um link de redefinição.' })
        }
        setLoading(false)
        return
      }

      if (!isEmailAllowed(email)) {
        setMessage({ type: 'error', text: 'Acesso restrito. Esta conta não está autorizada.' })
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: 'error', text: getAuthErrorMessage(error) })
        setLoading(false)
        return
      }

      if (!isEmailAllowed(data.session?.user?.email)) {
        await supabase.auth.signOut()
        setMessage({ type: 'error', text: 'Acesso restrito. Esta conta não está autorizada.' })
        setLoading(false)
        return
      }

      window.location.href = '/dashboard/portfolio'
    } catch (err) {
      setMessage({ type: 'error', text: getAuthErrorMessage(err) })
      setLoading(false)
    }
  }

  const openLogin = () => {
    setMode('login')
    setMessage(null)
    setShowModal(true)
  }

  return (
    <div
      className={`${spaceGrotesk.variable} ${jetbrains.variable} ${wallpoet.variable} ${spaceGrotesk.className} relative min-h-screen text-white selection:bg-violet-400/30`}
      style={{
        background: 'linear-gradient(165deg, #071338 0%, #1b0f4d 38%, #0a1845 72%, #071338 100%)',
      }}
    >
      {/* Fundo contínuo da página — mesma atmosfera em todas as secções */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 45% at 30% 12%, rgba(124,58,237,0.38), transparent 58%),
              radial-gradient(ellipse 50% 40% at 88% 8%, rgba(59,130,246,0.22), transparent 52%),
              radial-gradient(ellipse 55% 35% at 70% 48%, rgba(99,102,241,0.18), transparent 55%),
              radial-gradient(ellipse 50% 40% at 20% 78%, rgba(124,58,237,0.16), transparent 55%),
              radial-gradient(ellipse 45% 30% at 85% 88%, rgba(59,130,246,0.14), transparent 50%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1.2px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* HERO */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[120px] yop-glow-soft" aria-hidden />
        <div className="pointer-events-none absolute -right-10 top-10 h-80 w-80 rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-24 h-[28rem] w-[28rem] rounded-full border border-white/5" aria-hidden />
        <CircuitDecor />

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="group relative inline-flex items-center">
            <BrandMark className="text-[1.7rem] leading-none tracking-[0.08em] text-white sm:text-[2rem]" />
            <span className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg bg-violet-400/0 blur-md transition group-hover:bg-violet-400/15" aria-hidden />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#servicos" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white md:inline">Serviços</a>
            <a href="#projetos" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white sm:inline">Projetos</a>
            <a href="#tecnologias" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white lg:inline">Tecnologias</a>
            <Link href="/gabriel-portfolio-completo" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white sm:inline">CEO</Link>
            <button
              type="button"
              onClick={openLogin}
              className="ml-1 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Login
            </button>
          </nav>
        </header>

        <div
          className={`relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-14 ${
            heroReady ? 'yop-rise opacity-100' : 'opacity-0'
          }`}
        >
          <div>
            <p className={`${jetbrains.className} mb-4 text-[11px] uppercase tracking-[0.32em] text-violet-200/80`}>
              Empresa de desenvolvimento
            </p>

            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
              Tecnologia que transforma ideias em sistemas
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              SaaS, painéis, apps e automações em produção — com padrão corporativo de TI.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#projetos"
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#1a0f4a] shadow-[0_10px_40px_rgba(255,255,255,0.18)] transition hover:scale-[1.02]"
              >
                Ver projetos
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0f4a] text-white transition group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="#contato"
                className="inline-flex items-center rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Falar conosco
              </a>
            </div>

            <div className={`${jetbrains.className} mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.22em] text-white/45`}>
              <span>Mais de 25 projetos entregues</span>
              <span>Full stack</span>
              <span>Entrega ponta a ponta</span>
            </div>
          </div>

          {/* Circular logos showcase — one at a time */}
          <div className="relative mx-auto flex h-[20rem] w-full max-w-md items-center justify-center sm:h-[22rem] lg:h-[24rem] lg:max-w-lg">
            <div className="yop-orbit absolute h-[92%] w-[92%] rounded-full border border-white/15" />
            <div className="yop-orbit-reverse absolute h-[74%] w-[74%] rounded-full border border-white/10" />
            <div className="absolute inset-[14%] overflow-hidden rounded-full border border-white/25 bg-[#070d24]/90 shadow-[0_0_70px_rgba(124,58,237,0.32)] backdrop-blur-sm transition hover:shadow-[0_0_90px_rgba(167,139,250,0.42)]">
              {(() => {
                const project = FEATURED_PROJECTS[logoIndex] ?? FEATURED_PROJECTS[0]
                return (
                  <a
                    key={project.key}
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={project.name}
                    className="yop-logo-slide absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 sm:px-10"
                  >
                    {!imgFailed[`logo-${project.key}`] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.logo}
                        alt={project.name}
                        className="max-h-16 w-auto max-w-[80%] object-contain sm:max-h-20"
                        onError={() => setImgFailed((prev) => ({ ...prev, [`logo-${project.key}`]: true }))}
                      />
                    ) : (
                      <span className={`${jetbrains.className} text-center text-base font-medium uppercase tracking-[0.16em] text-white/85`}>
                        {project.short}
                      </span>
                    )}
                    <span className={`${jetbrains.className} text-[10px] uppercase tracking-[0.18em] text-white/40`}>
                      {project.tag}
                    </span>
                  </a>
                )
              })()}
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
                {FEATURED_PROJECTS.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-label={`Ver logo ${p.name}`}
                    aria-current={i === logoIndex ? 'true' : undefined}
                    onClick={() => setLogoIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === logoIndex ? 'w-4 bg-violet-300' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className={`${jetbrains.className} absolute -bottom-1 rounded-full border border-white/20 bg-[#120a38]/80 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur`}>
              Alguns projetos já desenvolvidos
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicos" className="relative overflow-hidden py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal max-w-2xl">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Serviços</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Soluções de TI para o seu negócio</h2>
            <p className="mt-3 text-sm text-white/65 sm:text-base">
              Do site institucional ao sistema empresarial completo — com entrega ponta a ponta.
            </p>
          </div>

          <div
            className="yop-reveal yop-reveal-delay-1 mt-12 grid items-stretch gap-5 lg:grid-cols-2"
            onMouseEnter={() => setServicePaused(true)}
            onMouseLeave={() => setServicePaused(false)}
          >
            {(() => {
              const active = SERVICES[serviceIndex] ?? SERVICES[0]
              const accentRing =
                active.accent === 'cyan'
                  ? 'from-cyan-300/40 via-blue-400/20 to-transparent'
                  : active.accent === 'fuchsia'
                    ? 'from-fuchsia-300/40 via-violet-400/20 to-transparent'
                    : active.accent === 'amber'
                      ? 'from-amber-300/40 via-orange-400/20 to-transparent'
                      : 'from-violet-300/40 via-indigo-400/20 to-transparent'
              const accentGlow =
                active.accent === 'cyan'
                  ? 'shadow-[0_0_80px_rgba(34,211,238,0.22)]'
                  : active.accent === 'fuchsia'
                    ? 'shadow-[0_0_80px_rgba(232,121,249,0.22)]'
                    : active.accent === 'amber'
                      ? 'shadow-[0_0_80px_rgba(251,191,36,0.2)]'
                      : 'shadow-[0_0_80px_rgba(167,139,250,0.25)]'
              return (
                <div
                  key={active.label}
                  className={`yop-service-spotlight relative h-full overflow-hidden rounded-[2rem] border border-white/20 bg-[#0b1538]/80 p-7 backdrop-blur-md sm:p-9 ${accentGlow}`}
                >
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gradient-to-br ${accentRing} blur-2xl`} aria-hidden />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="yop-service-icon-wrap relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white">
                      <span className="yop-service-icon-ring absolute inset-0 rounded-2xl" aria-hidden />
                      <ServiceIcon name={active.icon} className="h-7 w-7 shrink-0 text-white" />
                    </div>
                    <span className={`${jetbrains.className} rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-100/80`}>
                      0{serviceIndex + 1} / 0{SERVICES.length}
                    </span>
                  </div>
                  <h3 className="relative mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">{active.label}</h3>
                  <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
                    {active.detail}
                  </p>
                  <ul className="relative mt-6 space-y-2.5">
                    {active.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-white/75">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contato"
                    className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1a0f4a] transition hover:scale-[1.02] hover:bg-violet-100"
                  >
                    Quero este serviço
                    <span aria-hidden>→</span>
                  </a>
                </div>
              )
            })()}

            <div className="flex h-full flex-col justify-between gap-3">
              {SERVICES.map((s, i) => {
                const isActive = i === serviceIndex
                return (
                  <button
                    key={s.label}
                    type="button"
                    onMouseEnter={() => setServiceIndex(i)}
                    onFocus={() => setServiceIndex(i)}
                    onClick={() => {
                      setServiceIndex(i)
                      setServicePaused(true)
                    }}
                    className={`group flex w-full flex-1 items-start gap-4 rounded-2xl border p-4 text-left transition duration-300 sm:p-5 ${
                      isActive
                        ? 'border-violet-300/50 bg-white/12 shadow-[0_12px_40px_rgba(124,58,237,0.2)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                        isActive
                          ? 'border-violet-300/40 bg-violet-400/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 group-hover:text-white'
                      }`}
                    >
                      <ServiceIcon name={s.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{s.label}</span>
                        <span className={`${jetbrains.className} text-[10px] text-white/35`}>0{i + 1}</span>
                      </span>
                      <span className={`mt-1 block text-sm leading-snug transition ${isActive ? 'text-white/65' : 'text-white/45'}`}>
                        {s.description}
                      </span>
                      {isActive && (
                        <span className="mt-3 block h-0.5 overflow-hidden rounded-full bg-white/10">
                          <span className={`yop-service-progress block h-full origin-left rounded-full bg-gradient-to-r from-violet-300 to-cyan-300 ${servicePaused ? 'scale-x-100' : ''}`} />
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projetos" className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.14),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="yop-reveal">
              <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Portfólio</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Projetos em produção</h2>
              <p className="mt-3 max-w-lg text-sm text-white/65 sm:text-base">
                Cases reais entregues para empresas e organizações — clique para ampliar os prints.
              </p>
            </div>
            <a href="#contato" className="yop-reveal yop-reveal-delay-2 text-sm font-medium text-violet-200 hover:underline">
              Quero um projeto assim →
            </a>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {FEATURED_PROJECTS.map((project, i) => (
              <article
                key={project.key}
                className={`yop-reveal yop-reveal-delay-${(i % 4) + 1} group overflow-hidden rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md transition duration-500 hover:-translate-y-1 hover:border-violet-300/40 hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]`}
              >
                <button type="button" onClick={() => openLightbox(project)} className="relative block w-full text-left">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#0a1740]">
                    {!imgFailed[project.key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.print}
                        alt={`Print de ${project.name}`}
                        className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={() => setImgFailed((prev) => ({ ...prev, [project.key]: true }))}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                        <span className="text-sm font-semibold text-white/50">{project.name}</span>
                        <span className={`${jetbrains.className} text-[10px] uppercase tracking-wider text-white/30`}>
                          Aguardando print
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#120a38]/90 via-transparent to-transparent" />
                    <span className={`${jetbrains.className} absolute bottom-3 left-3 rounded-full border border-white/20 bg-[#120a38]/70 px-3 py-1.5 text-[10px] uppercase tracking-wider text-violet-100 backdrop-blur`}>
                      Ampliar
                    </span>
                  </div>
                  <div className="p-6 sm:p-7">
                    <span className={`${jetbrains.className} text-[10px] uppercase tracking-[0.22em] text-violet-200/80`}>
                      {project.tag}
                    </span>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{project.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{project.description}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="relative py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_65%)]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Método</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Como entregamos</h2>
            <p className="mt-3 max-w-xl text-sm text-white/65">
              Um processo claro, do briefing à operação em produção.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROCESS_STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`yop-reveal yop-reveal-delay-${i + 1} rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur transition hover:border-violet-300/35 hover:bg-white/10`}
              >
                <span className={`${jetbrains.className} text-3xl font-bold text-violet-300/40`}>{step.n}</span>
                <h3 className="mt-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH */}
      <section id="tecnologias" className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Stack</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tecnologias e plataformas</h2>
            <p className="mt-3 max-w-xl text-sm text-white/65">
              Ferramentas modernas para produtos estáveis, seguros e fáceis de evoluir.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {TECH_STACK.map((tech, i) => (
              <div
                key={tech.name}
                className={`yop-reveal yop-reveal-delay-${(i % 6) + 1} group flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-2 py-5 backdrop-blur transition hover:-translate-y-1 hover:border-violet-300/40 hover:bg-white/10`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-[#120a38] text-sm font-bold text-violet-100 transition group-hover:scale-105">
                  {tech.short}
                </span>
                <span className="text-center text-[11px] font-medium text-white/70">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CEO */}
      <section className="relative py-20 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="yop-reveal max-w-2xl">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Liderança</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Gabriel Carrara
              <span className="mt-1 block text-xl font-medium text-white/55 sm:text-2xl">CEO &amp; Desenvolvedor</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
              Full stack, automações e sistemas empresariais — do desenho da solução à operação do dia a dia.
            </p>
          </div>
          <Link
            href="/gabriel-portfolio-completo"
            className="yop-reveal yop-reveal-delay-2 inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#1a0f4a] transition hover:scale-[1.02]"
          >
            Ver portfólio
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0f4a] text-white">→</span>
          </Link>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contato" className="relative py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.14),transparent_60%)]" aria-hidden />
        <div className="yop-reveal relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>Contato</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Vamos construir o seu sistema</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/65 sm:text-base">
            Conte o desafio. Desenhamos, desenvolvemos e colocamos em produção.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/suporte"
              className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#1a0f4a] transition hover:scale-[1.02]"
            >
              Abrir conversa
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0f4a] text-white">→</span>
            </Link>
            <Link
              href="/gabriel-portfolio-completo"
              className="inline-flex rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver trabalho do CEO
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandMark className="text-lg tracking-[0.08em] text-white/90" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
            <a href="#projetos" className="hover:text-white">Projetos</a>
            <a href="#servicos" className="hover:text-white">Serviços</a>
            <Link href="/gabriel-portfolio-completo" className="hover:text-white">Portfólio</Link>
            <Link href="/termos" className="hover:text-white">Termos</Link>
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link href="/suporte" className="hover:text-white">Suporte</Link>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} YOP Devs</p>
        </div>
      </footer>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071338]/85 p-3 backdrop-blur-md sm:p-6"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#120a38] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Print de ${lightbox.name}`}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{lightbox.name}</p>
                <p className={`${jetbrains.className} truncate text-[10px] text-white/40`}>
                  {lightbox.tag}
                  {galleryImages.length > 1 ? ` · ${galleryIndex + 1}/${galleryImages.length}` : ''}
                </p>
              </div>
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80"
                    aria-label="Anterior"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80"
                    aria-label="Seguinte"
                  >
                    →
                  </button>
                </div>
              )}
              <a
                href={lightbox.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80"
              >
                Abrir site ↗
              </a>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#0a1340]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={galleryImages[galleryIndex] ?? lightbox.print}
                alt={`Print de ${lightbox.name}`}
                className="mx-auto w-full object-contain object-top"
              />
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-[#0a1340]/80 px-3 py-2">
                {galleryImages.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setGalleryIndex(i)}
                    className={`h-14 w-24 shrink-0 overflow-hidden rounded-lg border transition ${
                      i === galleryIndex ? 'border-violet-300' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071338]/80 p-4 backdrop-blur-md"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-[#120a38] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="auth-title" className="text-lg font-semibold text-white">
                {mode === 'login' ? 'Área privada' : 'Redefinir senha'}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 text-white/50 hover:text-white" aria-label="Fechar">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {message && (
              <div
                className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                  message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-white/50">E-mail</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-violet-400/40 placeholder:text-white/25 focus:ring-2"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
              {mode === 'login' && (
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-white/50">Senha</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-violet-400/40 placeholder:text-white/25 focus:ring-2"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-[#1a0f4a] transition hover:brightness-95 disabled:opacity-60"
              >
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Enviar link'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-white/45">
              {mode === 'login' ? (
                <button type="button" onClick={() => { setMode('reset'); setMessage(null) }} className="font-medium text-violet-200 hover:underline">
                  Esqueci minha senha
                </button>
              ) : (
                <button type="button" onClick={() => { setMode('login'); setMessage(null) }} className="font-medium text-violet-200 hover:underline">
                  Voltar ao login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a1740] text-white/50">
          A carregar...
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  )
}
