'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowDown,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Github,
  GraduationCap,
  Heart,
  Instagram,
  Linkedin,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import MemberLanguageSwitcher from './MemberLanguageSwitcher'
import { useMemberPortfolioLanguage } from './i18n/MemberLanguageContext'
import { parseFormationEntries } from '@/lib/portfolio-formation'
import { parseSkillCards } from '@/lib/portfolio-skill-cards'

export type MemberPortfolioRow = {
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
  location: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  github: string | null
  linkedin: string | null
  avatar_url: string | null
  banner_url: string | null
  available_for_work: boolean
  /** JSONB no Supabase; normalizado com `parseSkillCards`. */
  skill_cards?: unknown
  /** JSONB: formação e certificações (sem limite de itens). */
  formation_entries?: unknown
}

export type MemberProjectRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  project_url: string | null
  image_url: string | null
  tech_stack: string[]
}

export type MemberExperienceRow = {
  id: string
  role: string
  company: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

export type MemberPublicPortfolioProps = {
  portfolio: MemberPortfolioRow
  skills: string[]
  projects: MemberProjectRow[]
  experiences: MemberExperienceRow[]
}

function AboutStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="glass flex flex-col items-center rounded-xl border border-[hsl(var(--border)/0.4)] px-4 py-5 text-center transition-colors hover:border-[hsl(var(--primary)/0.35)]">
      <Icon className="mb-2 h-6 w-6 text-[hsl(var(--primary))]" aria-hidden />
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--primary))]">{label}</p>
      <p className="text-sm font-bold leading-snug text-[hsl(var(--foreground))]">{value}</p>
    </div>
  )
}

function fmtPeriod(start: string | null, end: string | null, dateLocale: string, periodPresent: string): string {
  if (!start && !end) return ''
  const opts = { month: 'short' as const, year: 'numeric' as const }
  const s = start ? new Date(`${start}T12:00:00`).toLocaleDateString(dateLocale, opts) : ''
  const e = end ? new Date(`${end}T12:00:00`).toLocaleDateString(dateLocale, opts) : periodPresent
  if (start && !end) return `${s} — ${periodPresent}`
  if (start && end) return `${s} — ${e}`
  return e
}

const projectGradients = [
  'from-cyan-500/25 to-teal-500/25',
  'from-sky-500/25 to-cyan-500/25',
  'from-teal-500/25 to-emerald-500/25',
  'from-blue-500/25 to-cyan-500/25',
]

export default function MemberPublicPortfolio({
  portfolio,
  skills,
  projects,
  experiences,
}: MemberPublicPortfolioProps) {
  const { t, dateLocale } = useMemberPortfolioLanguage()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [projectsHref, setProjectsHref] = useState('#projects')
  const [avatarFailed, setAvatarFailed] = useState(false)

  const formationEntries = useMemo(() => parseFormationEntries(portfolio.formation_entries), [portfolio.formation_entries])

  const navItems = useMemo(() => {
    const items = [
      { href: '#about', label: t.navAbout },
      { href: '#skills', label: t.navSkills },
      { href: '#projects', label: t.navProjects },
      { href: '#experience', label: t.navExperience },
    ]
    if (formationEntries.length > 0) {
      items.push({ href: '#formation', label: t.navFormation })
    }
    items.push({ href: '#contact', label: t.navContact })
    return items
  }, [t, formationEntries.length])

  const fallbackInitial =
    (portfolio.display_name?.trim()?.[0] || portfolio.username?.[0] || '?').toUpperCase()

  const heroTitle = portfolio.display_name?.trim() || portfolio.username

  const skillCards = useMemo(() => parseSkillCards(portfolio.skill_cards), [portfolio.skill_cards])
  const showSkillsSection = skillCards.length > 0 || skills.length > 0

  const aboutMeta = {
    location: portfolio.location?.trim() || '',
    age: portfolio.about_age?.trim() || '',
    statusLine: portfolio.about_status_line?.trim() || '',
    marital: portfolio.about_marital_status?.trim() || '',
  }
  const hasAboutMeta = Boolean(aboutMeta.location || aboutMeta.age || aboutMeta.statusLine || aboutMeta.marital)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setProjectsHref(`${window.location.origin}${pathname}#projects`)
    }
  }, [pathname])

  return (
    <div className="min-h-screen selection:bg-[hsl(var(--primary)/0.25)]">
      <nav className="glass fixed left-0 right-0 top-0 z-50 border-b border-[hsl(var(--border)/0.5)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Image
                src="/logoprincipal.png?v=4"
                alt="YOP Devs"
                width={200}
                height={63}
                className="h-9 w-auto object-contain sm:h-10"
                unoptimized
                priority
              />
            </Link>

            <div className="hidden items-center gap-4 md:flex">
              {navItems.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  {link.label}
                </a>
              ))}
              <MemberLanguageSwitcher />
              <Link
                href="/"
                className="rounded-lg border border-[hsl(var(--primary)/0.35)] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.1)]"
              >
                {t.joinNetwork}
              </Link>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <MemberLanguageSwitcher />
              <Link
                href="/"
                className="rounded-lg border border-[hsl(var(--primary)/0.35)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]"
              >
                {t.joinShort}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="p-2 text-[hsl(var(--foreground))]"
                aria-label={mobileOpen ? t.ariaCloseMenu : t.ariaOpenMenu}
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <div className="glass border-t border-[hsl(var(--border)/0.5)] px-4 py-4 md:hidden">
            {navItems.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="ymp-content min-w-0 bg-[hsl(var(--background))]">
        <main>
          {/* Hero — mesma estrutura visual do portfólio pessoal (HeroSection Gabriel) */}
          <section className="bg-gradient-hero relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl" />
              <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
                <div className="relative animate-float">
                  <div className="animate-pulse-glow h-56 w-56 overflow-hidden rounded-full border-2 border-[hsl(var(--primary)/0.35)] shadow-glow lg:h-72 lg:w-72">
                    {!avatarFailed && portfolio.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={portfolio.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.35)] to-[hsl(var(--card))] text-5xl font-black text-[hsl(var(--foreground))]">
                        {fallbackInitial}
                      </div>
                    )}
                  </div>
                  {portfolio.available_for_work ? (
                    <div
                      className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-4 border-[hsl(var(--background))] bg-emerald-500"
                      title={t.titleAvailable}
                    />
                  ) : null}
                </div>

                <div className="max-w-2xl text-center lg:text-left">
                  <p className="animate-fade-in-up mb-2 font-mono text-sm text-[hsl(var(--primary))]">{t.heroGreeting}</p>
                  <h1
                    className="animate-fade-in-up mb-4 text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl lg:text-6xl"
                    style={{ animationDelay: '0.1s' }}
                  >
                    {heroTitle}
                  </h1>
                  {portfolio.headline ? (
                    <p
                      className={`animate-fade-in-up text-lg font-medium text-[hsl(var(--primary))] sm:text-xl ${portfolio.bio?.trim() ? 'mb-4' : 'mb-8'}`}
                      style={{ animationDelay: '0.2s' }}
                    >
                      {portfolio.headline}
                    </p>
                  ) : null}
                  {portfolio.bio?.trim() ? (
                    <p
                      className="animate-fade-in-up mb-8 leading-relaxed text-[hsl(var(--muted-foreground))]"
                      style={{ animationDelay: '0.3s' }}
                    >
                      {portfolio.bio}
                    </p>
                  ) : !portfolio.headline ? (
                    <div className="mb-8" aria-hidden />
                  ) : null}
                  <div
                    className="animate-fade-in-up flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
                    style={{ animationDelay: '0.4s' }}
                  >
                    <a
                      href={projectsHref}
                      className="bg-gradient-primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                    >
                      {t.heroCtaWork}
                      <ArrowDown className="h-4 w-4" />
                    </a>
                    <a
                      href="#contact"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--primary)/0.35)] px-6 py-3 font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.1)]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t.heroCtaContact}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sobre */}
          <section id="about" className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="mb-4 text-center text-3xl font-bold lg:text-4xl">
                <span className="text-gradient">{t.aboutTitle}</span>
              </h2>
              <div className="mx-auto mt-8 max-w-3xl">
                {portfolio.about_text?.trim() ? (
                  <p className="whitespace-pre-wrap text-center text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {portfolio.about_text}
                  </p>
                ) : (
                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">{t.noAboutBody}</p>
                )}
                {portfolio.about_highlight?.trim() ? (
                  <p className="mt-6 text-center text-base font-medium italic leading-relaxed text-[hsl(var(--primary))]">
                    {portfolio.about_highlight}
                  </p>
                ) : null}
              </div>
              {hasAboutMeta ? (
                <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {aboutMeta.location ? (
                    <AboutStatCard icon={MapPin} label={t.aboutCardLocation} value={aboutMeta.location} />
                  ) : null}
                  {aboutMeta.age ? <AboutStatCard icon={Calendar} label={t.aboutCardAge} value={aboutMeta.age} /> : null}
                  {aboutMeta.statusLine ? (
                    <AboutStatCard icon={Briefcase} label={t.aboutCardStatus} value={aboutMeta.statusLine} />
                  ) : null}
                  {aboutMeta.marital ? <AboutStatCard icon={Heart} label={t.aboutCardMarital} value={aboutMeta.marital} /> : null}
                </div>
              ) : null}
            </div>
          </section>

          {/* Skills — cartões (até 4) ou lista legada `portfolio_skills` */}
          {showSkillsSection && (
            <section id="skills" className="py-20 lg:py-28">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
                  <span className="text-gradient">{t.skillsHeading}</span>
                </h2>
                <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.skillsSubtitle}</p>
                <div className="mx-auto max-w-5xl">
                  {skillCards.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {skillCards.map((card, i) => (
                        <div
                          key={`skill-card-${i}`}
                          className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                        >
                          <h3 className="mb-4 text-sm font-semibold tracking-wide text-[hsl(var(--primary))]">
                            {card.title.trim() || t.skillsCardUntitled}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {card.tags.map((tag) => (
                              <span
                                key={tag}
                                className="cursor-default rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.2)] hover:text-[hsl(var(--primary))]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]">
                      <div className="flex flex-wrap gap-2">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="cursor-default rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.2)] hover:text-[hsl(var(--primary))]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Projetos */}
          <section id="projects" className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
                <span className="text-gradient">{t.projectsHeading}</span>
              </h2>
              <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.projectsSubtitle}</p>
              {projects.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">{t.noProjects}</p>
              ) : (
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
                  {projects.map((pr, index) => (
                    <div
                      key={pr.id}
                      className="glass group overflow-hidden rounded-xl transition-all hover:border-[hsl(var(--primary)/0.35)] hover:shadow-glow"
                    >
                      <div
                        className={`relative flex min-h-[10rem] items-center justify-center overflow-hidden bg-gradient-to-br ${
                          projectGradients[index % projectGradients.length]
                        }`}
                      >
                        {pr.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pr.image_url} alt="" className="h-full w-full max-h-48 object-cover" />
                        ) : (
                          <span className="text-4xl font-black text-[hsl(var(--foreground)/0.25)]">◆</span>
                        )}
                      </div>
                      <div className="p-6">
                        {pr.category && (
                          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                            {pr.category}
                          </span>
                        )}
                        <h3 className="mt-2 text-lg font-bold text-[hsl(var(--foreground))]">{pr.title}</h3>
                        {pr.description && (
                          <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))] line-clamp-4">
                            {pr.description}
                          </p>
                        )}
                        {pr.tech_stack?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {pr.tech_stack.slice(0, 8).map((t) => (
                              <span
                                key={t}
                                className="rounded-md bg-[hsl(var(--secondary))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {pr.project_url && (
                          <a
                            href={pr.project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
                          >
                            {t.viewProject}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Experiência */}
          {experiences.length > 0 && (
            <section id="experience" className="py-20 lg:py-28">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
                  <span className="text-gradient">{t.experienceHeading}</span>
                </h2>
                <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.experienceSubtitle}</p>
                <div className="mx-auto max-w-3xl space-y-6">
                  {experiences.map((ex) => (
                    <div
                      key={ex.id}
                      className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.12)]">
                          <Building2 className="h-5 w-5 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-bold text-[hsl(var(--foreground))]">{ex.company}</h3>
                            <span className="font-mono text-xs text-[hsl(var(--primary))]">
                              {fmtPeriod(ex.start_date, ex.end_date, dateLocale, t.periodPresent)}
                            </span>
                          </div>
                          <p className="mb-3 flex items-center gap-1 text-sm font-medium text-[hsl(var(--primary)/0.9)]">
                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                            {ex.role}
                          </p>
                          {ex.description && (
                            <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{ex.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Formação & certificações */}
          {formationEntries.length > 0 ? (
            <section id="formation" className="py-20 lg:py-28">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
                  <span className="text-gradient">{t.formationHeading}</span>
                </h2>
                <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.formationSubtitle}</p>
                <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
                  {formationEntries.map((entry, i) => (
                    <div
                      key={`formation-${i}`}
                      className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.12)]">
                          <GraduationCap className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          {entry.institution ? (
                            <h3 className="font-bold leading-snug text-[hsl(var(--foreground))]">{entry.institution}</h3>
                          ) : null}
                          {entry.course ? (
                            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{entry.course}</p>
                          ) : null}
                          {entry.year ? (
                            <p className="mt-3 font-mono text-sm font-medium text-[hsl(var(--primary))]">{entry.year}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="ymp-print-footer-wrap">
            <section id="contact" className="py-20 lg:py-28">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
                  <span className="text-gradient">{t.contactHeading}</span>
                </h2>
                <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.contactSubtitle}</p>
                <div className="mx-auto max-w-3xl">
                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {portfolio.phone && (
                      <a
                        href={`tel:${portfolio.phone.replace(/\D/g, '')}`}
                        className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                      >
                        <Phone className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.labelPhone}</p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {portfolio.phone}
                        </p>
                      </a>
                    )}
                    {portfolio.website && (
                      <a
                        href={portfolio.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                      >
                        <ExternalLink className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.labelWebsite}</p>
                        <p className="break-all text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {portfolio.website.replace(/^https?:\/\//, '')}
                        </p>
                      </a>
                    )}
                    {portfolio.linkedin && (
                      <a
                        href={portfolio.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                      >
                        <Linkedin className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">LinkedIn</p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {t.openProfile}
                        </p>
                      </a>
                    )}
                    {portfolio.github && (
                      <a
                        href={portfolio.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                      >
                        <Github className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">GitHub</p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {t.repos}
                        </p>
                      </a>
                    )}
                    {portfolio.instagram && (
                      <a
                        href={
                          portfolio.instagram.startsWith('http')
                            ? portfolio.instagram
                            : `https://instagram.com/${portfolio.instagram.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)] sm:col-span-2"
                      >
                        <Instagram className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">Instagram</p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {portfolio.instagram}
                        </p>
                      </a>
                    )}
                  </div>
                  <div className="text-center">
                    <Link
                      href="/"
                      className="bg-gradient-primary inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                    >
                      {t.joinNetworkFooter}
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-[hsl(var(--border)/0.5)] py-10">
              <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 text-center sm:px-6 lg:px-8">
                <Image
                  src="/logoprincipal.png?v=4"
                  alt="YOP Devs"
                  width={200}
                  height={63}
                  className="h-10 w-auto object-contain opacity-90"
                  unoptimized
                />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t.footerCopyright.replace('{year}', String(new Date().getFullYear()))}
                </p>
                <p className="max-w-md text-xs text-[hsl(var(--muted-foreground)/0.85)]">{t.footerDisclaimer}</p>
                <Link href="/" className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">
                  {t.footerBackHome}
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
