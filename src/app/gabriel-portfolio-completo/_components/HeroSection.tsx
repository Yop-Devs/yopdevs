'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { ArrowDown, MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Tenta primeiro o caminho que costuma existir no teu deploy; depois o ficheiro em /public. */
const PORTRAIT_CANDIDATES = ['/@public/fotogabrielcarrara.jpeg', '/fotogabrielcarrara.jpeg'] as const

export default function HeroSection() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [projectsHref, setProjectsHref] = useState('#projects')
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setProjectsHref(`${window.location.origin}${pathname}#projects`)
  }, [pathname])

  function onPortraitError() {
    setCandidateIndex((i) => {
      if (i < PORTRAIT_CANDIDATES.length - 1) return i + 1
      setImgFailed(true)
      return i
    })
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="gop-orb gop-orb-a absolute -left-16 top-[18%] h-64 w-64 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="gop-orb gop-orb-b absolute -right-20 top-[28%] h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="gop-orb gop-orb-c absolute bottom-[12%] left-[38%] h-56 w-56 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(12,20,36,0.25)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
          <div className="relative shrink-0">
            <div className="relative overflow-hidden rounded-2xl border border-slate-500/25 bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-2">
              <div className="relative h-72 w-64 overflow-hidden rounded-xl bg-slate-900 sm:h-80 sm:w-72 sm:rounded-2xl">
                {!imgFailed ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={candidateIndex}
                      src={PORTRAIT_CANDIDATES[candidateIndex]}
                      alt="Retrato profissional de Gabriel Carrara"
                      className="relative h-full w-full object-cover object-[center_12%] brightness-[1.02] contrast-[1.03]"
                      onError={onPortraitError}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-900/20"
                      aria-hidden
                    />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-5xl font-black text-slate-100">
                    GC
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-2xl text-center lg:text-left">
            <p className="animate-fade-in-up mb-2 font-mono text-sm tracking-wide text-sky-300/80">{t.hero.greeting}</p>
            <h1
              className="animate-fade-in-up mb-4 text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '0.1s' }}
            >
              Gabriel Costa Carrara
            </h1>
            <p
              className="animate-fade-in-up mb-4 text-lg font-medium text-sky-200/90 sm:text-xl"
              style={{ animationDelay: '0.2s' }}
            >
              {t.hero.role}
            </p>
            <p
              className="animate-fade-in-up mb-8 leading-relaxed text-[hsl(var(--muted-foreground))]"
              style={{ animationDelay: '0.3s' }}
            >
              {t.hero.subtitle}
            </p>
            <div
              className="animate-fade-in-up flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
              style={{ animationDelay: '0.4s' }}
            >
              <a
                href={projectsHref}
                className="bg-gradient-primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
              >
                {t.hero.cta}
                <ArrowDown className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/5565992263485"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-500/35 bg-slate-800/30 px-6 py-3 font-semibold text-slate-100 transition-colors hover:bg-slate-700/40"
              >
                <MessageCircle className="h-4 w-4" />
                {t.hero.contact}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
