// src/app/welcome/page.tsx
'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const supabase = createClient()
  const router = useRouter()

  const enterDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ role: 'MEMBER' }).eq('id', user.id)
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-black text-indigo-600 mb-2 italic">YOP!</h1>
      <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">Bem-vindo à rede</h2>
      <p className="text-slate-500 mb-10 max-w-md">Poste no fórum, crie projetos e converse com amigos. Todos têm acesso às mesmas ferramentas.</p>
      <button
        onClick={enterDashboard}
        className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg"
      >
        Entrar no dashboard
      </button>
    </div>
  )
}