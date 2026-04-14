'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { memberLanguageLabels, type MemberPortfolioLanguage } from './i18n/memberLocales'
import { useMemberPortfolioLanguage } from './i18n/MemberLanguageContext'

const ALL_LANGS: MemberPortfolioLanguage[] = ['pt-br', 'pt-pt', 'en', 'fr', 'es']

export default function MemberLanguageSwitcher() {
  const { language, setLanguage } = useMemberPortfolioLanguage()
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
        className="glass flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:border-[hsl(var(--primary)/0.5)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
        <span className="hidden sm:inline">{memberLanguageLabels[language]}</span>
        <span className="sm:hidden">{language.split('-')[0].toUpperCase()}</span>
      </button>
      {open ? (
        <div
          className="glass shadow-card absolute right-0 top-full z-[60] mt-2 min-w-[160px] rounded-lg py-2"
          role="listbox"
        >
          {ALL_LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={lang === language}
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--primary)/0.12)] ${
                lang === language ? 'font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
              }`}
            >
              {memberLanguageLabels[lang]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
