/** Hosts da área admin (subdomínio). */
export function isAdminHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false
  const host = hostname.toLowerCase().split(':')[0]
  return host === 'admin.yopdevs.com.br' || host === 'admin.localhost'
}
