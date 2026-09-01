'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/allowed-emails'
import BrandMark from '@/components/BrandMark'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [siteHome, setSiteHome] = useState('/')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'unauthorized') {
      setError('Acesso restrito. Esta conta não está autorizada.')
    } else if (err === 'auth-code-error') {
      setError('Falha na autenticação. Tente novamente.')
    }
  }, [searchParams])

  useEffect(() => {
    const host = window.location.hostname.toLowerCase()
    if (host.startsWith('admin.')) {
      setSiteHome(host.includes('localhost') ? 'http://localhost:3000' : 'https://yopdevs.com.br')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user?.email && isEmailAllowed(session.user.email)) {
        router.replace('/admin/sistemas')
        return
      }
      setChecking(false)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!isEmailAllowed(email)) {
      setError('Este e-mail não tem permissão para acessar o admin.')
      return
    }

    setLoading(true)
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signError) {
        const msg = signError.message.toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
          setError('E-mail ou senha incorretos.')
        } else {
          setError(signError.message)
        }
        return
      }
      router.replace('/admin/sistemas')
    } finally {
      setLoading(false)
    }
  }

  async function onReset() {
    setError(null)
    setInfo(null)
    if (!email.trim()) {
      setError('Informe o e-mail para redefinir a senha.')
      return
    }
    if (!isEmailAllowed(email)) {
      setError('Este e-mail não tem permissão para acessar o admin.')
      return
    }
    setLoading(true)
    try {
      const origin = window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setInfo('Enviamos um link de redefinição para o seu e-mail.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071338] text-sm text-white/70">
        Verificando sessão...
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white"
      style={{ background: 'linear-gradient(165deg, #071338 0%, #1b0f4d 45%, #0a1845 100%)' }}
    >
      <div className="mb-8">
        <BrandMark className="text-2xl tracking-[0.1em]" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#120a38]/90 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight">Admin YOP Devs</h1>
        <p className="mt-1 text-sm text-white/55">Entre com a conta autorizada para gerenciar os sistemas.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {info}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-medium text-white/50">
              E-mail
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none ring-violet-300/40 placeholder:text-white/30 focus:ring-2"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-xs font-medium text-white/50">
              Senha
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none ring-violet-300/40 placeholder:text-white/30 focus:ring-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1a0f4a] transition hover:bg-violet-100 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-white/50">
          <button type="button" onClick={onReset} disabled={loading} className="hover:text-white hover:underline">
            Esqueci a senha
          </button>
          <a href={siteHome} className="hover:text-white hover:underline">
            Voltar ao site
          </a>
        </div>
      </div>
    </div>
  )
}
