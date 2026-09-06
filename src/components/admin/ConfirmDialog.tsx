'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** danger = botão vermelho (excluir/cancelar cobrança) */
  tone?: 'danger' | 'default'
}

type ConfirmState = ConfirmOptions & {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

const initial: ConfirmState = {
  open: false,
  title: '',
  description: undefined,
  confirmLabel: 'Confirmar',
  cancelLabel: 'Voltar',
  tone: 'danger',
  resolve: null,
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(initial)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Voltar',
        tone: options.tone ?? 'danger',
        resolve,
      })
    })
  }, [])

  const close = useCallback((value: boolean) => {
    setState((prev) => {
      prev.resolve?.(value)
      return { ...initial }
    })
  }, [])

  useEffect(() => {
    if (!state.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.open, close])

  const dialog: ReactNode = state.open ? (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="yop-confirm-title"
        aria-describedby={state.description ? 'yop-confirm-desc' : undefined}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-1 pt-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                state.tone === 'danger'
                  ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                  : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              {state.tone === 'danger' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h18.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 id="yop-confirm-title" className="text-base font-bold tracking-tight text-slate-900">
                {state.title}
              </h3>
              {state.description ? (
                <p id="yop-confirm-desc" className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {state.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
              state.tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-slate-950 hover:bg-slate-800'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
