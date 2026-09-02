'use client'

import { useCallback, useState, type ReactNode } from 'react'

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

  const dialog: ReactNode = state.open ? (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="yop-confirm-title"
        aria-describedby={state.description ? 'yop-confirm-desc' : undefined}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                state.tone === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h18.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="yop-confirm-title" className="text-base font-bold text-slate-900">
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
              state.tone === 'danger'
                ? 'bg-rose-700 hover:bg-rose-600'
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
