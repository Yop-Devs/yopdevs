'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type Factor = {
  id: string
  friendly_name?: string | null
  status: string
  factor_type: string
}

export default function AdminSegurancaPage() {
  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<Factor[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const totp = (data?.totp ?? []).map((f) => ({
        id: f.id,
        friendly_name: f.friendly_name,
        status: f.status,
        factor_type: f.factor_type,
      }))
      setFactors(totp)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao listar 2FA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function startEnroll() {
    setBusy(true)
    setEnrolling(true)
    setCode('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'YOP Admin',
      })
      if (error) throw error
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
      toast.message('Escaneie o QR no autenticador e confirme o código.')
    } catch (err) {
      setEnrolling(false)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Falha ao iniciar 2FA. Ative MFA no Supabase Auth → Providers / Multi-Factor.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnroll(e: FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.replace(/\s+/g, ''),
      })
      if (error) throw error
      toast.success('2FA ativado.')
      setEnrolling(false)
      setFactorId(null)
      setQr(null)
      setSecret(null)
      setCode('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Código inválido.')
    } finally {
      setBusy(false)
    }
  }

  async function removeFactor(id: string) {
    const otp = window.prompt('Digite um código 2FA atual para remover o fator:')
    if (!otp) return
    setBusy(true)
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: id,
        code: otp.replace(/\s+/g, ''),
      })
      if (verifyError) throw verifyError
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (error) throw error
      toast.success('2FA removido.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.')
    } finally {
      setBusy(false)
    }
  }

  const verified = factors.filter((f) => f.status === 'verified')

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Segurança (2FA)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Autenticação em dois fatores com app (Google Authenticator, Authy, 1Password…). Depois de ativar,
          o login pede senha + código de 6 dígitos.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Status</h3>
        {loading ? (
          <p className="mt-2 text-sm text-slate-600">Carregando...</p>
        ) : verified.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {verified.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-emerald-900">
                  {f.friendly_name || 'Autenticador TOTP'} · ativo
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeFactor(f.id)}
                  className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-800">
            2FA ainda não está ativo. Recomendado para proteger e-mails, cobranças e o bloco de acessos.
          </p>
        )}

        {!enrolling && verified.length === 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startEnroll()}
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Ativar 2FA agora
          </button>
        ) : null}
      </div>

      {enrolling ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Configurar autenticador</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Abra o app autenticador no celular</li>
            <li>Escaneie o QR abaixo</li>
            <li>Digite o código de 6 dígitos para confirmar</li>
          </ol>

          {qr ? (
            <div className="mt-4 flex justify-center rounded-xl border border-slate-100 bg-slate-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR Code 2FA" className="h-48 w-48" />
            </div>
          ) : null}

          {secret ? (
            <p className="mt-3 break-all text-center text-[11px] text-slate-500">
              Código manual: <span className="font-mono text-slate-700">{secret}</span>
            </p>
          ) : null}

          <form onSubmit={confirmEnroll} className="mt-4 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={8}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center text-sm tracking-[0.35em] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEnrolling(false)
                  setFactorId(null)
                  setQr(null)
                  setSecret(null)
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || code.trim().length < 6}
                className="flex-1 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Confirmando...' : 'Confirmar e ativar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        No Supabase: Authentication → Multi-Factor → habilite <strong>TOTP</strong>. Sem isso o enroll falha.
      </div>
    </div>
  )
}
