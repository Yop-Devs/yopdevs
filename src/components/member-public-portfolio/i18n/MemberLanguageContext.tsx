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
  dateLocaleForMember,
  detectMemberPortfolioLanguage,
  htmlLangForMember,
  isMemberPortfolioLanguage,
  memberLocales,
  type MemberPortfolioLanguage,
  type MemberLocaleStrings,
} from './memberLocales'

const STORAGE_KEY = 'yop-u-portfolio-lang'

type Ctx = {
  language: MemberPortfolioLanguage
  setLanguage: (lang: MemberPortfolioLanguage) => void
  t: MemberLocaleStrings
  dateLocale: string
}

const MemberLanguageContext = createContext<Ctx | null>(null)

export function MemberPortfolioLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MemberPortfolioLanguage>('pt-br')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let next: MemberPortfolioLanguage = detectMemberPortfolioLanguage()
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && isMemberPortfolioLanguage(saved)) next = saved
    } catch {
      /* ignore */
    }
    setLanguageState(next)
    setHydrated(true)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = htmlLangForMember(next)
    }
  }, [])

  const setLanguage = useCallback((lang: MemberPortfolioLanguage) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = htmlLangForMember(lang)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    document.documentElement.lang = htmlLangForMember(language)
  }, [language, hydrated])

  const value = useMemo<Ctx>(
    () => ({
      language,
      setLanguage,
      t: memberLocales[language],
      dateLocale: dateLocaleForMember(language),
    }),
    [language, setLanguage]
  )

  return <MemberLanguageContext.Provider value={value}>{children}</MemberLanguageContext.Provider>
}

export function useMemberPortfolioLanguage() {
  const ctx = useContext(MemberLanguageContext)
  if (!ctx) throw new Error('useMemberPortfolioLanguage must be used within MemberPortfolioLanguageProvider')
  return ctx
}
