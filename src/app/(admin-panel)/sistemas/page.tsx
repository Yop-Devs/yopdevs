'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  ADMIN_SYSTEM_BUCKET,
  AdminSystem,
  AdminSystemFile,
  AdminSystemFileKind,
  daysUntil,
  formatDateBr,
  isHttpLink,
  resolveSystemLogoUrl,
} from '@/lib/admin-systems'
import {
  formatBytes,
  usagePct,
  type SystemIntegrationPublic,
} from '@/lib/system-infra-types'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function bytesToGb(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(bytes >= 1024 ** 3 ? 0 : 1)
}

type FormState = {
  name: string
  company_name: string
  link: string
  domain_expires_at: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  company_name: '',
  link: '',
  domain_expires_at: '',
  notes: '',
}

function reminderTone(days: number | null): string {
  if (days == null) return 'bg-slate-100 text-slate-600'
  if (days < 0) return 'bg-rose-100 text-rose-800'
  if (days <= 7) return 'bg-amber-100 text-amber-900'
  if (days <= 30) return 'bg-orange-100 text-orange-900'
  return 'bg-emerald-100 text-emerald-800'
}

function reminderLabel(days: number | null, prefix: string): string {
  if (days == null) return `${prefix}: —`
  if (days < 0) return `${prefix}: atrasado (${Math.abs(days)}d)`
  if (days === 0) return `${prefix}: hoje`
  return `${prefix}: em ${days}d`
}

export default function AdminSistemasPage() {
  const [systems, setSystems] = useState<AdminSystem[]>([])
  const [filesBySystem, setFilesBySystem] = useState<Record<string, AdminSystemFile[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSystem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [envFiles, setEnvFiles] = useState<FileList | null>(null)
  const [accessFiles, setAccessFiles] = useState<FileList | null>(null)
  const [query, setQuery] = useState('')
  const [logoSrcById, setLogoSrcById] = useState<Record<string, string>>({})
  const [integrationsBySystem, setIntegrationsBySystem] = useState<
    Record<string, SystemIntegrationPublic>
  >({})
  const [infraBusyId, setInfraBusyId] = useState<string | null>(null)
  const [limitsDraft, setLimitsDraft] = useState<
    Record<string, { cfGb: string; sbDbGb: string; sbStorGb: string; resend: string; resendMonth: string }>
  >({})
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('yop_admin_systems')
      .select('*')
      .order('company_name', { ascending: true })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const list = (rows ?? []) as AdminSystem[]
    setSystems(list)

    const logos: Record<string, string> = {}
    await Promise.all(
      list.map(async (system) => {
        const url = await resolveSystemLogoUrl(system, async (path, expiresIn) => {
          const { data, error: signError } = await supabase.storage
            .from(ADMIN_SYSTEM_BUCKET)
            .createSignedUrl(path, expiresIn)
          return { signedUrl: data?.signedUrl, error: signError }
        })
        if (url) logos[system.id] = url
      }),
    )
    setLogoSrcById(logos)

    if (list.length) {
      const ids = list.map((s) => s.id)
      const { data: files, error: filesError } = await supabase
        .from('yop_admin_system_files')
        .select('*')
        .in('system_id', ids)
        .order('created_at', { ascending: false })

      if (filesError) {
        toast.error(filesError.message)
      } else {
        const map: Record<string, AdminSystemFile[]> = {}
        for (const file of (files ?? []) as AdminSystemFile[]) {
          if (!map[file.system_id]) map[file.system_id] = []
          map[file.system_id].push(file)
        }
        setFilesBySystem(map)
      }
    } else {
      setFilesBySystem({})
    }

    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/systems/integrations', { headers })
      const json = (await res.json()) as {
        integrations?: SystemIntegrationPublic[]
        error?: string
      }
      if (res.ok && json.integrations) {
        const map: Record<string, SystemIntegrationPublic> = {}
        const drafts: typeof limitsDraft = {}
        for (const row of json.integrations) {
          map[row.system_id] = row
          drafts[row.system_id] = {
            cfGb: bytesToGb(row.cf_storage_limit_bytes),
            sbDbGb: bytesToGb(row.sb_db_limit_bytes),
            sbStorGb: bytesToGb(row.sb_storage_limit_bytes),
            resend: String(row.resend_daily_limit ?? 100),
            resendMonth: String(row.resend_monthly_limit ?? 3000),
          }
        }
        setIntegrationsBySystem(map)
        setLimitsDraft(drafts)
      }
    } catch {
      // integrações são opcionais até a migration rodar
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return systems
    return systems.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q) ||
        (s.link ?? '').toLowerCase().includes(q)
    )
  }, [systems, query])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setLogoFile(null)
    setEnvFiles(null)
    setAccessFiles(null)
    setEditorOpen(true)
  }

  function openEdit(system: AdminSystem) {
    setEditing(system)
    setForm({
      name: system.name,
      company_name: system.company_name,
      link: system.link ?? '',
      domain_expires_at: system.domain_expires_at ?? '',
      notes: system.notes ?? '',
    })
    setLogoFile(null)
    setEnvFiles(null)
    setAccessFiles(null)
    setEditorOpen(true)
  }

  async function uploadFile(systemId: string, file: File, folder: string) {
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, '_')
    const path = `${systemId}/${folder}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(ADMIN_SYSTEM_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    })
    if (error) throw error
    return path
  }

  async function attachFiles(systemId: string, files: FileList | null, kind: AdminSystemFileKind) {
    if (!files?.length) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null

    for (const file of Array.from(files)) {
      const path = await uploadFile(systemId, file, kind)
      const { error } = await supabase.from('yop_admin_system_files').insert({
        system_id: systemId,
        kind,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || null,
        file_size: file.size,
        created_by: userId,
      })
      if (error) throw error
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.company_name.trim()) {
      toast.error('Preencha nome do sistema e empresa.')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null

      const payload = {
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        link: form.link.trim() || null,
        domain_expires_at: form.domain_expires_at || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      let systemId = editing?.id

      if (editing) {
        const { error } = await supabase.from('yop_admin_systems').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('yop_admin_systems')
          .insert({ ...payload, created_by: userId })
          .select('id')
          .single()
        if (error) throw error
        systemId = data.id as string

        const { error: payError } = await supabase.from('yop_admin_payments').insert({
          system_id: systemId,
          created_by: userId,
        })
        if (payError) throw payError
      }

      if (!systemId) throw new Error('Sistema sem ID')

      if (logoFile) {
        const logoPath = await uploadFile(systemId, logoFile, 'logo')
        // Bucket privado: logo_url local/publica fica null; a UI gera URL assinada a partir de logo_path
        const { error: logoError } = await supabase
          .from('yop_admin_systems')
          .update({
            logo_path: logoPath,
            logo_url: null,
          })
          .eq('id', systemId)
        if (logoError) throw logoError
      }

      await attachFiles(systemId, envFiles, 'env')
      await attachFiles(systemId, accessFiles, 'access')

      toast.success(editing ? 'Sistema atualizado.' : 'Sistema cadastrado.')
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function removeSystem(system: AdminSystem) {
    const ok = await confirm({
      title: 'Excluir sistema?',
      description: `"${system.company_name}" e todos os anexos/pagamentos vinculados serão removidos.`,
      confirmLabel: 'Excluir sistema',
      tone: 'danger',
    })
    if (!ok) return
    const files = filesBySystem[system.id] ?? []
    const paths = [...files.map((f) => f.file_path), system.logo_path].filter(Boolean) as string[]
    if (paths.length) {
      await supabase.storage.from(ADMIN_SYSTEM_BUCKET).remove(paths)
    }
    const { error } = await supabase.from('yop_admin_systems').delete().eq('id', system.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Sistema excluído.')
    await load()
  }

  async function removeFile(file: AdminSystemFile) {
    const ok = await confirm({
      title: 'Excluir arquivo?',
      description: `"${file.file_name}" será removido permanentemente.`,
      confirmLabel: 'Excluir arquivo',
      tone: 'danger',
    })
    if (!ok) return
    await supabase.storage.from(ADMIN_SYSTEM_BUCKET).remove([file.file_path])
    const { error } = await supabase.from('yop_admin_system_files').delete().eq('id', file.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Arquivo excluído.')
    await load()
  }

  async function downloadFile(file: AdminSystemFile) {
    const { data, error } = await supabase.storage.from(ADMIN_SYSTEM_BUCKET).createSignedUrl(file.file_path, 60)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Não foi possível gerar o link.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  function applyIntegration(integration: SystemIntegrationPublic) {
    setIntegrationsBySystem((prev) => ({ ...prev, [integration.system_id]: integration }))
    setLimitsDraft((prev) => ({
      ...prev,
      [integration.system_id]: {
        cfGb: bytesToGb(integration.cf_storage_limit_bytes),
        sbDbGb: bytesToGb(integration.sb_db_limit_bytes),
        sbStorGb: bytesToGb(integration.sb_storage_limit_bytes),
        resend: String(integration.resend_daily_limit ?? 100),
        resendMonth: String(integration.resend_monthly_limit ?? 3000),
      },
    }))
  }

  async function runInfraAction(
    systemId: string,
    action: 'import' | 'sync' | 'limits' | 'credentials',
    extra?: Record<string, unknown>,
  ) {
    setInfraBusyId(systemId)
    try {
      const headers = await authHeaders()
      const draft = limitsDraft[systemId]
      const body =
        action === 'limits'
          ? {
              action: 'limits',
              cf_storage_limit_gb: draft?.cfGb,
              sb_db_limit_gb: draft?.sbDbGb,
              sb_storage_limit_gb: draft?.sbStorGb,
              resend_daily_limit: draft?.resend,
              resend_monthly_limit: draft?.resendMonth,
            }
          : action === 'credentials'
            ? { action: 'credentials', sync_after: false, ...extra }
            : { action }

      const res = await fetch(`/api/admin/systems/${systemId}/sync-infra`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      let json: {
        integration?: SystemIntegrationPublic
        error?: string
        warning?: string
        report?: {
          keyCount: number
          keyNames: string[]
          matched: Record<string, boolean>
          hints: string[]
          flags?: { has_supabase?: boolean; has_cloudflare?: boolean; has_resend?: boolean }
        }
      }
      try {
        json = raw ? (JSON.parse(raw) as typeof json) : {}
      } catch {
        throw new Error(
          `Resposta inválida do servidor (HTTP ${res.status}). ${raw.slice(0, 120).replace(/\s+/g, ' ')}`,
        )
      }
      if (!res.ok) throw new Error(json.error || `Falha na operação de infra (HTTP ${res.status}).`)
      if (json.integration) applyIntegration(json.integration)
      if (json.warning) toast.message(json.warning)

      if (action === 'import' && json.report) {
        const m = json.report.matched
        const found = [
          m.sb_url ? 'URL' : null,
          m.sb_anon_key ? 'anon' : null,
          m.sb_service_role_key ? 'service_role' : null,
          m.cf_api_token ? 'Cloudflare' : null,
          m.resend_api_key ? 'Resend' : null,
        ].filter(Boolean)
        const hint = json.report.hints[0]
        toast.success(
          found.length
            ? `.env lido (${json.report.keyCount} chaves). Detectado: ${found.join(', ')}.`
            : `.env lido (${json.report.keyCount} chaves), mas nenhuma credencial reconhecida.`,
        )
        if (hint) toast.message(hint)
      } else if (action === 'credentials') {
        toast.success('Chaves salvas.')
        // Sync em seguida, em request separado (evita 504 do Cloudflare no save)
        const syncRes = await fetch(`/api/admin/systems/${systemId}/sync-infra`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'sync' }),
        })
        const syncRaw = await syncRes.text()
        let syncJson: { integration?: SystemIntegrationPublic; error?: string } = {}
        try {
          syncJson = syncRaw ? (JSON.parse(syncRaw) as typeof syncJson) : {}
        } catch {
          throw new Error(
            `Sync falhou (HTTP ${syncRes.status}). Confira a URL (.supabase.co, não .cc) e o PAT.`,
          )
        }
        if (!syncRes.ok) throw new Error(syncJson.error || `Sync falhou (HTTP ${syncRes.status}).`)
        if (syncJson.integration) applyIntegration(syncJson.integration)
        toast.success('Infra sincronizada.')
      } else {
        toast.success(action === 'limits' ? 'Limites atualizados.' : 'Infra sincronizada.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na operação de infra.')
    } finally {
      setInfraBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {confirmDialog}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Sistemas</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Novo sistema
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por sistema, empresa ou link..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Carregando sistemas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Nenhum sistema cadastrado ainda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:gap-4">
            <span>Sistema</span>
            <span>Uso</span>
            <span className="text-right">Ações</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((system) => {
              const files = filesBySystem[system.id] ?? []
              const envCount = files.filter((f) => f.kind === 'env').length
              const accessCount = files.filter((f) => f.kind === 'access').length
              const domainDays = daysUntil(system.domain_expires_at)
              const logoSrc = logoSrcById[system.id] ?? null
              const integ = integrationsBySystem[system.id] ?? null

              return (
                <SystemRow
                  key={system.id}
                  system={system}
                  files={files}
                  envCount={envCount}
                  accessCount={accessCount}
                  domainDays={domainDays}
                  logoSrc={logoSrc}
                  integ={integ}
                  draft={
                    limitsDraft[system.id] ?? {
                      cfGb: '10',
                      sbDbGb: '0.5',
                      sbStorGb: '1',
                      resend: '100',
                      resendMonth: '3000',
                    }
                  }
                  busy={infraBusyId === system.id}
                  onDraftChange={(next) => setLimitsDraft((prev) => ({ ...prev, [system.id]: next }))}
                  onImport={() => runInfraAction(system.id, 'import')}
                  onSync={() => runInfraAction(system.id, 'sync')}
                  onSaveLimits={() => runInfraAction(system.id, 'limits')}
                  onSaveCredentials={(creds) => runInfraAction(system.id, 'credentials', creds)}
                  onEdit={() => openEdit(system)}
                  onRemove={() => removeSystem(system)}
                  onDownloadFile={downloadFile}
                  onRemoveFile={removeFile}
                />
              )
            })}
          </ul>
        </div>
      )}

      {editorOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editing ? 'Editar sistema' : 'Novo sistema'}</h3>
                <p className="text-sm text-slate-500">Anexos aceitos: .env, .txt e .pdf (vários por tipo).</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar">
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome do sistema">
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="Empresa">
                  <input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className={inputClass} />
                </Field>
              </div>

              <Field label="Link">
                <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://" className={inputClass} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Logo</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setLogoFile(file)
                      // Permite selecionar o mesmo arquivo de novo depois
                      e.target.value = ''
                    }}
                    className={fileClass}
                  />
                  {editing && (editing.logo_path || logoSrcById[editing.id]) ? (
                    <p className="mt-1 text-[11px] text-slate-500">Já tem logo. Escolha outra imagem para substituir.</p>
                  ) : null}
                  {logoFile ? <p className="mt-1 text-[11px] font-medium text-emerald-700">Selecionada: {logoFile.name}</p> : null}
                </div>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Anexar .env (1+)</span>
                  <input
                    type="file"
                    multiple
                    accept=".env,.txt,text/plain"
                    onChange={(e) => setEnvFiles(e.target.files)}
                    className={fileClass}
                  />
                </div>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Anexar acessos (.txt/.pdf)</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.pdf,text/plain,application/pdf"
                    onChange={(e) => setAccessFiles(e.target.files)}
                    className={fileClass}
                  />
                </div>
              </div>

              <Field label="Expiração do domínio">
                <input type="date" value={form.domain_expires_at} onChange={(e) => setForm((f) => ({ ...f, domain_expires_at: e.target.value }))} className={inputClass} />
              </Field>

              <Field label="Observações">
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className={inputClass} />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  )
}

function badgeClass(state: 'ok' | 'warn' | 'off' | 'err') {
  if (state === 'ok') return 'bg-emerald-100 text-emerald-800'
  if (state === 'warn') return 'bg-amber-100 text-amber-900'
  if (state === 'err') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-500'
}

function providerState(
  has: boolean,
  pct: number | null,
  hasError: boolean,
): 'ok' | 'warn' | 'off' | 'err' {
  if (!has) return 'off'
  if (hasError) return 'err'
  if (pct != null && pct >= 80) return 'warn'
  return 'ok'
}

function CredField({
  label,
  saved,
  children,
}: {
  label: string
  saved?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {saved ? (
          <span className="rounded bg-emerald-50 px-1 py-px text-[9px] font-bold normal-case tracking-normal text-emerald-700">
            salvo
          </span>
        ) : null}
      </span>
      {children}
    </label>
  )
}

const credInputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-300 focus:border-slate-400'

function MiniUsage({
  label,
  used,
  limit,
  unit = 'bytes',
}: {
  label: string
  used: number | null
  limit: number
  unit?: 'bytes' | 'count'
}) {
  const pct = usagePct(used, limit)
  const tone =
    pct == null ? 'bg-slate-200' : pct >= 90 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const fmt = (n: number | null) =>
    unit === 'bytes' ? formatBytes(n) : n == null ? '—' : String(n)

  return (
    <div className="min-w-[7.5rem] flex-1 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[10px]">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className="tabular-nums text-slate-700">
          {fmt(used)}
          <span className="text-slate-400">/{fmt(limit)}</span>
          {pct != null ? <span className="text-slate-400"> · {pct}%</span> : null}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
      </div>
    </div>
  )
}

function SystemRow({
  system,
  files,
  envCount,
  accessCount,
  domainDays,
  logoSrc,
  integ,
  draft,
  busy,
  onDraftChange,
  onImport,
  onSync,
  onSaveLimits,
  onSaveCredentials,
  onEdit,
  onRemove,
  onDownloadFile,
  onRemoveFile,
}: {
  system: AdminSystem
  files: AdminSystemFile[]
  envCount: number
  accessCount: number
  domainDays: number | null
  logoSrc: string | null
  integ: SystemIntegrationPublic | null
  draft: { cfGb: string; sbDbGb: string; sbStorGb: string; resend: string; resendMonth: string }
  busy: boolean
  onDraftChange: (next: {
    cfGb: string
    sbDbGb: string
    sbStorGb: string
    resend: string
    resendMonth: string
  }) => void
  onImport: () => void
  onSync: () => void
  onSaveLimits: () => void
  onSaveCredentials: (creds: Record<string, string | boolean>) => void
  onEdit: () => void
  onRemove: () => void
  onDownloadFile: (file: AdminSystemFile) => void
  onRemoveFile: (file: AdminSystemFile) => void
}) {
  const [open, setOpen] = useState(false)
  const hasErr = Boolean(integ?.last_error)
  const trackingCf = integ?.track_cloudflare ?? false
  const trackingSb = integ?.track_supabase ?? true
  const trackingResend = integ?.track_resend ?? false
  const cfPct = usagePct(integ?.cf_storage_used_bytes, integ?.cf_storage_limit_bytes)
  const sbStorPct = usagePct(integ?.sb_storage_used_bytes, integ?.sb_storage_limit_bytes)
  const sbDbPct = usagePct(integ?.sb_db_used_bytes, integ?.sb_db_limit_bytes)
  const resPct = usagePct(integ?.resend_sent_today, integ?.resend_daily_limit)

  return (
    <li className="bg-white">
      <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                {system.name.slice(0, 3)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">{system.company_name}</h3>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${reminderTone(domainDays)}`}>
                {reminderLabel(domainDays, 'Domínio')}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              {system.name.trim().toLowerCase() !== system.company_name.trim().toLowerCase() ? (
                <span className="truncate">{system.name}</span>
              ) : null}
              {isHttpLink(system.link) ? (
                <a
                  href={system.link!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-violet-700 hover:underline"
                >
                  {system.link!.replace(/^https?:\/\//, '')}
                </a>
              ) : null}
              <span className="text-slate-400">
                .env {envCount} · acessos {accessCount}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  trackingCf
                    ? badgeClass(providerState(Boolean(integ?.has_cloudflare), cfPct, hasErr))
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {trackingCf ? 'CF' : 'CF off'}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  trackingSb
                    ? badgeClass(providerState(Boolean(integ?.has_supabase), sbStorPct ?? sbDbPct, hasErr))
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {trackingSb ? 'SB' : 'SB off'}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  trackingResend
                    ? badgeClass(providerState(Boolean(integ?.has_resend), resPct, hasErr))
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {trackingResend ? 'Resend' : 'Resend off'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-3">
          {trackingCf ? (
            <MiniUsage
              label="R2"
              used={integ?.cf_storage_used_bytes ?? null}
              limit={integ?.cf_storage_limit_bytes ?? 10 * 1024 ** 3}
            />
          ) : null}
          {trackingSb ? (
            <>
              <MiniUsage
                label="Storage"
                used={integ?.sb_storage_used_bytes ?? null}
                limit={integ?.sb_storage_limit_bytes ?? 1024 ** 3}
              />
              <MiniUsage
                label="DB"
                used={integ?.sb_db_used_bytes ?? null}
                limit={integ?.sb_db_limit_bytes ?? 512 * 1024 ** 2}
              />
            </>
          ) : null}
          {trackingResend ? (
            <MiniUsage
              label="E-mails"
              used={integ?.resend_sent_month ?? null}
              limit={integ?.resend_monthly_limit ?? 3000}
              unit="count"
            />
          ) : null}
          {!trackingCf && !trackingSb && !trackingResend ? (
            <span className="text-[11px] text-slate-400">Nenhum provedor ativo</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={onSync}
            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '...' : 'Sync'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            {open ? 'Fechar' : 'Detalhes'}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 hover:bg-rose-50"
          >
            Excluir
          </button>
        </div>
      </div>

      {integ?.last_error ? (
        <p className="border-t border-rose-50 bg-rose-50/60 px-4 py-1.5 text-[10px] text-rose-700">{integ.last_error}</p>
      ) : null}

      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          <InfraPanel
            systemId={system.id}
            envCount={envCount}
            integ={integ}
            draft={draft}
            busy={busy}
            onDraftChange={onDraftChange}
            onImport={onImport}
            onSync={onSync}
            onSaveLimits={onSaveLimits}
            onSaveCredentials={onSaveCredentials}
            embedded
          />

          {system.notes ? <p className="text-xs text-slate-600">{system.notes}</p> : null}

          {files.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Anexos ({files.length})</p>
              <ul className="mt-1.5 space-y-1">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate font-medium text-slate-700">
                      <span className="mr-1 uppercase text-slate-400">{file.kind}</span>
                      {file.file_name}
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => onDownloadFile(file)} className="font-semibold text-violet-700 hover:underline">
                        Baixar
                      </button>
                      <button type="button" onClick={() => onRemoveFile(file)} className="font-semibold text-rose-700 hover:underline">
                        Excluir
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function InfraPanel({
  systemId,
  envCount,
  integ,
  draft,
  busy,
  onDraftChange,
  onImport,
  onSync,
  onSaveLimits,
  onSaveCredentials,
  embedded = false,
}: {
  systemId: string
  envCount: number
  integ: SystemIntegrationPublic | null
  draft: { cfGb: string; sbDbGb: string; sbStorGb: string; resend: string; resendMonth: string }
  busy: boolean
  onDraftChange: (next: {
    cfGb: string
    sbDbGb: string
    sbStorGb: string
    resend: string
    resendMonth: string
  }) => void
  onImport: () => void
  onSync: () => void
  onSaveLimits: () => void
  onSaveCredentials: (creds: Record<string, string | boolean>) => void
  embedded?: boolean
}) {
  void systemId
  void onSync
  const needsSetup = !integ && envCount === 0
  const needsPat =
    Boolean(integ?.has_supabase) &&
    Boolean(integ?.missing.supabase.some((m) => m.includes('ACCESS_TOKEN')))
  const [credsOpen, setCredsOpen] = useState(embedded || needsSetup || needsPat)
  const [cfAccountId, setCfAccountId] = useState('')
  const [cfApiToken, setCfApiToken] = useState('')
  const [cfBucket, setCfBucket] = useState('')
  const [sbUrl, setSbUrl] = useState('')
  const [sbServiceKey, setSbServiceKey] = useState('')
  const [sbAccessToken, setSbAccessToken] = useState('')
  const [resendKey, setResendKey] = useState('')
  const [trackCf, setTrackCf] = useState(false)
  const [trackSb, setTrackSb] = useState(true)
  const [trackResend, setTrackResend] = useState(false)

  useEffect(() => {
    setCfAccountId(integ?.cf_account_id ?? '')
    setCfBucket(integ?.cf_r2_bucket ?? '')
    setSbUrl(integ?.sb_url ?? '')
    setCfApiToken('')
    setSbServiceKey('')
    setSbAccessToken('')
    setResendKey('')
    setTrackCf(integ?.track_cloudflare ?? false)
    setTrackSb(integ?.track_supabase ?? true)
    setTrackResend(integ?.track_resend ?? false)
  }, [
    integ?.system_id,
    integ?.updated_at,
    integ?.cf_account_id,
    integ?.cf_r2_bucket,
    integ?.sb_url,
    integ?.track_cloudflare,
    integ?.track_supabase,
    integ?.track_resend,
  ])

  const trackingCf = integ?.track_cloudflare ?? trackCf
  const trackingSb = integ?.track_supabase ?? trackSb
  const trackingResend = integ?.track_resend ?? trackResend

  function submitCredentials() {
    const url = sbUrl.trim().replace(/\.supabase\.cc\b/gi, '.supabase.co')
    if (trackSb && url && !/\.supabase\.co$/i.test(url.replace(/\/+$/, ''))) {
      toast.error('URL do Supabase inválida. Use https://xxxxx.supabase.co')
      return
    }
    if (url !== sbUrl) setSbUrl(url)
    onSaveCredentials({
      cf_account_id: cfAccountId,
      cf_api_token: cfApiToken,
      cf_r2_bucket: cfBucket,
      sb_url: url || sbUrl,
      sb_service_role_key: sbServiceKey,
      sb_access_token: sbAccessToken,
      resend_api_key: resendKey,
      track_cloudflare: trackCf,
      track_supabase: trackSb,
      track_resend: trackResend,
    })
  }

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3'}>
      {!embedded ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${trackingCf ? badgeClass('ok') : 'bg-slate-100 text-slate-400'}`}>
              {trackingCf ? 'CF' : 'CF off'}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${trackingSb ? badgeClass('ok') : 'bg-slate-100 text-slate-400'}`}>
              {trackingSb ? 'SB' : 'SB off'}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${trackingResend ? badgeClass('ok') : 'bg-slate-100 text-slate-400'}`}>
              {trackingResend ? 'Resend' : 'Resend off'}
            </span>
          </div>
        </div>
      ) : null}

      <details
        className="group rounded-lg border border-slate-200/80 bg-white"
        open={credsOpen}
        onToggle={(e) => setCredsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>Chaves e provedores</span>
            <span className="text-[10px] font-medium text-slate-400 group-open:hidden">abrir</span>
            <span className="hidden text-[10px] font-medium text-slate-400 group-open:inline">fechar</span>
          </span>
        </summary>

        <div className="space-y-3 border-t border-slate-100 px-2.5 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { checked: trackCf, set: setTrackCf, label: 'Cloudflare' },
                { checked: trackSb, set: setTrackSb, label: 'Supabase' },
                { checked: trackResend, set: setTrackResend, label: 'Resend' },
              ] as const
            ).map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => t.set(!t.checked)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  t.checked ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {trackCf ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <CredField label="Account ID">
                <input value={cfAccountId} onChange={(e) => setCfAccountId(e.target.value)} placeholder="Account ID" className={credInputClass} autoComplete="off" />
              </CredField>
              <CredField label="API Token" saved={integ?.secrets.cf_api_token}>
                <input type="password" value={cfApiToken} onChange={(e) => setCfApiToken(e.target.value)} placeholder={integ?.secrets.cf_api_token ? '••••••••' : 'Token'} className={credInputClass} autoComplete="new-password" />
              </CredField>
              <CredField label="Bucket R2">
                <input value={cfBucket} onChange={(e) => setCfBucket(e.target.value)} placeholder="bucket" className={credInputClass} autoComplete="off" />
              </CredField>
            </div>
          ) : null}

          {trackSb ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <CredField label="Project URL">
                <input value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className={credInputClass} autoComplete="off" />
              </CredField>
              <CredField label="Service Role" saved={integ?.secrets.sb_service_role_key}>
                <input type="password" value={sbServiceKey} onChange={(e) => setSbServiceKey(e.target.value)} placeholder={integ?.secrets.sb_service_role_key ? '••••••••' : 'eyJ...'} className={credInputClass} autoComplete="new-password" />
              </CredField>
              <CredField label="PAT (DB)" saved={integ?.secrets.sb_access_token}>
                <input type="password" value={sbAccessToken} onChange={(e) => setSbAccessToken(e.target.value)} placeholder={integ?.secrets.sb_access_token ? '••••••••' : 'sbp_...'} className={credInputClass} autoComplete="new-password" />
              </CredField>
              {needsPat ? (
                <p className="text-[10px] text-amber-700 sm:col-span-3">
                  PAT: Account → Access Tokens na conta dona deste projeto (Owner/Admin), não o JWT da API.
                </p>
              ) : null}
            </div>
          ) : null}

          {trackResend ? (
            <CredField label="Resend API Key" saved={integ?.secrets.resend_api_key}>
              <input type="password" value={resendKey} onChange={(e) => setResendKey(e.target.value)} placeholder={integ?.secrets.resend_api_key ? '••••••••' : 're_...'} className={credInputClass} autoComplete="new-password" />
            </CredField>
          ) : null}

          <div className="flex gap-1.5">
            <button type="button" disabled={busy || envCount === 0} onClick={onImport} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              .env
            </button>
            <button type="button" disabled={busy} onClick={submitCredentials} className="flex-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-emerald-800 disabled:opacity-60">
              {busy ? '...' : 'Salvar chaves'}
            </button>
          </div>
        </div>
      </details>

      <details className="group rounded-lg border border-slate-200/80 bg-white">
        <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>Limites do plano</span>
            <span className="text-[10px] font-medium text-slate-400 group-open:hidden">abrir</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-slate-100 px-2.5 py-2.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <CredField label="R2 GB">
              <input value={draft.cfGb} onChange={(e) => onDraftChange({ ...draft, cfGb: e.target.value })} className={credInputClass} />
            </CredField>
            <CredField label="SB DB GB">
              <input value={draft.sbDbGb} onChange={(e) => onDraftChange({ ...draft, sbDbGb: e.target.value })} className={credInputClass} />
            </CredField>
            <CredField label="SB Storage GB">
              <input value={draft.sbStorGb} onChange={(e) => onDraftChange({ ...draft, sbStorGb: e.target.value })} className={credInputClass} />
            </CredField>
            <CredField label="Resend/dia">
              <input value={draft.resend} onChange={(e) => onDraftChange({ ...draft, resend: e.target.value })} className={credInputClass} />
            </CredField>
            <CredField label="Resend/mês">
              <input value={draft.resendMonth} onChange={(e) => onDraftChange({ ...draft, resendMonth: e.target.value })} className={credInputClass} />
            </CredField>
          </div>
          <button type="button" disabled={busy || !integ} onClick={onSaveLimits} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Salvar limites
          </button>
        </div>
      </details>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'

const fileClass =
  'w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold'
