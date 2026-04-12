'use client'

import { useLanguage } from '../i18n/LanguageContext'

const skillCategories = [
  {
    key: 'frontend' as const,
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Tailwind CSS'],
  },
  {
    key: 'backend' as const,
    skills: ['Node.js', 'Supabase', 'VPS', 'Vercel', 'PostgreSQL'],
  },
  {
    key: 'automation' as const,
    skills: ['WhatsApp Bot', 'Instagram Bot', 'Playwright', 'AI Integrations', 'Stripe', 'Mercado Pago'],
  },
  {
    key: 'tools' as const,
    skills: ['Git', 'GitHub', 'PWA', 'REST APIs', 'Google APIs', 'Logic & Problem Solving'],
  },
]

export default function SkillsSection() {
  const { t } = useLanguage()

  return (
    <section id="skills" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
          <span className="text-gradient">{t.skills.title}</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.skills.subtitle}</p>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {skillCategories.map((cat) => (
            <div
              key={cat.key}
              className="glass rounded-xl p-6 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
            >
              <h3 className="mb-4 font-mono text-sm font-semibold text-[hsl(var(--primary))]">
                {t.skills.categories[cat.key]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill}
                    className="cursor-default rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.2)] hover:text-[hsl(var(--primary))]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
