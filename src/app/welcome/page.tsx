// src/app/welcome/page.tsx
'use client'

import Image from 'next/image'
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
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2">
        <Image src="/logodash.png?v=3" alt="YOP DEVS" width={280} height={90} className="h-14 w-auto object-contain mx-auto" unoptimized />
      </h1>
      <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Bem-vindo à rede</h2>
      <p className="text-slate-600 mb-8 max-w-md text-sm">Poste no fórum, crie projetos e converse com amigos. Todos têm acesso às mesmas ferramentas.</p>
      <button
        onClick={enterDashboard}
        className="px-10 py-3.5 bg-[#4c1d95] text-white rounded-2xl font-bold text-sm hover:bg-violet-800 transition-all shadow-lg"
      >
        Entrar no dashboard
      </button>
    </div>
  )
}