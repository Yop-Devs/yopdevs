'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  detectLanguageFromNavigator,
  htmlLangFor,
  isLanguage,
  translations,
  type Language,
  type Translations,
} from './translations'

const STORAGE_KEY = 'yopdevs-lang'
const LEGACY_PORTFOLIO_KEY = 'portfolio-lang'

type Ctx = {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<Ctx | null>(null)

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt-br')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let next: Language = detectLanguageFromNavigator()
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_PORTFOLIO_KEY)
      if (saved && isLanguage(saved)) next = saved
    } catch {
      /* ignore */
    }
    setLanguageState(next)
    setHydrated(true)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = htmlLangFor(next)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
      localStorage.setItem(LEGACY_PORTFOLIO_KEY, lang)
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = htmlLangFor(lang)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    document.documentElement.lang = htmlLangFor(language)
  }, [language, hydrated])

  const value = useMemo<Ctx>(
    () => ({
      language,
      setLanguage,
      t: translations[language] as Translations,
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLandingLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLandingLanguage must be used within LandingLanguageProvider')
  return ctx
}
