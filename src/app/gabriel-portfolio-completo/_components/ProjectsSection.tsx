'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'

const projectLinks = {
  plify: 'https://plify360.com.br',
  westham: 'https://westham.com.br',
  tryly: 'https://www.tryly.com.br',
  fenix: 'https://www.fenixgestora.com.br',
  yopdevs: 'https://www.yopdevs.com.br',
  demolay: 'https://capitulo862.vercel.app',
} as const

const projectKeys = ['plify', 'westham', 'tryly', 'fenix', 'yopdevs', 'demolay'] as const

/** Query `v` só para invalidar cache do browser quando trocas o ficheiro */
const projectImages: Record<(typeof projectKeys)[number], string> = {
  plify: '/projetos/plify.png?v=3',
  westham: '/projetos/westham.webp?v=2',
  tryly: '/projetos/tryly.png?v=20260412',
  fenix: '/projetos/fenix.png',
  yopdevs: '/projetos/yopdevs.png',
  demolay: '/projetos/capitulo.webp',
}

/** Faixa do logo: mesma cor em todos os cards (contraste para logos claros/escuros) */
const LOGO_STRIP_BG = 'bg-[hsl(222_24%_7%)]'

const logoStripSize =
  'max-h-14 w-auto max-w-[min(100%,12rem)] object-contain object-center sm:max-h-16 sm:max-w-[min(100%,13rem)]'

const logoSizeClass: Record<(typeof projectKeys)[number], string> = {
  plify: logoStripSize,
  westham: logoStripSize,
  tryly: logoStripSize,
  fenix: logoStripSize,
  yopdevs: logoStripSize,
  demolay: logoStripSize,
}

const projectColors = [
  'from-blue-500/30 to-cyan-500/30',
  'from-emerald-500/30 to-teal-500/30',
  'from-violet-500/30 to-purple-500/30',
  'from-orange-500/30 to-amber-500/30',
  'from-rose-500/30 to-pink-500/30',
  'from-indigo-500/30 to-blue-500/30',
]

function ProjectCard({ pKey, index }: { pKey: (typeof projectKeys)[number]; index: number }) {
  const { t } = useLanguage()
  const project = t.projects.items[pKey]
  const link = projectLinks[pKey]
  const src = projectImages[pKey]
  const [imgFailed, setImgFailed] = useState(false)
  const gradient = projectColors[index] ?? projectColors[0]
  return (
    <div className="glass group overflow-hidden rounded-xl transition-all hover:border-[hsl(var(--primary)/0.35)] hover:shadow-glow">
      <div
        className={cn(
          'relative flex min-h-[6rem] items-center justify-center overflow-hidden px-4 py-3 sm:min-h-[6.75rem] sm:px-5 sm:py-4',
          LOGO_STRIP_BG
        )}
      >
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={project.name}
            className={cn(
              logoSizeClass[pKey],
              'relative z-10 transition-transform duration-300 group-hover:scale-[1.03]'
            )}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={`h-16 w-full max-w-[12rem] rounded-md bg-gradient-to-br ${gradient}`} aria-hidden />
        )}
      </div>
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-6">
        <h3 className="mb-2 text-lg font-bold text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
          {project.name}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{project.description}</p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
        >
          {t.projects.visit}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function ProjectsSection() {
  const { t } = useLanguage()

  return (
    <section id="projects" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
          <span className="text-gradient">{t.projects.title}</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.projects.subtitle}</p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectKeys.map((key, i) => (
            <ProjectCard key={key} pKey={key} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
