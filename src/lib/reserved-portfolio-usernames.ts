/**
 * Identificadores da URL pública `/u/[username]` que não podem ser usados por membros.
 * Inclui a rota oficial do portfólio do fundador e nomes que colidem com áreas do site ou soam oficiais.
 */
const RESERVED = new Set(
  [
    'gabriel-portfolio-completo',
    'yopdevs',
    'yop-devs',
    'yop_devs',
    'admin',
    'root',
    'api',
    'auth',
    'login',
    'logout',
    'signup',
    'register',
    'dashboard',
    'portfolio',
    'cv',
    'www',
    'mail',
    'ftp',
    'support',
    'suporte',
    'static',
    '_next',
    'favicon',
    'manifest',
  ].map((s) => s.toLowerCase())
)

export function isReservedPortfolioUsername(slug: string): boolean {
  const s = slug.trim().toLowerCase()
  if (!s) return true
  return RESERVED.has(s)
}

export const RESERVED_PORTFOLIO_USERNAME_MESSAGE =
  'Este endereço está reservado pela YOP Devs (inclui a página oficial do portfólio do fundador e identificadores do sistema). Escolha outro username.'
