'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/allowed-emails'
import {
  FEATURED_PROJECTS,
  SERVICES,
  TECH_STACK,
  type FeaturedProject,
} from '@/lib/featured-projects'
import {
  LandingLanguageProvider,
  useLandingLanguage,
} from '@/lib/landing-i18n/LanguageContext'
import {
  ALL_LANDING_LANGS,
  languageLabels,
  type Language,
} from '@/lib/landing-i18n/translations'
import { Globe, Copy, Check, Mail } from 'lucide-react'
import { TechBrandIcon } from '@/components/TechBrandIcon'
import BrandMark from '@/components/BrandMark'

const CONTACT_EMAIL = 'gabrielcarrarapessoal@gmail.com'

function emailComposeLinks(subject: string) {
  const to = encodeURIComponent(CONTACT_EMAIL)
  const su = encodeURIComponent(subject)
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}`,
    hotmail: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}`,
    mailto: `mailto:${CONTACT_EMAIL}?subject=${su}`,
  }
}

function BrandMailIcon({ name }: { name: 'gmail' | 'outlook' | 'hotmail' | 'mailto' }) {
  if (name === 'gmail') {
    return (
      <svg viewBox="0 0 192 192" className="h-6 w-6" aria-hidden>
        <path fill="url(#gmail-2026-green)" d="M146 44h38v110c0 6.627-5.373 12-12 12h-20a6 6 0 0 1-6-6z" />
        <path fill="#fc413d" d="M46 44H8v110c0 6.627 5.373 12 12 12h20a6 6 0 0 0 6-6z" />
        <path
          fill="url(#gmail-2026-warm)"
          d="M39.226 30.456c-8.033-6.752-20.018-5.714-26.77 2.319-6.752 8.032-5.714 20.017 2.319 26.77l76.078 63.949a8 8 0 0 0 10.295 0l76.078-63.95c8.032-6.752 9.07-18.737 2.318-26.77-6.752-8.032-18.737-9.07-26.769-2.318L96 78.18z"
        />
        <defs>
          <linearGradient id="gmail-2026-green" x1="165" x2="165" y1="44" y2="166" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60d673" />
            <stop offset=".17" stopColor="#42c868" />
            <stop offset=".39" stopColor="#0ebc5f" />
            <stop offset=".62" stopColor="#00a9bb" />
            <stop offset=".86" stopColor="#3c90ff" />
            <stop offset="1" stopColor="#3186ff" />
          </linearGradient>
          <linearGradient id="gmail-2026-warm" x1="8" x2="184" y1="46.13" y2="46.13" gradientUnits="userSpaceOnUse">
            <stop offset=".08" stopColor="#ff63a0" />
            <stop offset=".3" stopColor="#fc413d" />
            <stop offset=".5" stopColor="#fc413d" />
            <stop offset=".65" stopColor="#fc413d" />
            <stop offset=".72" stopColor="#fc5c30" />
            <stop offset=".86" stopColor="#feb10c" />
            <stop offset=".91" stopColor="#fec700" />
            <stop offset=".96" stopColor="#ffdb0f" />
          </linearGradient>
        </defs>
      </svg>
    )
  }
  if (name === 'outlook') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path fill="#0A66C2" d="M13.5 2.5h8c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5h-8V2.5z" />
        <path fill="#1490DF" d="M13.5 4h7.2v11.2h-7.2V4z" />
        <path fill="#36C5F0" d="M14.2 4.7h5.8v9.8h-5.8V4.7z" />
        <path fill="#0078D4" d="M1 5.5h14v14.2c0 1-.8 1.8-1.8 1.8H2.8c-1 0-1.8-.8-1.8-1.8V5.5z" />
        <circle cx="8" cy="12.8" r="4.1" fill="#fff" />
        <circle cx="8" cy="12.8" r="2.45" fill="#0078D4" />
      </svg>
    )
  }
  if (name === 'hotmail') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#F65314" />
        <path fill="#fff" d="M4.2 7.2l7.8 5.4 7.8-5.4v2.1L12 14.8 4.2 9.3V7.2z" />
        <path fill="#FFB900" d="M4.2 16.8V9.3L12 14.8l7.8-5.5v7.5H4.2z" opacity=".9" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="#A78BFA" strokeWidth="1.75" />
      <path d="M3.5 7.5L12 13.2 20.5 7.5" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmailContactPicker() {
  const { t } = useLandingLanguage()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const links = emailComposeLinks(t.contact.emailSubject)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const options = [
    { key: 'gmail' as const, label: t.contact.gmail, href: links.gmail, hint: 'Google' },
    { key: 'outlook' as const, label: t.contact.outlook, href: links.outlook, hint: 'Microsoft 365' },
    { key: 'hotmail' as const, label: t.contact.hotmail, href: links.hotmail, hint: 'Outlook.com' },
    { key: 'mailto' as const, label: t.contact.defaultMail, href: links.mailto, hint: 'Mail / Outlook / Apple' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-w-0 flex-1 items-center justify-center gap-3 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition hover:border-violet-300/50 hover:bg-white/10"
      >
        <Mail className="h-5 w-5 shrink-0 text-violet-200" aria-hidden />
        <span className="truncate">{t.contact.ctaEmail}</span>
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071338]/85 p-4 backdrop-blur-md"
              onClick={() => setOpen(false)}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t.contact.chooseEmail}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[min(92vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-b from-[#1a1248] to-[#0e0a2e] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
              >
                <div className="relative shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-violet-500/25 blur-3xl" aria-hidden />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`${jetbrains.className} text-[10px] uppercase tracking-[0.28em] text-violet-200/75`}>
                        {t.contact.chooseEmail}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                        {t.contact.ctaEmail}
                      </h3>
                      <p className="mt-1 truncate text-sm text-white/50">{CONTACT_EMAIL}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label="Fechar"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-3 sm:px-5">
                  {options.map((opt) => (
                    <a
                      key={opt.key}
                      href={opt.href}
                      target={opt.key === 'mailto' ? undefined : '_blank'}
                      rel={opt.key === 'mailto' ? undefined : 'noopener noreferrer'}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 transition hover:border-violet-300/35 hover:bg-white/[0.08]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                        <BrandMailIcon name={opt.key} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white">{opt.label}</span>
                        <span className="mt-0.5 block text-xs text-white/45">{opt.hint}</span>
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 transition group-hover:bg-violet-400/20 group-hover:text-violet-100">
                        →
                      </span>
                    </a>
                  ))}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-black/20 px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(CONTACT_EMAIL)
                        setCopied(true)
                        window.setTimeout(() => {
                          setCopied(false)
                          setOpen(false)
                        }, 1100)
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    {copied ? <Check className="h-4 w-4 text-[#25D366]" aria-hidden /> : <Copy className="h-4 w-4 text-violet-200" aria-hidden />}
                    {copied ? t.contact.emailCopied : t.contact.copyEmail}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

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

type AuthMode = 'login' | 'reset'

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

function YopAnimatedBackdrop() {
  const rain = [
    { left: '6%', delay: '0s', duration: '9s', h: '18%' },
    { left: '14%', delay: '2.1s', duration: '11s', h: '22%' },
    { left: '22%', delay: '4.4s', duration: '8.5s', h: '14%' },
    { left: '31%', delay: '1.2s', duration: '12s', h: '26%' },
    { left: '39%', delay: '5.8s', duration: '10s', h: '16%' },
    { left: '48%', delay: '0.7s', duration: '13s', h: '20%' },
    { left: '57%', delay: '3.3s', duration: '9.5s', h: '24%' },
    { left: '66%', delay: '6.2s', duration: '11.5s', h: '15%' },
    { left: '74%', delay: '1.9s', duration: '8s', h: '21%' },
    { left: '83%', delay: '4.8s', duration: '12.5s', h: '17%' },
    { left: '91%', delay: '2.6s', duration: '10.5s', h: '23%' },
  ]

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
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

      {/* Rede / cabos */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.34]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="yop-cable" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="45%" stopColor="#c4b5fd" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="yop-cable-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="yop-net-static" stroke="url(#yop-cable)" strokeWidth="1.1" fill="none">
          <path d="M-40 140 H220 L310 220 H520 L610 160 H820" />
          <path d="M980 80 H1180 L1260 150 H1520" />
          <path d="M60 420 H180 L250 490 H430 L510 430 H700" />
          <path d="M760 520 H960 L1040 590 H1280 L1360 540 H1520" />
          <path d="M-20 720 H160 L240 780 H420 L500 730 H690" />
          <path d="M820 680 H1020 L1110 740 H1340" />
        </g>
        <g className="yop-net-static" stroke="url(#yop-cable-b)" strokeWidth="1" fill="none">
          <path d="M180 40 V220 L260 290 V460" />
          <path d="M540 120 V300 L620 370 V620" />
          <path d="M1120 60 V240 L1200 310 V520" />
          <path d="M1320 200 V420 L1400 490 V780" />
        </g>

        <g fill="#c4b5fd" fillOpacity="0.55">
          <circle cx="220" cy="140" r="2.5" />
          <circle cx="310" cy="220" r="2.5" />
          <circle cx="520" cy="220" r="2.2" />
          <circle cx="250" cy="490" r="2.4" />
          <circle cx="1040" cy="590" r="2.5" />
          <circle cx="240" cy="780" r="2.2" />
          <circle cx="1110" cy="740" r="2.3" />
          <circle cx="260" cy="290" r="2.2" />
          <circle cx="620" cy="370" r="2.4" />
          <circle cx="1200" cy="310" r="2.2" />
        </g>

        <g fill="none" strokeLinecap="round">
          <path
            className="yop-cable-pulse yop-cable-pulse-a"
            d="M-40 140 H220 L310 220 H520 L610 160 H820"
            stroke="#e9d5ff"
            strokeWidth="2"
          />
          <path
            className="yop-cable-pulse yop-cable-pulse-b"
            d="M760 520 H960 L1040 590 H1280 L1360 540 H1520"
            stroke="#93c5fd"
            strokeWidth="2"
          />
          <path
            className="yop-cable-pulse yop-cable-pulse-c"
            d="M540 120 V300 L620 370 V620"
            stroke="#c4b5fd"
            strokeWidth="2"
          />
          <path
            className="yop-cable-pulse yop-cable-pulse-d"
            d="M-20 720 H160 L240 780 H420 L500 730 H690"
            stroke="#a5b4fc"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* Chuva digital */}
      <div className="absolute inset-0 opacity-[0.22]">
        {rain.map((drop) => (
          <span
            key={drop.left}
            className="yop-rain-drop absolute top-0 w-px"
            style={{
              left: drop.left,
              height: drop.h,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              background:
                'linear-gradient(to bottom, transparent, rgba(196,181,253,0.85), rgba(147,197,253,0.35), transparent)',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,19,56,0.45)_100%)]" />
    </div>
  )
}

function LandingLangSwitcher() {
  const { language, setLanguage, t } = useLandingLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label={t.lang.label}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20 sm:px-3"
      >
        <Globe className="h-3.5 w-3.5 text-violet-200" aria-hidden />
        <span className="hidden sm:inline">{languageLabels[language]}</span>
        <span className="sm:hidden">{language.toUpperCase().replace('PT-', 'PT')}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[150px] overflow-hidden rounded-xl border border-white/15 bg-[#120a38]/95 py-1.5 shadow-2xl backdrop-blur-md">
          {ALL_LANDING_LANGS.map((lang: Language) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
              className={`w-full px-3.5 py-2 text-left text-sm transition hover:bg-white/10 ${
                lang === language ? 'font-semibold text-violet-200' : 'text-white/80'
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LandingPageContent() {
  const { t } = useLandingLanguage()
  const whatsappHref =
    'https://wa.me/5565992263485?text=' + encodeURIComponent(t.contact.whatsappMessage)
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
      window.location.href = '/admin/login?error=unauthorized'
    } else if (searchParams.get('login') === '1' || searchParams.get('admin') === '1') {
      window.location.href = '/admin/login'
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

  return (
    <div
      className={`${spaceGrotesk.variable} ${jetbrains.variable} ${spaceGrotesk.className} relative min-h-screen text-white selection:bg-violet-400/30`}
      style={{
        background: 'linear-gradient(165deg, #071338 0%, #1b0f4d 38%, #0a1845 72%, #071338 100%)',
      }}
    >
      {/* Fundo animado contínuo */}
      <YopAnimatedBackdrop />

      <div className="relative z-10">
      {/* HERO */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[120px] yop-glow-soft" aria-hidden />
        <div className="pointer-events-none absolute -right-10 top-10 h-80 w-80 rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-24 h-[28rem] w-[28rem] rounded-full border border-white/5" aria-hidden />

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="group relative inline-flex items-center">
            <BrandMark className="text-[1.7rem] leading-none tracking-[0.08em] text-white sm:text-[2rem]" />
            <span className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg bg-violet-400/0 blur-md transition group-hover:bg-violet-400/15" aria-hidden />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#servicos" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white md:inline">{t.nav.services}</a>
            <a href="#projetos" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white sm:inline">{t.nav.projects}</a>
            <a href="#tecnologias" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white lg:inline">{t.nav.tech}</a>
            <a href="#contato" className="hidden px-3 py-2 text-sm text-white/75 transition hover:text-white sm:inline">{t.nav.contact}</a>
            <LandingLangSwitcher />
          </nav>
        </header>

        <div
          className={`relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-14 ${
            heroReady ? 'yop-rise opacity-100' : 'opacity-0'
          }`}
        >
          <div>
            <p className={`${jetbrains.className} mb-4 text-[11px] uppercase tracking-[0.32em] text-violet-200/80`}>
              {t.hero.eyebrow}
            </p>

            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              {t.hero.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#projetos"
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#1a0f4a] shadow-[0_10px_40px_rgba(255,255,255,0.18)] transition hover:scale-[1.02]"
              >
                {t.hero.ctaProjects}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0f4a] text-white transition group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="#contato"
                className="inline-flex items-center rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.hero.ctaContact}
              </a>
            </div>

            <div className={`${jetbrains.className} mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.22em] text-white/45`}>
              <span>{t.hero.statProjects}</span>
              <span>{t.hero.statStack}</span>
              <span>{t.hero.statDelivery}</span>
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
                    className="yop-logo-slide absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 pb-8 pt-4 sm:px-6"
                  >
                    {!imgFailed[`logo-${project.key}`] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.logo}
                        alt={project.name}
                        className="h-auto max-h-[58%] w-auto max-w-[86%] object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] sm:max-h-[62%] sm:max-w-[88%]"
                        onError={() => setImgFailed((prev) => ({ ...prev, [`logo-${project.key}`]: true }))}
                      />
                    ) : (
                      <span className={`${jetbrains.className} text-center text-lg font-medium uppercase tracking-[0.16em] text-white/85`}>
                        {project.short}
                      </span>
                    )}
                    <span className={`${jetbrains.className} text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-[11px]`}>
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
              {t.hero.logosLabel}
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
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>{t.services.eyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.services.title}</h2>
            <p className="mt-3 text-sm text-white/65 sm:text-base">
              {t.services.subtitle}
            </p>
          </div>

          <div
            className="yop-reveal yop-reveal-delay-1 mt-12 grid items-stretch gap-5 lg:grid-cols-2"
            onMouseEnter={() => setServicePaused(true)}
            onMouseLeave={() => setServicePaused(false)}
          >
            {(() => {
              const active = SERVICES[serviceIndex] ?? SERVICES[0]
              const serviceCopy = t.services.items[active.icon as keyof typeof t.services.items]
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
                  key={active.icon}
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
                  <h3 className="relative mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">{serviceCopy.label}</h3>
                  <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
                    {serviceCopy.detail}
                  </p>
                  <ul className="relative mt-6 space-y-2.5">
                    {serviceCopy.points.map((point) => (
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
                    {t.services.cta}
                    <span aria-hidden>→</span>
                  </a>
                </div>
              )
            })()}

            <div className="flex h-full flex-col justify-between gap-3">
              {SERVICES.map((s, i) => {
                const isActive = i === serviceIndex
                const copy = t.services.items[s.icon as keyof typeof t.services.items]
                return (
                  <button
                    key={s.icon}
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
                        <span className="font-semibold text-white">{copy.label}</span>
                        <span className={`${jetbrains.className} text-[10px] text-white/35`}>0{i + 1}</span>
                      </span>
                      <span className={`mt-1 block text-sm leading-snug transition ${isActive ? 'text-white/65' : 'text-white/45'}`}>
                        {copy.description}
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
              <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>{t.projects.eyebrow}</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.projects.title}</h2>
              <p className="mt-3 max-w-lg text-sm text-white/65 sm:text-base">
                {t.projects.subtitle}
              </p>
            </div>
            <a href="#contato" className="yop-reveal yop-reveal-delay-2 text-sm font-medium text-violet-200 hover:underline">
              {t.projects.wantSimilar}
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
                          {t.projects.awaiting}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#120a38]/90 via-transparent to-transparent" />
                    <span className={`${jetbrains.className} absolute bottom-3 left-3 rounded-full border border-white/20 bg-[#120a38]/70 px-3 py-1.5 text-[10px] uppercase tracking-wider text-violet-100 backdrop-blur`}>
                      {t.projects.enlarge}
                    </span>
                  </div>
                  <div className="p-6 sm:p-7">
                    <span className={`${jetbrains.className} text-[10px] uppercase tracking-[0.22em] text-violet-200/80`}>
                      {project.tag}
                    </span>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{project.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">
                      {t.projects.descriptions[project.key as keyof typeof t.projects.descriptions] ?? project.description}
                    </p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="relative py-20 lg:py-24">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal max-w-2xl">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>{t.process.eyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.process.title}</h2>
            <p className="mt-3 text-sm text-white/65 sm:text-base">
              {t.process.subtitle}
            </p>
          </div>

          <div className="yop-reveal yop-reveal-delay-1 relative mt-12 overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.04]">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18),transparent_55%)]"
              aria-hidden
            />
            {/* linha conectora desktop */}
            <div
              className="pointer-events-none absolute left-[16%] right-[16%] top-[4.75rem] hidden h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent md:block"
              aria-hidden
            />
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[4.75rem] hidden h-px overflow-hidden md:block" aria-hidden>
              <span className="yop-process-flow block h-full w-1/3 bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
            </div>

            <div className="relative grid md:grid-cols-3">
              {t.process.steps.map((step, i) => (
                <div
                  key={step.title}
                  className={`flex flex-col px-7 py-9 sm:px-8 sm:py-10 ${
                    i < t.process.steps.length - 1 ? 'border-b border-white/10 md:border-b-0 md:border-r' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-violet-300/40 bg-violet-500/15 shadow-[0_0_24px_rgba(167,139,250,0.25)]">
                      <span className={`${jetbrains.className} text-sm font-semibold text-violet-100`}>0{i + 1}</span>
                    </span>
                    <span className={`${jetbrains.className} text-[10px] uppercase tracking-[0.24em] text-white/35`}>
                      {t.process.stepLabel} {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 min-h-[4.5rem] text-sm leading-relaxed text-white/60">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TECH */}
      <section id="tecnologias" className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal max-w-2xl">
            <p className={`${jetbrains.className} mb-2 text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>{t.tech.eyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.tech.title}</h2>
            <p className="mt-3 text-sm text-white/65 sm:text-base">
              {t.tech.subtitle}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {TECH_STACK.map((tech, i) => (
              <div
                key={tech.name}
                className={`yop-reveal yop-reveal-delay-${(i % 6) + 1} group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-violet-300/35 hover:bg-white/[0.08] hover:shadow-[0_12px_40px_rgba(124,58,237,0.15)]`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition group-hover:scale-105">
                  <TechBrandIcon
                    slug={tech.slug}
                    color={tech.color}
                    local={'local' in tech ? tech.local : undefined}
                    name={tech.name}
                  />
                </span>
                <span className="min-w-0 text-sm font-medium text-white/85">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CEO + CONTATO */}
      <section id="contato" className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="yop-reveal overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.04]">
            <div className="grid lg:grid-cols-2">
              {/* Contato */}
              <div className="relative flex min-h-[300px] flex-col border-b border-white/10 p-8 sm:min-h-[340px] sm:p-10 lg:border-b-0 lg:border-r">
                <div
                  className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-[#25D366]/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-1 flex-col">
                  <p className={`${jetbrains.className} text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>
                    {t.contact.eyebrow}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    {t.contact.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
                    {t.contact.subtitle}
                  </p>
                  <div className="mt-auto flex flex-row items-stretch gap-3 pt-10">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="yop-wa-cta group relative inline-flex min-w-0 flex-1 items-center justify-center gap-3 overflow-hidden rounded-full bg-[#25D366] px-7 py-4 text-sm font-semibold text-[#052e16] transition hover:bg-[#2fe574]"
                    >
                      <span className="pointer-events-none absolute inset-0 yop-wa-shine" aria-hidden />
                      <svg viewBox="0 0 24 24" className="relative h-5 w-5 shrink-0 fill-current" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span className="truncate">{t.contact.cta}</span>
                    </a>
                    <EmailContactPicker />
                  </div>
                </div>
              </div>

              {/* Liderança */}
              <div className="relative flex min-h-[300px] flex-col p-8 sm:min-h-[340px] sm:p-10">
                <div
                  className="pointer-events-none absolute -left-8 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-1 flex-col">
                  <p className={`${jetbrains.className} text-[11px] uppercase tracking-[0.3em] text-violet-200/80`}>
                    {t.leadership.eyebrow}
                  </p>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.leadership.name}</h3>
                  <p className="mt-1 text-base text-white/55">{t.leadership.role}</p>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
                    {t.leadership.bio}
                  </p>
                  <div className="mt-auto pt-10">
                    <Link
                      href="/gabriel-portfolio-completo"
                      className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#1a0f4a] shadow-[0_12px_40px_rgba(255,255,255,0.14)] transition hover:scale-[1.02] hover:bg-violet-100 sm:w-auto"
                    >
                      {t.leadership.cta}
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0f4a] text-white transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandMark className="text-lg tracking-[0.08em] text-white/90" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
            <a href="#projetos" className="hover:text-white">{t.footer.projects}</a>
            <a href="#servicos" className="hover:text-white">{t.footer.services}</a>
            <a href="#tecnologias" className="hover:text-white">{t.footer.tech}</a>
            <a href="#contato" className="hover:text-white">{t.footer.contact}</a>
            <Link href="/gabriel-portfolio-completo" className="hover:text-white">{t.footer.portfolio}</Link>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} YOP Devs</p>
        </div>
      </footer>
      </div>

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
    <LandingLanguageProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0a1740] text-white/50">
            …
          </div>
        }
      >
        <LandingPageContent />
      </Suspense>
    </LandingLanguageProvider>
  )
}
