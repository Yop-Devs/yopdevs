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
    <section className="bg-gradient-hero relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
          <div className="relative animate-float">
            <div className="animate-pulse-glow h-56 w-56 overflow-hidden rounded-full border-2 border-[hsl(var(--primary)/0.35)] shadow-glow lg:h-72 lg:w-72">
              {!imgFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={candidateIndex}
                  src={PORTRAIT_CANDIDATES[candidateIndex]}
                  alt="Retrato profissional de Gabriel Carrara"
                  className="h-full w-full object-cover"
                  onError={onPortraitError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.35)] to-[hsl(var(--card))] text-5xl font-black text-[hsl(var(--foreground))]">
                  GC
                </div>
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-4 border-[hsl(var(--background))] bg-emerald-500"
              title="Disponível"
            />
          </div>

          <div className="max-w-2xl text-center lg:text-left">
            <p className="animate-fade-in-up mb-2 font-mono text-sm text-[hsl(var(--primary))]">{t.hero.greeting}</p>
            <h1
              className="animate-fade-in-up mb-4 text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '0.1s' }}
            >
              Gabriel Costa Carrara
            </h1>
            <p
              className="animate-fade-in-up mb-4 text-lg font-medium text-[hsl(var(--primary))] sm:text-xl"
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--primary)/0.35)] px-6 py-3 font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.1)]"
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
