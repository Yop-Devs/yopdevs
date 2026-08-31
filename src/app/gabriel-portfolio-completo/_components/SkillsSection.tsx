'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { TECH_STACK } from '@/lib/featured-projects'
import { TechBrandIcon } from '@/components/TechBrandIcon'
import PortfolioReveal from './PortfolioReveal'

export default function SkillsSection() {
  const { t } = useLanguage()

  return (
    <section id="skills" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PortfolioReveal variant="left">
          <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
            <span className="text-gradient">{t.skills.title}</span>
          </h2>
        </PortfolioReveal>
        <PortfolioReveal variant="right" delay={1}>
          <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.skills.subtitle}</p>
        </PortfolioReveal>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {TECH_STACK.map((tech, i) => (
            <PortfolioReveal key={tech.name} variant="up" delay={((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6}>
              <div className="group flex items-center gap-3 rounded-2xl border border-sky-400/15 bg-slate-800/35 px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-sky-400/35 hover:bg-slate-800/55 hover:shadow-[0_8px_28px_rgba(56,189,248,0.12)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition group-hover:scale-105">
                  <TechBrandIcon
                    slug={tech.slug}
                    color={tech.color}
                    local={'local' in tech ? tech.local : undefined}
                    name={tech.name}
                  />
                </span>
                <span className="min-w-0 text-sm font-medium text-slate-100/90">{tech.name}</span>
              </div>
            </PortfolioReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
