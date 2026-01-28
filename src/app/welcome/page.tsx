// src/app/welcome/page.tsx
'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const supabase = createClient()
  const router = useRouter()

  const selectRole = async (role: 'DEV' | 'BUSINESS' | 'USER_IDEAS') => {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id)

      if (error) {
        console.error("Erro ao salvar perfil:", error.message)
        alert("Erro ao salvar sua escolha. Tente novamente.")
      } else {
        // Redireciona para a dashboard após salvar
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-black text-indigo-600 mb-2 italic">YOP!</h1>
      <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">Como você quer atuar hoje?</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <button 
          onClick={() => selectRole('DEV')}
          className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 transition-all group"
        >
          <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">👨‍💻</span>
          <h3 className="font-black text-indigo-600">SOU DEV</h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Quero codar e encontrar sócios.</p>
        </button>

        <button 
          onClick={() => selectRole('BUSINESS')}
          className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 transition-all group"
        >
          <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">💼</span>
          <h3 className="font-black text-indigo-600">SOU EMPRESÁRIO</h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Tenho capital e procuro talentos.</p>
        </button>

        <button 
          onClick={() => selectRole('USER_IDEAS')}
          className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 transition-all group"
        >
          <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">💡</span>
          <h3 className="font-black text-indigo-600">TENHO IDEIAS</h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Quero validar projetos e crescer.</p>
        </button>
      </div>
    </div>
  )
}