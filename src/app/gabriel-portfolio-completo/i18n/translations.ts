import { ptBr } from './locales/pt-br'
import { ptPt } from './locales/pt-pt'
import { en } from './locales/en'
import { fr } from './locales/fr'
import { es } from './locales/es'

export type Language = 'pt-br' | 'pt-pt' | 'en' | 'fr' | 'es'

export const languageLabels: Record<Language, string> = {
  'pt-br': '🇧🇷 PT-BR',
  'pt-pt': '🇵🇹 PT-PT',
  en: '🇬🇧 EN',
  fr: '🇫🇷 FR',
  es: '🇪🇸 ES',
}

export const translations = {
  'pt-br': ptBr,
  'pt-pt': ptPt,
  en,
  fr,
  es,
} as const

export type Translations = (typeof translations)['pt-br']

const LANGUAGES: Language[] = ['pt-br', 'pt-pt', 'en', 'fr', 'es']

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as string[]).includes(value)
}

export function detectLanguageFromNavigator(): Language {
  if (typeof navigator === 'undefined') return 'pt-br'
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('pt-br')) return 'pt-br'
  if (browserLang.startsWith('pt')) return 'pt-pt'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('es')) return 'es'
  return 'en'
}

export function htmlLangFor(language: Language): string {
  switch (language) {
    case 'pt-br':
      return 'pt-BR'
    case 'pt-pt':
      return 'pt'
    case 'en':
      return 'en'
    case 'fr':
      return 'fr'
    case 'es':
      return 'es'
    default:
      return 'pt-BR'
  }
}
