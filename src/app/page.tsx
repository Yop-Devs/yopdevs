"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log("🚀 Iniciando tentativa de login para:", email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("❌ Erro do Supabase:", error.message)
        alert(`Erro: ${error.message}`)
        return
      }

      if (data.session) {
        console.log("✅ Login realizado com sucesso!")
        console.log("Token de acesso:", data.session.access_token.substring(0, 15) + "...")
        
        // Teste crucial: Verificar se o cookie foi gravado
        const hasCookie = document.cookie.includes('sb-') || document.cookie.includes('yop-auth-token')
        console.log("🍪 Cookie gravado no navegador?", hasCookie ? "SIM" : "NÃO (Problema de Domínio)")

        if (!hasCookie) {
          console.warn("⚠️ O login funcionou, mas o navegador REJEITOU o cookie. Verifique as Redirect URLs no Supabase.")
        }

        // Forçar redirecionamento manual se o middleware falhar
        window.location.href = '/dashboard'
      }
    } catch (err) {
      console.error("💥 Erro inesperado:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md space-y-8 border p-8 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-center">Autenticar Sessão</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Seu email"
            className="w-full p-3 border rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Sua senha"
            className="w-full p-3 border rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "CARREGANDO..." : "AUTENTICAR SESSÃO"}
          </button>
        </form>
      </div>
    </main>
  )
}