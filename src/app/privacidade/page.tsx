"use client"
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="dark" size="sm" />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link href="/termos" className="text-slate-600 hover:text-[#4c1d95]">Termos de Uso</Link>
            <Link href="/privacidade" className="text-[#4c1d95]">Privacidade</Link>
            <Link href="/suporte" className="text-slate-600 hover:text-[#4c1d95]">Suporte</Link>
          </nav>
        </header>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900">Privacidade</h1>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proteção de Dados v1.0</p>

        <section className="space-y-6 text-sm leading-relaxed border-t border-slate-200 pt-8">
          <p className="text-slate-600">Sua privacidade é nossa prioridade. No YOP Devs, seus dados de navegação e credenciais são criptografados de ponta a ponta via Supabase Auth.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <h3 className="text-slate-900 font-bold mb-2">O que coletamos?</h3>
              <p className="text-slate-600 text-sm">Nome, e-mail e data de nascimento para validação de perfil e segurança da rede.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <h3 className="text-slate-900 font-bold mb-2">Uso de Cookies</h3>
              <p className="text-slate-600 text-sm">Utilizamos cookies apenas para manter sua sessão ativa.</p>
            </div>
          </div>
        </section>

        <footer className="pt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 text-xs text-slate-500">
          <span>© 2026 YOP Devs.</span>
          <nav className="flex gap-4 font-semibold">
            <Link href="/termos" className="hover:text-[#4c1d95]">Termos</Link>
            <Link href="/privacidade" className="text-[#4c1d95]">Privacidade</Link>
            <Link href="/suporte" className="hover:text-[#4c1d95]">Suporte</Link>
          </nav>
        </footer>
      </div>
    </div>
  )
}
