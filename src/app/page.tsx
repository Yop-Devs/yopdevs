"use client"
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function LandingPageContent() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const closeModal = useCallback(() => {
    setShowModal(false)
    setMessage(null)
  }, [])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'auth-code-error') {
      setShowModal(true)
      setMode('login')
      setMessage({ type: 'error', text: 'Falha ao confirmar login. Tente novamente.' })
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  useEffect(() => {
    if (!showModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showModal, closeModal])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error("As senhas não coincidem!")

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, birth_date: birthDate },
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail para confirmar.' })
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          window.location.href = '/dashboard'
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setMessage({ type: 'success', text: 'Link enviado para o e-mail informado.' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.'
      const isEmailError = /confirm.*email|sending.*email|email.*(send|error)/i.test(msg)
      setMessage({
        type: 'error',
        text: isEmailError
          ? 'O envio do e-mail de confirmação falhou. Verifique o e-mail ou tente fazer login — se a confirmação estiver desativada no painel, o acesso já pode estar liberado.'
          : msg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* HEADER - Ajustado para mobile */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span className="text-lg md:text-xl font-black italic tracking-tighter uppercase">Yop Devs</span>
          </div>
          <button onClick={() => { setMode('login'); setShowModal(true); }} className="px-4 md:px-8 py-2.5 md:py-3 bg-white text-black rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
            Área de Membros
          </button>
        </div>
      </nav>

      {/* Hero com fundo dinâmico */}
      <section className="relative pt-36 md:pt-44 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <p className="text-indigo-400 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            Rede exclusiva de equity e talento
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black italic tracking-tighter uppercase leading-[0.95] mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            Feito para <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">
              participação e crescimento
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-xl font-medium leading-relaxed mb-10 animate-fade-in-up opacity-0" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
            Conectamos quem tem ideia, quem tem capital e quem constrói tecnologia. Um lugar para encontrar sócios, validar projetos e crescer junto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            <button onClick={() => { setMode('signup'); setShowModal(true); }} className="px-10 py-4 md:py-5 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-indigo-500/30">
              Criar minha conta
            </button>
            <button onClick={() => { setMode('login'); setShowModal(true); }} className="px-10 py-4 md:py-5 bg-white/5 border border-white/20 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:border-indigo-500/50 transition-all">
              Já tenho acesso
            </button>
          </div>
        </div>
      </section>

      {/* Para quem é — 3 perfis */}
      <section className="relative py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-4">
            Para quem é
          </h2>
          <p className="text-center text-2xl md:text-3xl font-black italic text-white mb-16 max-w-2xl mx-auto">
            Seja você curioso, empresário ou dev — tem seu lugar aqui.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                tag: 'Quem curte criar e compartilhar',
                title: 'Curioso & Criador',
                desc: 'Poste ideias, participe dos fóruns e receba alertas quando surgir oportunidade no seu setor. Valide suas teses com quem entende de negócio e de código.',
                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                cta: 'Quero participar',
              },
              {
                tag: 'Quem tem capital e visão',
                title: 'Empresário',
                desc: 'Publique projetos e encontre CTOs e desenvolvedores de elite dispostos a sociedade por equity. Acesse um marketplace curado de talento técnico.',
                icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                cta: 'Encontrar talentos',
              },
              {
                tag: 'Quem constrói com código',
                title: 'Desenvolvedor',
                desc: 'Mostre seu perfil técnico, acompanhe projetos que oferecem equity e converse com fundadores. Encontre oportunidades reais de sociedade como CTO ou sócio.',
                icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                cta: 'Ver oportunidades',
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="group relative p-8 md:p-10 rounded-[28px] bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-4">{card.tag}</p>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:bg-indigo-500/30 transition-colors">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} /></svg>
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white mb-4">{card.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">{card.desc}</p>
                <button onClick={() => { setMode('signup'); setShowModal(true); }} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">
                  {card.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que você encontra na rede */}
      <section className="relative py-20 md:py-28 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-black italic text-white mb-4">
            O que você encontra na rede
          </h2>
          <p className="text-center text-slate-500 text-sm md:text-base max-w-xl mx-auto mb-14">
            Marketplace de projetos, fóruns de alto nível e alertas em tempo real.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { t: 'Marketplace', d: 'Projetos validados por empresários que buscam CTOs e sócios técnicos. Navegue por setores e encontre a oportunidade certa.', i: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
              { t: 'Fóruns', d: 'Discussões sobre arquitetura, escala, IA e teses de mercado. Troque ideias com devs e empreendedores de todo o Brasil.', i: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
              { t: 'Alertas', d: 'Receba notificações quando uma nova tese ou projeto do seu interesse for publicada. Não perca nenhuma oportunidade.', i: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all duration-300 flex flex-col">
                <svg className="w-9 h-9 text-indigo-500 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.i} /></svg>
                <h3 className="text-lg font-black italic uppercase mb-3 tracking-tight text-white">{item.t}</h3>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center p-10 md:p-16 rounded-[40px] bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
          <h2 className="text-2xl md:text-4xl font-black italic uppercase text-white mb-4">
            Pronto para entrar na rede?
          </h2>
          <p className="text-slate-400 text-sm md:text-base mb-8 max-w-lg mx-auto">
            Cadastre-se em minutos. Escolha seu perfil (dev ou empresário) e comece a explorar projetos, fóruns e oportunidades.
          </p>
          <button onClick={() => { setMode('signup'); setShowModal(true); }} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-xl">
            Criar conta grátis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-16 pb-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <span className="text-sm font-black italic uppercase tracking-tighter">YOP DEVS</span>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              © 2026 Gabriel Carrara. Todos os direitos reservados.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/suporte" className="hover:text-white transition-colors">Suporte</Link>
          </div>
        </div>
      </footer>

      {/* MODAL - Fecha com Escape e clique fora */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={closeModal} aria-hidden="true" />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="text-center mb-10">
              <h2 id="modal-title" className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">
                {mode === 'login' ? 'Faça Login' : mode === 'signup' ? 'Cadastre-se' : 'Resetar Senha'}
              </h2>
            </div>

            {message && (
              <div className={`mb-6 px-4 py-3 rounded-2xl text-sm font-medium ${message.type === 'success' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {message.text}
              </div>
            )}

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
              
              <input type="email" placeholder="Seu melhor E-mail" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              
              {mode !== 'reset' && (
                <>
                  <input type="password" placeholder="Sua Senha" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {mode === 'signup' && (
                    <input type="password" placeholder="Confirmar Senha" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  )}
                </>
              )}

              <button type="submit" disabled={loading} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 hover:text-white transition-all shadow-xl shadow-white/5">
                {loading ? "Processando..." : mode === 'login' ? "Entrar no Terminal" : mode === 'signup' ? "Efetivar Registro" : "Enviar Reset"}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4 text-center">
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }} className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">
                {mode === 'login' ? 'Não possui acesso? Cadastre-se AGORA!' : 'Já possui conta? FAÇA LOGIN'}
              </button>
              {mode === 'login' && (
                <button type="button" onClick={() => { setMode('reset'); setMessage(null); }} className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white">Esqueci minha chave de segurança</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-indigo-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}