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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [infoCard, setInfoCard] = useState<'termos' | 'privacidade' | 'suporte' | null>(null)
  const [suporteForm, setSuporteForm] = useState({ name: '', email: '', message: '' })
  const [suporteStatus, setSuporteStatus] = useState<'idle' | 'sending' | 'success'>('idle')
  const [suporteError, setSuporteError] = useState<string | null>(null)

  const closeModal = useCallback(() => {
    setShowModal(false)
    setMessage(null)
  }, [])

  const closeInfoCard = useCallback(() => {
    setInfoCard(null)
  }, [])

  const handleSuporteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuporteStatus('sending')
    setSuporteError(null)
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suporteForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSuporteError(data?.error?.message ?? 'Falha ao enviar. Tente novamente.')
        setSuporteStatus('idle')
        return
      }
      setSuporteStatus('success')
      setSuporteForm({ name: '', email: '', message: '' })
      setTimeout(() => setSuporteStatus('idle'), 5000)
    } catch {
      setSuporteError('Erro de conexão. Tente novamente.')
      setSuporteStatus('idle')
    }
  }

  function getAuthErrorMessage(err: unknown): string {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    if (msg.includes('already registered') || msg.includes('user already registered') || msg.includes('already been registered'))
      return 'Já existe uma conta com este e-mail. Faça login ou use "Esqueci minha senha".'
    if (msg.includes('password') && (msg.includes('6') || msg.includes('least')))
      return 'A senha deve ter no mínimo 6 caracteres.'
    if (msg.includes('invalid login') || msg.includes('invalid credentials'))
      return 'E-mail ou senha incorretos. Tente novamente.'
    if (msg.includes('email not confirmed') || msg.includes('confirm your email'))
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada ou use "Esqueci minha senha".'
    if (msg.includes('invalid email') || msg.includes('valid email'))
      return 'Informe um e-mail válido.'
    if (msg.includes('signup') && msg.includes('disabled'))
      return 'Cadastros estão temporariamente desativados. Entre em contato com o suporte.'
    return err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.'
  }

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
    if (!infoCard) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInfoCard()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [infoCard, closeInfoCard])

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setMessage({ type: 'error', text: getAuthErrorMessage(error) })
        setGoogleLoading(false)
        return
      }
      // Redirecionamento é feito pelo Supabase
    } catch (err) {
      setMessage({ type: 'error', text: getAuthErrorMessage(err) })
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent, forceMode?: 'login' | 'signup' | 'reset') => {
    e.preventDefault()
    const currentMode = forceMode ?? mode
    setMessage(null)
    if (currentMode === 'signup') {
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' })
        return
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem. Digite a mesma senha nos dois campos.' })
        return
      }
      if (!email.trim()) {
        setMessage({ type: 'error', text: 'Informe seu e-mail.' })
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        setMessage({ type: 'error', text: 'Informe um e-mail válido.' })
        return
      }
    }
    setLoading(true)
    try {
      if (currentMode === 'signup') {
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
        setMessage({ type: 'error', text: getAuthErrorMessage(signUpError) })
        return
      } else if (currentMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage({ type: 'error', text: getAuthErrorMessage(error) })
          setLoading(false)
          return
        }
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          window.location.href = '/dashboard'
        }
      } else {
        if (!email.trim()) {
          setMessage({ type: 'error', text: 'Informe seu e-mail para receber o link de redefinição.' })
          setLoading(false)
          return
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) {
          setMessage({ type: 'error', text: getAuthErrorMessage(error) })
          setLoading(false)
          return
        }
        setMessage({ type: 'success', text: 'Link enviado para o e-mail informado. Verifique sua caixa de entrada.' })
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getAuthErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    handleAuth(e, 'login')
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-900 flex flex-col">
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Coluna esquerda: logo + texto ao lado, imagens embaixo — metade da tela */}
        <section className="w-full lg:w-1/2 lg:flex-shrink-0 bg-[#f0f2f5] flex flex-col min-h-0 overflow-hidden px-4 sm:px-6 pt-4 sm:pt-5 lg:pt-6 pb-4 sm:pb-5 lg:pl-[5%] lg:pr-6">
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 mb-5 lg:mb-6 shrink-0">
            <Link href="/" className="shrink-0">
              <Image
                src="/logoprincipal.png?v=4"
                alt="YOP DEVS"
                width={420}
                height={132}
                className="h-24 lg:h-28 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 leading-snug max-w-lg text-center">
              <span className="text-[#4c1d95]">Ideias. Código. Negócios.</span> Tudo no mesmo lugar.
            </p>
          </div>
          <div className="flex-1 flex justify-center items-center min-h-0 w-full min-w-0 overflow-hidden px-4 lg:px-8">
            <div className="relative w-full max-w-xl rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: '45vh' }}>
              <Image
                src="/imagem01.png"
                alt=""
                fill
                className="object-cover object-center rounded-lg shadow-md border border-slate-200/80"
                sizes="(max-width: 1024px) 90vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* Linha divisória vertical no meio da tela */}
        <div className="hidden lg:block w-[2px] flex-shrink-0 bg-slate-400 self-stretch" aria-hidden />

        {/* Coluna direita: formulário de login — metade da tela */}
        <section className="w-full lg:w-1/2 lg:flex-shrink-0 flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 lg:py-10 bg-white min-w-0">
          <div className="max-w-[420px] w-full min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              Entrar no YOP Devs
            </h1>

            {message && (
              <div role="alert" aria-live="polite" className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-violet-50 text-violet-800 border border-violet-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            {/* Criar conta: CTA principal (foco em aquisição) */}
            <button
              type="button"
              onClick={() => { setMode('signup'); setMessage(null); setShowModal(true); }}
              className="w-full py-4 bg-[#4c1d95] text-white rounded-lg font-bold text-base hover:bg-violet-800 transition-colors shadow-lg mb-4"
            >
              Criar nova conta
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-[#4c1d95] text-[#4c1d95] rounded-lg font-semibold text-base hover:bg-violet-50 transition-colors disabled:opacity-60"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Entrando...' : 'Login com Google'}
            </button>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-400 mb-3 text-center">Já tem conta?</p>
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="E-mail"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#4c1d95] focus:ring-1 focus:ring-[#4c1d95] text-slate-900 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#4c1d95] focus:ring-1 focus:ring-[#4c1d95] text-slate-900 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white border-2 border-[#4c1d95] text-[#4c1d95] rounded-lg font-medium text-sm hover:bg-violet-50 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar na sua conta'}
                </button>
              </form>
              <div className="mt-3 text-center">
                <Link href="/forgot-password" className="text-sm text-[#4c1d95] hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="flex-shrink-0 border-t border-slate-200 bg-white py-3 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-slate-600">
          <nav className="flex flex-wrap justify-center gap-4">
            <button type="button" onClick={() => setInfoCard('termos')} className="hover:text-[#4c1d95] transition-colors">Termos de Uso</button>
            <button type="button" onClick={() => setInfoCard('privacidade')} className="hover:text-[#4c1d95] transition-colors">Privacidade</button>
            <button type="button" onClick={() => setInfoCard('suporte')} className="hover:text-[#4c1d95] transition-colors">Suporte</button>
          </nav>
          <span className="text-slate-500">© 2026 YOP Devs. Todos os direitos reservados.</span>
        </div>
      </footer>

      {/* Card de informações (Termos, Privacidade, Suporte) */}
      {infoCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="info-card-title">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeInfoCard} aria-hidden="true" />
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 id="info-card-title" className="text-xl font-bold text-slate-900">
                {infoCard === 'termos' && 'Termos de Uso'}
                {infoCard === 'privacidade' && 'Privacidade'}
                {infoCard === 'suporte' && 'Suporte'}
              </h2>
              <button
                type="button"
                onClick={closeInfoCard}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {infoCard === 'termos' && (
                <div className="space-y-6 text-sm leading-relaxed">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última atualização: Janeiro de 2026</p>
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900">1. O Ecossistema</h3>
                    <p className="text-slate-600">O YOP Devs é uma rede exclusiva para conexão entre desenvolvedores e empresários. Ao acessar, você concorda em manter o profissionalismo e a integridade das informações compartilhadas.</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900">2. Propriedade Intelectual</h3>
                    <p className="text-slate-600">Todas as teses de negócios e códigos compartilhados no fórum permanecem sob propriedade de seus respectivos autores, a menos que um contrato de sociedade (Equity) seja firmado entre as partes.</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900">3. Conduta</h3>
                    <p className="text-slate-600">É estritamente proibido o uso de bots, scripts de automação não autorizados ou qualquer comportamento que comprometa a segurança do Protocolo YOP Devs.</p>
                  </div>
                </div>
              )}
              {infoCard === 'privacidade' && (
                <div className="space-y-6 text-sm leading-relaxed">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proteção de Dados v1.0</p>
                  <p className="text-slate-600">Sua privacidade é nossa prioridade. No YOP Devs, seus dados de navegação e credenciais são criptografados de ponta a ponta via Supabase Auth.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-slate-900 font-bold mb-2">O que coletamos?</h3>
                      <p className="text-slate-600 text-sm">Nome, e-mail e data de nascimento para validação de perfil e segurança da rede.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-slate-900 font-bold mb-2">Uso de Cookies</h3>
                      <p className="text-slate-600 text-sm">Utilizamos cookies apenas para manter sua sessão ativa.</p>
                    </div>
                  </div>
                </div>
              )}
              {infoCard === 'suporte' && (
                <div>
                  <p className="text-slate-500 text-sm mb-6">Envie sua dúvida ou sugestão.</p>
                  {suporteError && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-medium">
                      {suporteError}
                    </div>
                  )}
                  {suporteStatus === 'success' ? (
                    <div className="bg-violet-50 border border-violet-200 p-6 rounded-2xl text-center">
                      <p className="text-[#4c1d95] font-bold text-sm">Mensagem enviada com sucesso!</p>
                      <p className="text-slate-600 text-xs mt-1">Responderemos em até 24 horas.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSuporteSubmit} className="space-y-4">
                      <input type="text" placeholder="Seu nome" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm" value={suporteForm.name} onChange={(e) => setSuporteForm({ ...suporteForm, name: e.target.value })} required />
                      <input type="email" placeholder="Seu e-mail" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm" value={suporteForm.email} onChange={(e) => setSuporteForm({ ...suporteForm, email: e.target.value })} required />
                      <textarea placeholder="Descreva o problema ou sugestão" rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4c1d95] text-sm resize-none" value={suporteForm.message} onChange={(e) => setSuporteForm({ ...suporteForm, message: e.target.value })} required />
                      <button type="submit" disabled={suporteStatus === 'sending'} className="w-full py-3 bg-[#4c1d95] text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition-all disabled:opacity-60">
                        {suporteStatus === 'sending' ? 'Enviando...' : 'Enviar'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal login/cadastro com e-mail e senha */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl max-h-[95vh] flex flex-col items-stretch">
            <h2 id="modal-title" className="text-xl font-bold text-slate-900 mb-4 text-center">
              {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Resetar senha'}
            </h2>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-60 mb-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Entrando...' : 'Continuar com Google'}
            </button>
            {message && (
              <div role="alert" aria-live="polite" className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${message.type === 'success' ? 'bg-violet-50 text-violet-800 border border-violet-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-2.5 shrink-0">
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nome completo" className="col-span-2 sm:col-span-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-violet-500 text-slate-900 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <div className="col-span-2 sm:col-span-1">
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-violet-500 text-slate-900 text-sm" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required title="Data de nascimento" />
                  </div>
                </div>
              )}
              <input type="email" placeholder="E-mail" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-violet-500 text-slate-900 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {mode !== 'reset' && (
                <>
                  <input type="password" placeholder="Senha (mín. 6)" minLength={6} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-violet-500 text-slate-900 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {mode === 'signup' && (
                    <>
                      <input type="password" placeholder="Confirmar senha" minLength={6} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-violet-500 text-slate-900 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-600 font-medium -mt-1">As senhas não coincidem.</p>
                      )}
                    </>
                  )}
                </>
              )}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#4c1d95] text-white rounded-lg font-semibold text-sm hover:bg-violet-800 transition-all disabled:opacity-60">
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}
              </button>
            </form>
            <div className="mt-3 flex flex-col gap-1.5 text-center text-xs shrink-0">
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }} className="text-violet-600 font-semibold hover:underline">
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-violet-600 text-sm font-semibold animate-pulse">Carregando...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
