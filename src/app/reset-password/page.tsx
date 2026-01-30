"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div className="min-h-screen bg-[#050505] text-white font-sans flex items-center justify-center p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-indigo-600/10 blur-[100px] rounded-full"></div>
      
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Nova Chave</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Defina sua nova senha de acesso</p>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-2xl text-sm font-medium ${message.type === 'success' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input 
            type="password" 
            placeholder="Nova Senha" 
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Confirmar Nova Senha" 
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 hover:text-white transition-all shadow-xl shadow-white/5"
          >
            {loading ? "Processando..." : "Atualizar Credenciais"}
          </button>
        </form>
      </div>
    </div>
  )
}