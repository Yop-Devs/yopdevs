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

// Gabriel's projects — English (CV / international), with impact and tech keywords
const SHOWCASE_PROJECTS_GABRIEL_EN = [
  { title: 'TrylyApp', url: 'https://tryly.com.br', description: 'Full product lifecycle: mobile app and web platform — design, build, deploy and operate in production.', tech: ['Product', 'Web', 'Mobile'] },
  { title: 'YOP Devs', url: 'https://yopdevs.com.br', description: 'Built and run an equity network + forum connecting entrepreneurs, developers and investors. Real-time features, auth, and project marketplace.', tech: ['Next.js', 'Supabase', 'Real-time'] },
  { title: 'Fenix Gestora', url: 'https://fenixgestora.com.br', description: 'Custom system and company website — requirements, development and delivery for financial/consortium operations.', tech: ['Web', 'Systems'] },
  { title: 'WhatsApp Automations (Meta)', url: '#', description: 'Payment reminders and notifications via official WhatsApp Business API. Automated billing and customer communication flows.', tech: ['API', 'Automation'] },
  { title: 'Internal systems & integrations', url: '#', description: 'Custom automations and internal tools for companies — process design, integrations and bespoke software.', tech: ['Automation', 'Integrations'] },
]

// Fallback skills for ATS and recruiters (when profile specialties empty)
const FALLBACK_SKILLS_GABRIEL = [
  'Leadership', 'Product', 'Full-stack', 'JavaScript', 'TypeScript', 'React', 'Next.js',
  'Node.js', 'APIs', 'Supabase', 'Automation', 'Systems design', 'Operations',
]

// Key achievements for Gabriel — outcome-focused bullets
const KEY_ACHIEVEMENTS_GABRIEL = [
  'Built and launched multiple products (apps, platforms, internal tools) from idea to production.',
  'Founded and run YOP Devs — equity network connecting entrepreneurs, developers and investors.',
  'Led operations and systems as Administrative Director; delivered integrations and automation (e.g. WhatsApp API).',
  'Open to relocation: Ireland, Canada, USA and worldwide. Ready to discuss visa and remote options.',
]

export default function CVPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (typeof document === 'undefined' || !profile) return
    const title = `${profile.full_name} | Resume — CEO & Builder · Open to Ireland, Canada, USA`
    document.title = title
    let metaDesc = document.querySelector('meta[name="description"]')
    const desc = `Resume of ${profile.full_name}. CEO, builder, open to opportunities in Ireland, Canada, USA and worldwide. View projects and contact.`
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', desc)
    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (!ogTitle) {
      ogTitle = document.createElement('meta')
      ogTitle.setAttribute('property', 'og:title')
      document.head.appendChild(ogTitle)
    }
    ogTitle.setAttribute('content', title)
  }, [profile])

  useEffect(() => {
    if (!slug) return
    const slugStr: string = slug
    async function load() {
      try {
        const res = await fetch(`/api/portfolio/${encodeURIComponent(slugStr)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Profile not found')
          setProfile(null)
          setProjects([])
          return
        }
        setProfile(data.profile)
        setProjects(data.projects || [])
        setError(null)
      } catch {
        setError('Error loading resume')
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
          Loading resume...
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
          {error || 'This resume is not available.'}
        </p>
        <Link href="/" className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-700 transition-all">
          Back to home
        </Link>
      </div>
    )
  }

  const rawSpecialties = profile.specialties ? profile.specialties.split(',').map((s) => s.trim()).filter(Boolean) : []
  const isGabriel = slug === 'gabriel-costa-carrara'
  const specialties = isGabriel && rawSpecialties.length === 0 ? FALLBACK_SKILLS_GABRIEL : rawSpecialties
  const displayRole = isGabriel && (profile.role === 'MEMBER' || !profile.role) ? 'CEO' : (profile.role || 'Member')
  const fenixRole = isGabriel ? 'Administrative Director · Fênix Consórcios' : null
  const instagramUrl = isGabriel ? 'https://instagram.com/gabriel.carrara_' : null
  const contactPhone = isGabriel ? '+55 65 9 9226-3485' : null
  const contactTelHref = isGabriel ? 'tel:+5565992263485' : '#'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      {/* Print: hide header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm print:hidden">
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
            <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">About</a>
            <a href="#experience" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">Experience</a>
            <a href="#contact" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">Contact</a>
            {isGabriel && (
              <Link href="/portfolio/gabriel-costa-carrara" className="text-sm font-semibold text-slate-500 hover:text-violet-600 transition-colors">
                PT
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:border-violet-300 hover:text-violet-700 transition-all hidden sm:block"
            >
              Print resume
            </button>
            <Link href="/" className="px-4 py-2.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all">
              Join YOP
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-20 md:pt-24 pb-10 md:pb-14 px-4 md:px-6 print:pt-8 print:pb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-slate-200 flex items-center justify-center print:w-28 print:h-28">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl md:text-7xl font-black text-slate-400 uppercase print:text-4xl">{profile.full_name?.[0] || '?'}</span>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 mb-2">Resume · YOP Devs</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-2 print:text-3xl">
              {profile.full_name}
            </h1>
            {/* Headline for hireability */}
            {isGabriel && (
              <p className="text-base md:text-lg text-slate-600 font-semibold max-w-xl mb-3">
                CEO & Builder · Open to opportunities in Ireland, Canada, USA & worldwide
              </p>
            )}
            <p className="text-base md:text-lg text-slate-600 font-medium max-w-xl mb-3">
              <span className="inline-block px-3 py-1 bg-slate-800 text-white text-sm font-bold uppercase rounded-lg tracking-wider">
                {displayRole}
              </span>
              {fenixRole && (
                <span className="inline-block ml-2 px-3 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded-lg tracking-wider border border-violet-200">
                  {fenixRole}
                </span>
              )}
              {isGabriel && (
                <span className="inline-block ml-2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full border border-emerald-600 print:bg-emerald-600">
                  Open to work
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
            <div className="flex flex-wrap gap-2 justify-center md:justify-start print:flex print:gap-2">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#0a66c2] text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-[#004182] transition-all shadow-md">
                  LinkedIn — Let&apos;s connect
                </a>
              )}
              {contactTelHref !== '#' && (
                <a href={contactTelHref} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-md">
                  📞 Call / WhatsApp
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all">
                  GitHub
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all">
                  Instagram
                </a>
              )}
              <Link href="/" className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-slate-300 transition-all print:hidden">
                YOP Network
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-10 md:py-14 px-4 md:px-6 bg-white border-y border-slate-200 print:py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">About</h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Professional Summary</h3>
          <p className="text-slate-600 text-base leading-relaxed font-medium">
            {profile.bio || (
              <span className={isGabriel ? '' : 'italic text-slate-500'}>
                {isGabriel
                  ? `${profile.full_name} is a CEO and builder with hands-on experience in product, full-stack development and operations. As Administrative Director at Fênix Consórcios, he leads systems and processes; as founder of YOP Devs, he built an equity network connecting entrepreneurs, developers and investors. He has shipped apps, platforms and automations (including WhatsApp API integrations) from idea to production. Open to full-time or contract roles in Ireland, Canada, USA and worldwide — including relocation and remote.`
                  : `${profile.full_name} is part of the YOP Devs network — an ecosystem connecting entrepreneurs, developers and investors.`}
              </span>
            )}
          </p>
          {isGabriel && KEY_ACHIEVEMENTS_GABRIEL.length > 0 && (
            <ul className="mt-6 space-y-2 text-slate-600 text-sm leading-relaxed font-medium">
              {KEY_ACHIEVEMENTS_GABRIEL.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-500 font-bold shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {specialties.length > 0 && (
        <section className="py-10 md:py-14 px-4 md:px-6 print:py-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Skills</h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Technologies & competencies</h3>
            <p className="text-slate-500 text-sm mb-5">Relevant for product, engineering and leadership roles.</p>
            <div className="flex flex-wrap gap-3">
              {specialties.map((spec) => (
                <span key={spec} className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider hover:border-violet-300 hover:text-violet-700 transition-all">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {isGabriel && (
        <section id="experience" className="py-10 md:py-14 px-4 md:px-6 bg-white border-y border-slate-200 print:py-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Experience</h2>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">Projects & systems built</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SHOWCASE_PROJECTS_GABRIEL_EN.map((item) => {
                const tech = 'tech' in item && Array.isArray(item.tech) ? item.tech : []
                const cardContent = (
                  <>
                    {tech.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {tech.map((t) => (
                          <span key={t} className="text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <h4 className="text-xl font-black text-slate-900 mb-3 leading-tight">{item.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{item.description}</p>
                    {'url' in item && item.url !== '#' && (
                      <span className="text-sm font-bold text-[#4c1d95] uppercase tracking-wider">View →</span>
                    )}
                  </>
                )
                return 'url' in item && item.url !== '#' ? (
                  <a
                    key={item.title}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-100 border-2 border-slate-200 rounded-xl p-6 hover:border-violet-300 hover:shadow-lg transition-all group"
                  >
                    {cardContent}
                  </a>
                ) : (
                  <div key={item.title} className="bg-slate-100 border-2 border-slate-200 rounded-xl p-6">
                    {cardContent}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section id={isGabriel ? 'projects-network' : 'projects'} className={`py-10 md:py-14 px-4 md:px-6 print:py-6 print:break-before-auto ${isGabriel ? 'print:hidden' : ''}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">YOP Network</h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6">Projects on YOP</h3>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p) => (
                <div key={p.id} className="bg-slate-100 border-2 border-slate-200 rounded-xl p-6 hover:border-violet-200 hover:shadow-lg transition-all">
                  {p.category && <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-3 block">{p.category}</span>}
                  <h4 className="text-xl font-black text-slate-900 mb-3 leading-tight">{p.title}</h4>
                  {p.description && <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-6">{p.description}</p>}
                  <Link href="/" className="text-sm font-bold text-[#4c1d95] hover:underline uppercase tracking-wider">View on YOP →</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-slate-500 font-medium">No projects on the network yet.</p>
              <Link href="/" className="inline-block mt-4 text-sm font-bold text-violet-600 hover:underline">Visit YOP Devs</Link>
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="py-10 md:py-14 px-4 md:px-6 bg-white border-y border-slate-200 print:py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Contact</h2>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Let&apos;s work together</h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            {isGabriel
              ? 'Open to full-time, contract and remote roles in Ireland, Canada, USA and worldwide. Happy to discuss relocation and visa options.'
              : 'Reach out via the links below or join the YOP network.'}
          </p>
          {contactPhone && (
            <p className="mb-5">
              <a href={contactTelHref} className="text-lg font-bold text-slate-800 hover:text-violet-600 transition-colors">
                📞 {contactPhone}
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#0a66c2] text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#004182] transition-all">LinkedIn</a>
            )}
            {contactTelHref !== '#' && (
              <a href={contactTelHref} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 transition-all">Call / WhatsApp</a>
            )}
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all">GitHub</a>
            )}
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all">Instagram</a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all">Website</a>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">Prefer to connect through a network? Join YOP Devs.</p>
          <Link href="/" className="inline-block px-8 py-3 bg-[#4c1d95] text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-violet-800 transition-all shadow-md print:hidden">
            Join YOP Devs
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-800 text-slate-200 py-6 px-4 md:px-6 print:py-4 print:bg-white print:border-slate-200 print:text-slate-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 print:no-underline print:text-slate-700">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center print:bg-slate-200">
              <svg className="w-4 h-4 text-white print:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Logo variant="light" size="sm" />
          </Link>
          <p className="text-sm text-slate-400 print:text-slate-500">
            Resume of <strong className="text-white print:text-slate-900">{profile.full_name}</strong> · yopdevs.com.br/cv/{slug}
          </p>
          {isGabriel ? (
            <Link href="/portfolio/gabriel-costa-carrara" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors print:text-slate-600">
              Português
            </Link>
          ) : (
            <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors print:text-slate-600">Back to home</Link>
          )}
        </div>
      </footer>
    </div>
  )
}
