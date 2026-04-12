'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { Building2, ChevronRight } from 'lucide-react'

const EXPERIENCE_ORDER = ['fenix', 'gazin'] as const

export default function ExperienceSection() {
  const { t } = useLanguage()

  return (
    <section id="experience" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
          <span className="text-gradient">{t.experience.title}</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.experience.subtitle}</p>

        <div className="mx-auto max-w-3xl space-y-6">
          {EXPERIENCE_ORDER.map((key) => {
            const item = t.experience.items[key]
            return (
              <div
                key={key}
                className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.12)]">
                    <Building2 className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-bold text-[hsl(var(--foreground))]">{item.company}</h3>
                      <span className="font-mono text-xs text-[hsl(var(--primary))]">{item.period}</span>
                    </div>
                    <p className="mb-3 flex items-center gap-1 text-sm font-medium text-[hsl(var(--primary)/0.85)]">
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      {item.role}
                    </p>
                    <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
