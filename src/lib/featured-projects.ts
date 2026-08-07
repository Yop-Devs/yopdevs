/** Projetos em destaque na landing (portfólio da YOP Devs).
 *
 * Logos: public/projetos/{key}.png|.webp (fenix e yopdevs têm caminhos próprios)
 * Prints: public/projetos/prints/ — usados na secção de cases
 */
export const FEATURED_PROJECTS = [
  {
    key: 'plify',
    name: 'Plify 360',
    short: 'Plify',
    tag: 'SaaS',
    description:
      'ERP/SaaS para PMEs: propostas, clientes, financeiro, WhatsApp, IA e pagamentos com Stripe.',
    href: 'https://plify360.com.br',
    logo: '/projetos/plify.png?v=3',
    image: '/projetos/prints/plify.png',
    print: '/projetos/prints/plify.png',
  },
  {
    key: 'westham',
    name: 'West Ham FC',
    short: 'West Ham',
    tag: 'Gestão esportiva',
    description:
      'Gestão completa de clube: notícias, loja, sócios, financeiro e operação desportiva num só painel.',
    href: 'https://westham.com.br',
    logo: '/projetos/westham.webp?v=2',
    image: '/projetos/prints/westham.png',
    print: '/projetos/prints/westham.png',
  },
  {
    key: 'tryly',
    name: 'Tryly',
    short: 'Tryly',
    tag: 'Produto digital',
    description:
      'App de hábitos com missões diárias, IA e checkout via Mercado Pago — foco em retenção.',
    href: 'https://www.tryly.com.br',
    logo: '/projetos/tryly.png?v=20260412',
    image: '/projetos/prints/tryly.png',
    print: '/projetos/prints/tryly.png',
  },
  {
    key: 'fenix',
    name: 'Fênix Gestora',
    short: 'Fênix',
    tag: 'Consórcios',
    description:
      'Sistema para empresas representantes de consórcios: CRM, ranking, processos, cartas contempladas e vendas. Integrações com Playwright para envio automático de boletos e oferta de lances fixos.',
    href: 'https://www.fenixgestora.com.br',
    logo: '/projetos/fenix/logo.420a748b9c9c09dc115e.png',
    image: '/projetos/prints/fenix.png?v=4',
    print: '/projetos/prints/fenix.png?v=4',
    gallery: [
      '/projetos/prints/fenix.png?v=4',
      '/projetos/prints/fenix/safe/inicial.png',
      '/projetos/prints/fenix/safe/vendas.png',
      '/projetos/prints/fenix/safe/crm.png',
      '/projetos/prints/fenix/safe/ranking.png',
      '/projetos/prints/fenix/safe/processos.png',
      '/projetos/prints/fenix/safe/cartas.png',
      '/projetos/prints/fenix/safe/docs.png',
      '/projetos/prints/fenix/safe/login.png',
    ],
  },
  {
    key: 'yopdevs',
    name: 'YOP Devs Platform',
    short: 'YOP Devs',
    tag: 'Plataforma',
    description:
      'Infraestrutura própria com autenticação, portfólios públicos e ferramentas para builders.',
    href: 'https://www.yopdevs.com.br',
    logo: '/yop-logo.png?v=2',
    image: '/projetos/prints/yopdevs.png',
    print: '/projetos/prints/yopdevs.png',
  },
  {
    key: 'demolay',
    name: 'Capítulo 862 — Ordem DeMolay',
    short: 'DeMolay',
    tag: 'Institucional',
    description:
      'Site e painel institucional: membros, atas, inscrições e controlo financeiro da organização.',
    href: 'https://capitulo862.vercel.app',
    logo: '/projetos/capitulo.webp',
    image: '/projetos/prints/demolay.png',
    print: '/projetos/prints/demolay.png',
  },
] as const

export type FeaturedProject = (typeof FEATURED_PROJECTS)[number] & {
  gallery?: readonly string[]
}

export const SERVICES = [
  {
    label: 'Sites institucionais',
    icon: 'globe',
    accent: 'cyan',
    description: 'Presença digital clara, rápida e alinhada à marca — com conversão e SEO de base.',
    detail:
      'Criamos o site da sua empresa como canal de confiança e geração de leads: identidade visual forte, páginas rápidas, conteúdo estruturado e formulários que convertem. Ideal para apresentar serviços, cases e facilitar o primeiro contacto com o cliente.',
    points: [
      'Design alinhado à marca e responsivo',
      'Performance, SEO técnico e Core Web Vitals',
      'Formulários, CTAs e integração com WhatsApp',
      'Painel simples para atualizar conteúdos',
    ],
  },
  {
    label: 'Sistemas web',
    icon: 'code',
    accent: 'violet',
    description: 'Painéis e plataformas sob medida para operação, vendas, CRM e gestão em escala.',
    detail:
      'Desenvolvemos plataformas internas e produtos SaaS que organizam a operação do dia a dia: CRM, vendas, financeiro, ranking, processos e relatórios. Tudo com permissões por utilizador, dados em tempo real e arquitetura preparada para crescer com o negócio.',
    points: [
      'CRM, vendas, ranking e processos',
      'Dashboards e relatórios em tempo real',
      'Multi-usuário, filiais e permissões',
      'APIs, autenticação e base PostgreSQL',
    ],
  },
  {
    label: 'Aplicações personalizadas',
    icon: 'mobile',
    accent: 'fuchsia',
    description: 'Produtos digitais e PWAs pensados para o fluxo real do utilizador e do negócio.',
    detail:
      'Construímos aplicações sob medida — web apps e PWAs — quando o fluxo do negócio não cabe num template. Do onboarding ao checkout, desenhamos a experiência à volta do utilizador e ligamos a APIs, pagamentos e automações necessárias.',
    points: [
      'PWA e experiência mobile-first',
      'Fluxos e regras de negócio sob medida',
      'Integração com APIs e gateways',
      'Publicação rápida e evolução contínua',
    ],
  },
  {
    label: 'Automações e integrações',
    icon: 'gear',
    accent: 'amber',
    description: 'Ligações entre sistemas, WhatsApp, pagamentos e rotinas que eliminam trabalho manual.',
    detail:
      'Automatizamos tarefas repetitivas e ligamos os sistemas que a sua empresa já usa. Desde envio de boletos e lances com Playwright até WhatsApp, pagamentos e sincronização de dados — menos trabalho manual, menos erro e mais escala.',
    points: [
      'Playwright: boletos, lances e rotinas',
      'WhatsApp, Stripe e Mercado Pago',
      'Sincronização entre sistemas e APIs',
      'Alertas, filas e execução sem intervenção',
    ],
  },
] as const

export const TECH_STACK = [
  { name: 'Next.js', short: 'N' },
  { name: 'React', short: '⚛' },
  { name: 'Node.js', short: 'JS' },
  { name: 'TypeScript', short: 'TS' },
  { name: 'PostgreSQL', short: 'PG' },
  { name: 'Supabase', short: 'SB' },
  { name: 'Vercel', short: '▲' },
  { name: 'Cloudflare', short: 'CF' },
  { name: 'Stripe', short: 'S' },
  { name: 'APIs', short: '{ }' },
  { name: 'GitHub', short: 'GH' },
  { name: 'Docker', short: 'D' },
] as const
