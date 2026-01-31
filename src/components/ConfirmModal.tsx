'use client'

import { useRef, useEffect } from 'react'

type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'danger' | 'default'
  loading?: boolean
}

export default function ConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  const handleConfirm = async () => {
    if (loading) return
    await onConfirm()
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        aria-live="polite"
      >
        <div className="mb-6 flex items-center gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}
          >
            {variant === 'danger' ? (
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>
          <div>
            <h2 id="confirm-title" className="text-xl font-black uppercase tracking-tight text-slate-900">
              {title}
            </h2>
            <p id="confirm-desc" className="mt-1 text-sm font-medium text-slate-500">
              {message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-60 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 border-2 border-red-600 hover:border-red-700'
                : 'bg-[#4c1d95] hover:bg-violet-800 border-2 border-[#4c1d95] hover:border-violet-800'
            }`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
