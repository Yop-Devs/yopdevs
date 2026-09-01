export type AdminClientSystem = {
  id: string
  name: string
  company_name: string
  link: string | null
  notes: string | null
}

export type AdminClientDocument = {
  id: string
  client_id: string
  title: string
  file_name: string
  file_path: string
  mime_type: string | null
  file_size: number | null
  created_at: string
  updated_at: string
}

/** Mesmo bucket privado dos sistemas (PDF já liberado). */
export const ADMIN_CLIENT_DOCS_BUCKET = 'admin-system-files'

export type AdminClient = {
  id: string
  /** Espelho legado: nome principal para ordenação/busca */
  full_name: string | null
  /** Espelho legado: documento principal */
  document: string | null
  person_name: string | null
  cpf: string | null
  company_name: string | null
  cnpj: string | null
  cep: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
  systems?: AdminClientSystem[]
  documents?: AdminClientDocument[]
}

export type AdminSystemOption = {
  id: string
  name: string
  company_name: string
  link: string | null
  notes: string | null
}

export type ClientDocMode = 'cpf' | 'cnpj' | 'both'

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** @deprecated use formatCpf / formatCnpj */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  if (digits.length <= 11) return formatCpf(digits)
  return formatCnpj(digits)
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').replace(/[-\s]+$/, '')
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').replace(/[-\s]+$/, '')
}

export function clientDisplayName(client: Pick<AdminClient, 'person_name' | 'company_name' | 'full_name'>): string {
  return client.person_name || client.company_name || client.full_name || 'Cliente'
}

export function inferClientDocMode(client: Pick<AdminClient, 'cpf' | 'cnpj' | 'person_name' | 'company_name'>): ClientDocMode {
  const hasCpf = Boolean(client.cpf || client.person_name)
  const hasCnpj = Boolean(client.cnpj || client.company_name)
  if (hasCpf && hasCnpj) return 'both'
  if (hasCnpj) return 'cnpj'
  return 'cpf'
}

export function formatAddressLine(
  client: Pick<AdminClient, 'street' | 'address_number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'cep'>,
): string {
  const parts = [
    [client.street, client.address_number].filter(Boolean).join(', '),
    client.complement,
    client.neighborhood,
    [client.city, client.state].filter(Boolean).join(' - '),
    client.cep ? `CEP ${client.cep}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

export async function fetchAddressByCep(cep: string): Promise<{
  street: string
  neighborhood: string
  city: string
  state: string
} | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) return null
  const data = (await res.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }
  if (data.erro) return null
  return {
    street: data.logradouro ?? '',
    neighborhood: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  }
}
