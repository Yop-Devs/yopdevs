'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { languageLabels, type Language } from '../i18n/translations'
import { Globe } from 'lucide-react'

const ALL_LANGS: Language[] = ['pt-br', 'pt-pt', 'en', 'fr', 'es']

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
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
      >
        <Globe className="h-4 w-4 text-[hsl(var(--primary))]" />
        <span>{languageLabels[language]}</span>
      </button>
      {open ? (
        <div className="glass shadow-card absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg py-2">
          {ALL_LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--primary)/0.12)] ${
                lang === language ? 'font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
