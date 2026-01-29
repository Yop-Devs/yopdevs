"use client"
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans p-6 md:p-20">
      <div className="max-w-3xl mx-auto space-y-12">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
          Voltar ao Terminal
        </Link>
        
        <header>
          <h1 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter mb-4">Privacidade</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Protocolo de Proteção de Dados v1.0</p>
        </header>

        <section className="space-y-8 text-sm leading-relaxed border-t border-white/5 pt-10">
          <p>Sua privacidade é nossa prioridade. No Yop Devs, seus dados de navegação e credenciais são criptografados de ponta a ponta via Supabase Auth Protocol.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
              <h3 className="text-white font-bold uppercase mb-2">O que coletamos?</h3>
              <p className="text-xs text-slate-400">Nome, e-mail e data de nascimento para validação de perfil e segurança da rede.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
              <h3 className="text-white font-bold uppercase mb-2">Uso de Cookies</h3>
              <p className="text-xs text-slate-400">Utilizamos cookies apenas para manter sua sessão ativa e garantir que você não precise relogar a cada acesso.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}