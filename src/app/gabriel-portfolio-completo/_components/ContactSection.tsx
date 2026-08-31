'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { Mail, Phone, MapPin, MessageCircle, Linkedin, Instagram } from 'lucide-react'
import PortfolioReveal from './PortfolioReveal'

const contactLinks = [
  {
    href: 'mailto:gabrielcarrarapessoal@gmail.com',
    icon: Mail,
    labelKey: 'email' as const,
    value: 'gabrielcarrarapessoal@gmail.com',
    external: false,
  },
  {
    href: 'https://wa.me/5565992263485',
    icon: Phone,
    labelKey: 'phone' as const,
    value: '+55 65 99226-3485',
    external: true,
  },
  {
    href: 'https://www.linkedin.com/in/gabriel-carrara/',
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'gabriel-carrara',
    external: true,
  },
  {
    href: 'https://www.instagram.com/gabriel.carrara_',
    icon: Instagram,
    label: 'Instagram',
    value: '@gabriel.carrara_',
    external: true,
  },
]

export default function ContactSection() {
  const { t } = useLanguage()

  return (
    <section id="contact" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PortfolioReveal variant="scale">
          <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
            <span className="text-gradient">{t.contact.title}</span>
          </h2>
        </PortfolioReveal>
        <PortfolioReveal variant="blur" delay={1}>
          <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.contact.subtitle}</p>
        </PortfolioReveal>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {contactLinks.map((item, i) => (
              <PortfolioReveal key={item.href} variant="up" delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                <a
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="glass group block rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                >
                  <item.icon className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
                  <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {'labelKey' in item && item.labelKey ? t.contact[item.labelKey] : item.label}
                  </p>
                  <p className="break-all text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                    {item.value}
                  </p>
                </a>
              </PortfolioReveal>
            ))}
          </div>

          <PortfolioReveal variant="left" delay={2}>
            <div className="glass mb-8 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[hsl(var(--primary))]" />
                <div>
                  <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.contact.address}</p>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    Rua Antonio Bento Neto, 887, Bairro Santa Cruz
                    <br />
                    Pontes e Lacerda, Mato Grosso, Brasil
                    <br />
                    CEP: 78250-000
                  </p>
                </div>
              </div>
            </div>
          </PortfolioReveal>

          <PortfolioReveal variant="up" delay={3}>
            <div className="text-center">
              <a
                href="https://wa.me/5565992263485"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-primary inline-flex items-center gap-2 rounded-lg px-8 py-3 text-lg font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-5 w-5" />
                {t.contact.sendMessage}
              </a>
            </div>
          </PortfolioReveal>
        </div>
      </div>
    </section>
  )
}
