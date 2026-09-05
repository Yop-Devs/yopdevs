'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import TurnstileWidget, { isTurnstileConfigured } from '@/components/TurnstileWidget'

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '', website: '' })
  const [turnstileToken, setTurnstileToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const captchaOn = isTurnstileConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    if (captchaOn && !turnstileToken) {
      setError('Confirme o captcha antes de enviar.')
      setStatus('idle')
      return
    }
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error?.message ?? 'Falha ao enviar. Tente novamente.')
        setStatus('idle')
        setTurnstileToken('')
        return
      }
      setStatus('success')
      setFormData({ name: '', email: '', message: '', website: '' })
      setTurnstileToken('')
      setTimeout(() => setStatus('idle'), 5000)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setStatus('idle')
    }
  }

  return (
    <div className="flex min-h-screen min-w-0 max-w-full flex-col items-center justify-center bg-slate-100 px-4 py-6 text-slate-900 sm:p-6">
      <div className="w-full min-w-0 max-w-md">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/yop-logo.png?v=2"
              alt="YOP DEVS"
              width={220}
              height={70}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link href="/termos" className="text-slate-600 hover:text-[#4c1d95]">
              Termos
            </Link>
            <Link href="/privacidade" className="text-slate-600 hover:text-[#4c1d95]">
              Privacidade
            </Link>
            <Link href="/suporte" className="text-[#4c1d95]">
              Suporte
            </Link>
          </nav>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-black text-slate-900">Suporte</h1>
          <p className="mb-6 text-sm text-slate-500">Envie sua dúvida ou sugestão.</p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          {status === 'success' ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 text-center">
              <p className="text-sm font-bold text-[#4c1d95]">Mensagem enviada com sucesso!</p>
              <p className="mt-1 text-xs text-slate-600">Responderemos em até 24 horas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
              />
              <input
                type="text"
                placeholder="Seu nome"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#4c1d95]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Seu e-mail"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#4c1d95]"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <textarea
                placeholder="Descreva o problema ou sugestão"
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#4c1d95]"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              {captchaOn ? (
                <TurnstileWidget
                  theme="light"
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                />
              ) : null}
              <button
                type="submit"
                disabled={status === 'sending' || (captchaOn && !turnstileToken)}
                className="w-full rounded-xl bg-[#4c1d95] py-4 text-sm font-bold text-white transition-all hover:bg-violet-800 disabled:opacity-60"
              >
                {status === 'sending' ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          )}

          <Link
            href="/"
            className="mt-6 block text-center text-sm font-semibold text-slate-500 transition-colors hover:text-[#4c1d95]"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
