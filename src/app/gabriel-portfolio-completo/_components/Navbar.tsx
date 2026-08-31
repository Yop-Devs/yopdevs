'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '#about', label: t.nav.about },
    { href: '#skills', label: t.nav.skills },
    { href: '#projects', label: t.nav.projects },
    { href: '#experience', label: t.nav.experience },
    { href: '#education', label: t.nav.education },
    { href: '#contact', label: t.nav.contact },
  ]

  return (
    <nav className="glass gop-navbar fixed left-0 right-0 top-0 z-50 border-b border-[hsl(var(--border)/0.35)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/gabriel-portfolio-completo"
            className="group relative min-w-0 shrink text-left"
            onClick={() => setMobileOpen(false)}
          >
            <span className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg bg-sky-400/0 blur-md transition duration-500 group-hover:bg-sky-400/20" aria-hidden />
            <span className="gop-brand-shine relative block text-base font-bold leading-tight sm:text-xl">
              <span className="font-semibold tracking-wide">Portfolio</span>{' '}
              <span className="tracking-tight">Gabriel Carrara</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                {link.label}
              </a>
            ))}
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="text-[hsl(var(--foreground))]"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="glass border-t border-[hsl(var(--border)/0.5)] px-4 py-4 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </nav>
  )
}
