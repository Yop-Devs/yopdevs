"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Estados do Formulário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error("As senhas não coincidem!")
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: fullName,
              birth_date: birthDate 
            } 
          }
        })
        if (error) throw error
        alert("Cadastro realizado! Verifique seu e-mail.")
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session) {
          await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
          window.location.href = '/dashboard'
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        alert("Link enviado para o e-mail.")
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
      
      {/* HEADER */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span className="text-xl font-black italic tracking-tighter uppercase">Yop Devs</span>
          </div>
          <button onClick={() => { setMode('login'); setShowModal(true); }} className="px-8 py-3 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-white/5">
            Área de Membros da comunidade
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-48 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-[110px] font-black italic tracking-tighter uppercase leading-[0.8] mb-10">
            Engineered for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400">Equity & Growth</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto text-lg md:text-2xl font-medium leading-relaxed mb-12">
            A infraestrutura definitiva para mentes brilhantes. Conectamos o rigor da engenharia de software com a tese estratégica de negócios de alto impacto.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button onClick={() => { setMode('signup'); setShowModal(true); }} className="px-12 py-6 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/30">
              Quero Me Cadastrar
            </button>
          </div>
        </div>
      </section>

      {/* INFO SECTIONS */}
      <section className="max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { t: "MARKETPLACE", d: "Acesse projetos validados por empresários prontos para ceder equity em troca de CTOs de elite.", i: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
          { t: "DISCUSSÃO", d: "Fóruns técnicos de alto nível sobre arquitetura, escala, IA e teses de mercado internacional.", i: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" },
          { t: "NOTIFICAÇÕES", d: "Receba alertas instantâneos sempre que uma nova tese de negócio for postada no seu setor.", i: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" }
        ].map((item, idx) => (
          <div key={idx} className="p-10 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-indigo-500/50 transition-all group">
            <svg className="w-8 h-8 text-indigo-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.i}/></svg>
            <h3 className="text-xl font-black italic uppercase mb-4 tracking-tighter">{item.t}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{item.d}</p>
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span className="text-sm font-black italic uppercase tracking-tighter">Yop Devs Protocol</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
            &copy; 2026 Gabriel Carrara. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* MODAL SISTEM */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                {mode === 'login' ? 'Faça Login' : mode === 'signup' ? 'Cadastre-se' : 'Resetar Senha'}
              </h2>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <input type="text" placeholder="Nome Completo" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 ml-4 tracking-widest">Data de Nascimento</label>
                    <input type="date" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm text-slate-400" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                  </div>
                </>
              )}
              
              <input type="email" placeholder="E-mail" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              
              {mode !== 'reset' && (
                <>
                  <input type="password" placeholder="Senha" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {mode === 'signup' && (
                    <input type="password" placeholder="Confirmar Senha" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  )}
                </>
              )}

              <button type="submit" disabled={loading} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 hover:text-white transition-all">
                {loading ? "Processando..." : mode === 'login' ? "Entrar no YOP" : mode === 'signup' ? "Efetivar Registro" : "Enviar Chave"}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4 text-center">
              <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {mode === 'login' ? 'Não possui acesso? Cadastre-se AGORA!' : 'Já possui conta? FAÇA LOGIN'}
              </button>
              {mode === 'login' && (
                <button onClick={() => setMode('reset')} className="text-[10px] font-black uppercase tracking-widest text-slate-600">Esqueci minha chave de segurança</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}