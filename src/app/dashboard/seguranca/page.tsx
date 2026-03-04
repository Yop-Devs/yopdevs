'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PasswordStrength = 'weak' | 'medium' | 'strong' | null

function getPasswordStrength(password: string): PasswordStrength {
  if (!password.length) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/\d/.test(password)) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Navegador'
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return 'Navegador'
}

function formatLoginTime(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoje às ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Ontem às ${time}`
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SecurityPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sessionCreatedAt, setSessionCreatedAt] = useState<Date | null>(null)
  const [endingSession, setEndingSession] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.created_at) setSessionCreatedAt(new Date(Number(session.created_at) * 1000))
    })
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus({ type: 'error', text: error.message })
      setTimeout(() => setStatus(null), 5000)
    } else {
      setStatus({ type: 'success', text: 'Senha atualizada com sucesso 🔐' })
      setPassword('')
      setTimeout(() => setStatus(null), 5000)
    }
    setLoading(false)
  }

  const handleEndSession = async () => {
    setEndingSession(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const browserName = typeof navigator !== 'undefined' ? getBrowserName() : 'Navegador'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0 space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Segurança da Conta</h1>
        <p className="text-slate-500 text-sm mt-2">Gerencie sua senha e proteja sua conta.</p>
      </header>

      {status && (
        <div
          className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.text}
        </div>
      )}

      {/* Card: Alterar senha */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">Alterar senha</h2>
          <p className="text-slate-500 text-sm mt-0.5">Escolha uma senha forte para manter sua conta protegida.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nova senha</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Força:</span>
                <div className="flex gap-1">
                  <span
                    className={`h-1.5 flex-1 rounded-full max-w-12 ${
                      strength === 'weak' ? 'bg-red-400' : strength === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                    } ${!strength ? 'bg-slate-200' : ''}`}
                  />
                  <span
                    className={`h-1.5 flex-1 rounded-full max-w-12 ${
                      strength === 'medium' || strength === 'strong' ? (strength === 'strong' ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`h-1.5 flex-1 rounded-full max-w-12 ${strength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  />
                </div>
                <span
                  className={`text-xs font-bold ${
                    strength === 'weak'
                      ? 'text-red-600'
                      : strength === 'medium'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {strength === 'weak' ? 'Fraca' : strength === 'medium' ? 'Média' : 'Forte'}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Use pelo menos 8 caracteres, incluindo números e símbolos.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? 'Atualizando...' : 'Atualizar senha com segurança'}
          </button>
        </form>
      </section>

      {/* Sessões ativas */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">Sessões ativas</h2>
          <p className="text-slate-500 text-sm mt-0.5">Dispositivos onde você está conectado.</p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p className="font-semibold text-slate-800">Este dispositivo</p>
              <p className="text-slate-600">
                <span className="text-slate-500">Navegador:</span> {browserName}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-500">Local:</span> Sessão atual
              </p>
            </div>
            <button
              type="button"
              onClick={handleEndSession}
              disabled={endingSession}
              className="shrink-0 px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              {endingSession ? 'Encerrando...' : 'Encerrar sessão'}
            </button>
          </div>
        </div>
      </section>

      {/* Login recente */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">Login recente</h2>
          <p className="text-slate-500 text-sm mt-0.5">Últimos acessos à sua conta.</p>
        </div>
        <div className="p-5 sm:p-6">
          <ul className="space-y-3">
            <li className="flex items-center gap-3 py-2 text-sm text-slate-700 border-b border-slate-100 last:border-0">
              <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span>
                Login realizado neste dispositivo — {browserName} —{' '}
                {sessionCreatedAt ? formatLoginTime(sessionCreatedAt) : 'Sessão atual'}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* 2FA Em breve */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Autenticação em dois fatores (2FA)</h2>
            <p className="text-slate-500 text-sm mt-0.5">Proteção extra com código no celular.</p>
          </div>
          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
            Em breve
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-sm text-slate-600">
            Em breve você poderá ativar a autenticação em dois fatores para aumentar ainda mais a segurança da sua conta.
          </p>
        </div>
      </section>
    </div>
  )
}
