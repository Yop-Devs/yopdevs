'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [sessionCreatedAt, setSessionCreatedAt] = useState<Date | null>(null)
  const [endingSession, setEndingSession] = useState(false)
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)
  const [accountDeletePassword, setAccountDeletePassword] = useState('')
  const [accountDeleting, setAccountDeleting] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const created = session && 'created_at' in session ? (session as { created_at: number }).created_at : null
      if (created) setSessionCreatedAt(new Date(Number(created) * 1000))
      else if (session) setSessionCreatedAt(new Date())
    })
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Senha atualizada com sucesso.')
      setPassword('')
    }
    setLoading(false)
  }

  const handleEndSession = async () => {
    setEndingSession(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const confirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    const pwd = accountDeletePassword.trim()
    if (!pwd) {
      toast.error('Introduz a tua senha.')
      return
    }
    setAccountDeleting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Sessão inválida. Inicia sessão de novo.')
        setAccountDeleting(false)
        return
      }
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: pwd }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error || 'Não foi possível excluir a conta.')
        setAccountDeleting(false)
        return
      }
      setAccountDeleteOpen(false)
      setAccountDeletePassword('')
      toast.success('Conta eliminada.')
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Erro de rede ao excluir a conta.')
    } finally {
      setAccountDeleting(false)
    }
  }

  const browserName = typeof navigator !== 'undefined' ? getBrowserName() : 'Navegador'

  return (
    <div className="max-w-2xl mx-auto w-full min-w-0 px-4 sm:px-6 space-y-4 sm:space-y-6 md:space-y-8">
      <header>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Segurança da Conta</h1>
        <p className="text-slate-500 text-sm mt-2">Gerencie sua senha e proteja sua conta.</p>
      </header>

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
            className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm min-w-0"
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

      {/* Zona de perigo — excluir conta */}
      <section className="overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50/50 shadow-sm">
        <div className="border-b border-red-100 bg-red-50/80 px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-red-900">Zona de perigo</h2>
          <p className="mt-0.5 text-sm text-red-900/85">
            Elimina a tua conta de utilizador e o acesso à YOP Devs. O servidor remove o registo de autenticação; dados
            ligados ao teu utilizador na base (perfil, portfólio, posts, amigos, agenda, etc.) são apagados em cascata
            conforme as regras da base de dados.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setAccountDeleteOpen(true)}
            className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-50"
          >
            Excluir conta permanentemente
          </button>
        </div>
      </section>

      <Dialog
        open={accountDeleteOpen}
        onOpenChange={(open) => {
          setAccountDeleteOpen(open)
          if (!open) setAccountDeletePassword('')
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Excluir conta para sempre?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Esta ação é irreversível. Confirma com a tua senha de acesso (email e senha). Se usas só login social,
              define uma senha aqui em &quot;Alterar senha&quot; antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void confirmDeleteAccount(e)} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="account-delete-password">
                Senha atual
              </label>
              <input
                id="account-delete-password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={accountDeletePassword}
                onChange={(e) => setAccountDeletePassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={() => setAccountDeleteOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={accountDeleting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {accountDeleting ? 'A eliminar…' : 'Sim, excluir a minha conta'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
