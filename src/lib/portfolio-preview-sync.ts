/** Nome partilhado entre o editor do dashboard e a página pública `/u/...` */
export const PORTFOLIO_PREVIEW_CHANNEL = 'yop-portfolio-preview-v1'

export type PortfolioPreviewMessage = { type: 'refresh'; username: string }

/** Avisa outros separadores/janelas com o mesmo origin para voltarem a carregar o portfólio público. */
export function notifyPublicPortfolioUpdated(username: string | null | undefined) {
  const u = username?.trim().toLowerCase()
  if (!u || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  try {
    const bc = new BroadcastChannel(PORTFOLIO_PREVIEW_CHANNEL)
    bc.postMessage({ type: 'refresh', username: u } satisfies PortfolioPreviewMessage)
    bc.close()
  } catch {
    /* ignore */
  }
}
