'use client'

import type { ReactNode } from 'react'
import { MemberPortfolioLanguageProvider } from './i18n/MemberLanguageContext'

export default function MemberPortfolioProviders({ children }: { children: ReactNode }) {
  return <MemberPortfolioLanguageProvider>{children}</MemberPortfolioLanguageProvider>
}
