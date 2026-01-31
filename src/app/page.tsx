"use client"

import Image from 'next/image'
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
  const [latestPosts, setLatestPosts] = useState<{ id: string; title: string; category: string; created_at: string; profiles?: { full_name: string } }[]>([])
  const [latestProjects, setLatestProjects] = useState<{ id: string; title: string; category: string; created_at: string }[]>([])
  const [feedLoading, setFeedLoading] = useState(true)

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

  useEffect(() => {
    async function fetchFeed() {
      try {
        const [postsRes, projectsRes] = await Promise.all([
          supabase.from('posts').select('id, title, category, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(6),
          supabase.from('projects').select('id, title, category, created_at').order('created_at', { ascending: false }).limit(4),
        ])
        if (postsRes.data) {
          const normalized = postsRes.data.map((p: { id: string; title: string; category: string; created_at: string; profiles?: { full_name: string } | { full_name: string }[] }) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            created_at: p.created_at,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
          }))
          setLatestPosts(normalized)
        }
        if (projectsRes.data) setLatestProjects(projectsRes.data)
      } catch {
        // RLS pode bloquear; mantém arrays vazios
      } finally {
        setFeedLoading(false)
      }
    }
    fetchFeed()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error("As senhas não coincidem!")
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, birth_date: birthDate } },
        })
        if (!signUpError) {
          if (signUpData.session) {
            await supabase.auth.setSession({
              access_token: signUpData.session.access_token,
              refresh_token: signUpData.session.refresh_token,
            })
            window.location.href = '/dashboard'
          } else {
            setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail para confirmar.' })
          }
          return
        }
        const msg = (signUpError.message ?? '').toLowerCase()
        const isEmailSendError =
          msg.includes('confirm') || msg.includes('sending') || msg.includes('email') ||
          (signUpError as { status?: number }).status === 500
        if (isEmailSendError) {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
          if (!loginError && loginData.session) {
            await supabase.auth.setSession({
              access_token: loginData.session.access_token,
              refresh_token: loginData.session.refresh_token,
            })
            window.location.href = '/dashboard'
            return
          }
          setMessage({
            type: 'success',
            text: 'Conta criada. Use "Esqueci minha chave de segurança" com este e-mail para acessar.',
          })
          return
        }
        throw signUpError
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
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 overflow-x-hidden">
      {/* Header com Termos, Privacidade, Suporte em destaque */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="h-14 md:h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/logoprincipal.png" alt="YOP DEVS" width={280} height={90} className="h-14 md:h-16 w-auto object-contain" priority unoptimized />
            </Link>
            <div className="flex items-center gap-4 md:gap-6">
              <Link href="/termos" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">Termos de Uso</Link>
              <Link href="/privacidade" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">Privacidade</Link>
              <Link href="/suporte" className="text-sm font-semibold text-slate-600 hover:text-[#4c1d95] transition-colors hidden sm:inline">Suporte</Link>
              <button
                onClick={() => { setMode('login'); setShowModal(true); }}
                className="px-4 py-2.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 md:pt-28 pb-12 px-4 md:px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <p className="text-violet-600 text-xs font-bold uppercase tracking-[0.3em] mb-4">
            Rede de equity, fórum e projetos
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05] mb-6">
            Conectamos{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600">
              ideias, capital e código
            </span>
          </h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Para empreendedores, desenvolvedores e quem quer validar projetos. Um lugar para encontrar sócios, debater no fórum e crescer junto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { setMode('signup'); setShowModal(true); }}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-wide hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-violet-500/25 transition-all"
            >
              Criar conta grátis
            </button>
            <button
              onClick={() => { setMode('login'); setShowModal(true); }}
              className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-sm uppercase tracking-wide hover:border-violet-300 hover:text-violet-700 transition-all"
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </section>

      {/* Para quem é — 3 perfis */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Para quem é
          </h2>
          <p className="text-center text-xl md:text-2xl font-black text-slate-900 mb-8 max-w-2xl mx-auto">
            Empreendedor, desenvolvedor ou curioso — tem seu lugar aqui.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { tag: 'Quem curte criar e compartilhar', title: 'Curioso & Criador', desc: 'Poste ideias, participe do fórum e receba alertas de oportunidades. Valide suas teses com quem entende de negócio e de código.', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', cta: 'Quero participar' },
              { tag: 'Quem tem capital e visão', title: 'Empresário', desc: 'Publique projetos e encontre CTOs e devs dispostos a sociedade por equity. Marketplace curado de talento técnico.', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', cta: 'Encontrar talentos' },
              { tag: 'Quem constrói com código', title: 'Desenvolvedor', desc: 'Mostre seu perfil, acompanhe projetos com equity e converse com fundadores. Oportunidades reais de sociedade como CTO ou sócio.', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', cta: 'Ver oportunidades' },
            ].map((card, idx) => (
              <div
                key={idx}
                className="group relative p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-3">{card.tag}</p>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-5 group-hover:from-violet-200 group-hover:to-indigo-200 transition-colors">
                  <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.desc}</p>
                <button onClick={() => { setMode('signup'); setShowModal(true); }} className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors">
                  {card.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Últimas do fórum + projetos */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-xl md:text-2xl font-black text-slate-900 mb-1">
            Atividade recente
          </h2>
          <p className="text-center text-slate-600 text-sm mb-8 max-w-xl mx-auto">
            Últimas discussões no fórum e projetos lançados na rede.
          </p>

          {feedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-2xl bg-white border border-slate-100 p-8 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 p-8 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-600 mb-4">Fórum</h3>
                {latestPosts.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center text-slate-500">
                    <p className="text-sm">Nenhuma discussão recente. Entre na rede e seja o primeiro a postar.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {latestPosts.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/dashboard/forum/${post.id}`}
                          className="block rounded-2xl bg-white border border-slate-100 p-5 hover:border-violet-200 hover:shadow-md transition-all group"
                        >
                          <h4 className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-1">{post.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {post.profiles?.full_name ?? 'Membro'} · {post.category ?? 'Geral'} · {new Date(post.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-4">Projetos</h3>
                {latestProjects.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center text-slate-500">
                    <p className="text-sm">Nenhum projeto recente. Crie sua conta e lance o primeiro.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {latestProjects.map((proj) => (
                      <li key={proj.id}>
                        <Link
                          href="/dashboard/projetos"
                          className="block rounded-2xl bg-white border border-slate-100 p-5 hover:border-indigo-200 hover:shadow-md transition-all group"
                        >
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">{proj.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {proj.category ?? 'Projeto'} · {new Date(proj.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <p className="text-center mt-8">
            <button onClick={() => { setMode('signup'); setShowModal(true); }} className="text-sm font-bold text-violet-600 hover:text-violet-700 underline">
              Entrar na rede para ver tudo e participar
            </button>
          </p>
        </div>
      </section>

      {/* O que você encontra */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-xl md:text-2xl font-black text-slate-900 mb-1">
            O que você encontra na rede
          </h2>
          <p className="text-center text-slate-600 text-sm max-w-xl mx-auto mb-8">
            Marketplace, fórum e notificações em tempo real.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { t: 'Marketplace', d: 'Projetos que buscam CTOs e sócios técnicos. Navegue por setores e encontre a oportunidade certa.', i: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
              { t: 'Fórum', d: 'Discussões sobre arquitetura, escala, IA e teses de mercado. Troque ideias com devs e empreendedores.', i: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
              { t: 'Alertas', d: 'Notificações quando alguém curte, comenta ou demonstra interesse. Não perca nenhuma oportunidade.', i: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-slate-100 border border-slate-200 hover:border-violet-200 transition-all">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.i} /></svg>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{item.t}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-14 md:py-20 px-4 md:px-6 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-t border-slate-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            Pronto para entrar na rede?
          </h2>
          <p className="text-slate-300 text-sm md:text-base mb-6 max-w-lg mx-auto">
            Cadastre-se em minutos. Poste no fórum, crie projetos e converse com a comunidade.
          </p>
          <button
            onClick={() => { setMode('signup'); setShowModal(true); }}
            className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm uppercase tracking-wide hover:bg-slate-100 transition-all shadow-xl"
          >
            Criar conta grátis
          </button>
        </div>
      </section>

      {/* Footer — Termos, Privacidade e Suporte em destaque */}
      <footer className="bg-slate-800 text-slate-200 py-10 px-4 md:px-6 border-t border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 text-center">
          <Link href="/" className="flex items-center">
            <Image src="/logoprincipal.png" alt="YOP DEVS" width={220} height={70} className="h-11 md:h-12 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity" unoptimized />
          </Link>
          <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link href="/termos" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Privacidade</Link>
            <Link href="/suporte" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Suporte</Link>
          </nav>
          <p className="text-xs text-slate-500">
            © 2026. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal login/signup */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 id="modal-title" className="text-2xl font-black text-slate-900 mb-6 text-center">
              {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Resetar senha'}
            </h2>
            {message && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-violet-50 text-violet-800 border border-violet-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <input type="text" placeholder="Nome completo" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 text-slate-900 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <div>
                    <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">Data de nascimento</label>
                    <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 text-slate-900 text-sm" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                  </div>
                </>
              )}
              <input type="email" placeholder="E-mail" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 text-slate-900 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {mode !== 'reset' && (
                <>
                  <input type="password" placeholder="Senha" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 text-slate-900 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {mode === 'signup' && (
                    <input type="password" placeholder="Confirmar senha" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 text-slate-900 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  )}
                </>
              )}
              <button type="submit" disabled={loading} className="w-full py-4 bg-[#4c1d95] text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition-all disabled:opacity-60">
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
              </button>
            </form>
            <div className="mt-6 flex flex-col gap-3 text-center text-sm">
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }} className="text-violet-600 font-bold hover:underline">
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
              </button>
              {mode === 'login' && (
                <button type="button" onClick={() => { setMode('reset'); setMessage(null); }} className="text-slate-500 hover:text-slate-700">Esqueci minha senha</button>
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-violet-600 text-sm font-bold animate-pulse">Carregando...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
