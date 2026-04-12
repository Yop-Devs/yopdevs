'use client'

import { useLanguage } from '../i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-[hsl(var(--border)/0.5)] py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} Gabriel Costa Carrara. {t.footer.rights}
        </p>
      </div>
    </footer>
  )
}
