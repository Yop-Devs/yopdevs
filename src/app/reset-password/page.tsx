"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem!' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Redirecionando...' })
      setTimeout(() => { window.location.href = '/' }, 1500)
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <Logo variant="dark" size="lg" />
        <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mt-3">Defina sua nova senha</p>
      </div>
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-violet-50 text-violet-800 border border-violet-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Nova senha"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-slate-900 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-slate-900 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#4c1d95] text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition-all disabled:opacity-60"
          >
            {loading ? 'Processando...' : 'Atualizar senha'}
          </button>
        </form>
      </div>
      <p className="mt-6 text-xs text-slate-500">© 2026 YOP Devs</p>
    </div>
  )
}
