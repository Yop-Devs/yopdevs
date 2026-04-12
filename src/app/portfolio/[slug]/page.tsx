import { permanentRedirect } from 'next/navigation'

/** URLs antigas /portfolio/:slug → portfólio público da rede em /u/:username. */
export default async function PortfolioLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) permanentRedirect('/')
  permanentRedirect(`/u/${encodeURIComponent(slug)}`)
}
