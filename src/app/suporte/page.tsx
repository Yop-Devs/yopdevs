"use client"
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
export default function SupportPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error?.message ?? 'Falha ao enviar. Tente novamente.')
        setStatus('idle')
        return
      }
      setStatus('success')
      setFormData({ name: '', email: '', message: '' })
      setTimeout(() => setStatus('idle'), 5000)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link href="/" className="flex items-center">
            <Image src="/homeimage.png" alt="YOP DEVS" width={220} height={70} className="h-12 w-auto object-contain" unoptimized />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link href="/termos" className="text-slate-600 hover:text-[#4c1d95]">Termos</Link>
            <Link href="/privacidade" className="text-slate-600 hover:text-[#4c1d95]">Privacidade</Link>
            <Link href="/suporte" className="text-[#4c1d95]">Suporte</Link>
          </nav>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Suporte</h1>
          <p className="text-slate-500 text-sm mb-6">Envie sua dúvida ou sugestão.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-medium">
              {error}
            </div>
          )}
          {status === 'success' ? (
            <div className="bg-violet-50 border border-violet-200 p-6 rounded-2xl text-center">
              <p className="text-[#4c1d95] font-bold text-sm">Mensagem enviada com sucesso!</p>
              <p className="text-slate-600 text-xs mt-1">Responderemos em até 24 horas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Seu nome"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Seu e-mail"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <textarea
                placeholder="Descreva o problema ou sugestão"
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm resize-none"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-4 bg-[#4c1d95] text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition-all disabled:opacity-60"
              >
                {status === 'sending' ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          )}

          <Link href="/" className="block text-center mt-6 text-sm font-semibold text-slate-500 hover:text-[#4c1d95] transition-colors">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
