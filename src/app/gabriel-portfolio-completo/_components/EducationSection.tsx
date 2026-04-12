'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { GraduationCap, Award } from 'lucide-react'

const EDUCATION_ORDER = ['ifmt', 'cetep', 'senac', 'other'] as const

export default function EducationSection() {
  const { t } = useLanguage()

  return (
    <section id="education" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold lg:text-4xl">
          <span className="text-gradient">{t.education.title}</span>
        </h2>

        <div className="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          {EDUCATION_ORDER.map((key) => {
            const item = t.education.items[key]
            return (
              <div
                key={key}
                className="glass rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
              >
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 flex-shrink-0 text-[hsl(var(--primary))]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.institution}</h3>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.course}</p>
                    {item.year ? (
                      <span className="mt-1 inline-block font-mono text-xs text-[hsl(var(--primary))]">{item.year}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mx-auto max-w-3xl">
          <h3 className="mb-6 text-center text-xl font-bold text-[hsl(var(--foreground))]">{t.extras.title}</h3>
          <div className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]">
            <div className="flex items-start gap-4">
              <Award className="mt-0.5 h-6 w-6 flex-shrink-0 text-[hsl(var(--primary))]" />
              <div>
                <h4 className="font-bold text-[hsl(var(--foreground))]">{t.extras.demolay.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {t.extras.demolay.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
