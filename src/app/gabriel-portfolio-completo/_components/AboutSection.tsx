'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { MapPin, Calendar, Briefcase, Heart } from 'lucide-react'
import PortfolioReveal from './PortfolioReveal'

export default function AboutSection() {
  const { t } = useLanguage()

  const info = [
    { icon: MapPin, label: t.about.location, value: 'Pontes e Lacerda, MT, Brasil' },
    { icon: Calendar, label: t.about.age, value: t.about.years },
    { icon: Briefcase, label: t.about.status, value: t.about.statusValue },
    { icon: Heart, label: t.about.maritalStatus, value: t.about.married },
  ]

  return (
    <section id="about" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PortfolioReveal variant="up">
          <h2 className="mb-4 text-center text-3xl font-bold lg:text-4xl">
            <span className="text-gradient">{t.about.title}</span>
          </h2>
        </PortfolioReveal>

        <PortfolioReveal variant="blur" delay={1}>
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            <p className="text-center leading-relaxed text-[hsl(var(--muted-foreground))]">{t.about.description}</p>
            <p className="text-center font-medium italic text-[hsl(var(--primary)/0.9)]">{t.about.highlight}</p>
          </div>
        </PortfolioReveal>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {info.map((item, i) => (
            <PortfolioReveal key={item.label} variant="scale" delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
              <div className="glass rounded-xl p-5 text-center transition-colors hover:border-[hsl(var(--primary)/0.35)]">
                <item.icon className="mx-auto mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{item.label}</p>
                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.value}</p>
              </div>
            </PortfolioReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
