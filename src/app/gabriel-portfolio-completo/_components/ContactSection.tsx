'use client'

import { useLanguage } from '../i18n/LanguageContext'
import { Mail, Phone, MapPin, MessageCircle, Linkedin, Instagram } from 'lucide-react'

export default function ContactSection() {
  const { t } = useLanguage()

  return (
    <section id="contact" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-3xl font-bold lg:text-4xl">
          <span className="text-gradient">{t.contact.title}</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-[hsl(var(--muted-foreground))]">{t.contact.subtitle}</p>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="mailto:gabrielcarrarapessoal@gmail.com"
              className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
            >
              <Mail className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
              <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.contact.email}</p>
              <p className="break-all text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                gabrielcarrarapessoal@gmail.com
              </p>
            </a>

            <a
              href="https://wa.me/5565992263485"
              target="_blank"
              rel="noopener noreferrer"
              className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
            >
              <Phone className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
              <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.contact.phone}</p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                +55 65 99226-3485
              </p>
            </a>

            <a
              href="https://www.linkedin.com/in/gabriel-carrara/"
              target="_blank"
              rel="noopener noreferrer"
              className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
            >
              <Linkedin className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
              <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">LinkedIn</p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                gabriel-carrara
              </p>
            </a>

            <a
              href="https://www.instagram.com/gabriel.carrara_"
              target="_blank"
              rel="noopener noreferrer"
              className="glass group rounded-xl p-5 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
            >
              <Instagram className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
              <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">Instagram</p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
                @gabriel.carrara_
              </p>
            </a>
          </div>

          <div className="glass mb-8 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[hsl(var(--primary))]" />
              <div>
                <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{t.contact.address}</p>
                <p className="text-sm text-[hsl(var(--foreground))]">
                  Rua Antonio Bento Neto, 887 — Bairro Santa Cruz
                  <br />
                  Pontes e Lacerda — Mato Grosso, Brasil
                  <br />
                  CEP: 78250-000
                </p>
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </section>
  )
}
