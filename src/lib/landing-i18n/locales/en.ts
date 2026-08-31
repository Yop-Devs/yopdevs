import type { ptBr } from './pt-br'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? DeepStringify<U>[] : DeepStringify<T[K]>
}

export const en: DeepStringify<typeof ptBr> = {
  nav: {
    services: 'Services',
    projects: 'Projects',
    tech: 'Technologies',
    contact: 'Contact',
    login: 'Private area',
  },
  hero: {
    eyebrow: 'Software development company',
    title: 'Technology that turns ideas into systems',
    subtitle: 'SaaS, dashboards, apps and automations with enterprise IT standards, ready for production.',
    ctaProjects: 'See projects',
    ctaContact: 'Talk to us',
    statProjects: '25+ projects delivered',
    statStack: 'Full stack',
    statDelivery: 'End-to-end delivery',
    logosLabel: 'Some projects we have built',
  },
  services: {
    eyebrow: 'Services',
    title: 'IT solutions for your business',
    subtitle: 'From institutional websites to complete business systems, with end-to-end delivery.',
    cta: 'I want this service',
    items: {
      globe: {
        label: 'Institutional websites',
        description: 'Clear, fast digital presence aligned with your brand, with conversion and solid SEO.',
        detail:
          'We build your company website as a trust and lead channel: strong visual identity, fast pages, structured content and forms that convert. Ideal to present services, case studies and make the first contact easier.',
        points: [
          'Brand-aligned responsive design',
          'Performance, technical SEO and Core Web Vitals',
          'Forms, CTAs and WhatsApp integration',
          'Simple panel to update content',
        ],
      },
      code: {
        label: 'Web systems',
        description: 'Custom panels and platforms for operations, sales, CRM and scaled management.',
        detail:
          'We build internal platforms and SaaS products that organize daily operations: CRM, sales, finance, ranking, workflows and reports. With user permissions, real-time data and architecture ready to grow with the business.',
        points: [
          'CRM, sales, ranking and workflows',
          'Real-time dashboards and reports',
          'Multi-user, branches and permissions',
          'APIs, authentication and PostgreSQL',
        ],
      },
      mobile: {
        label: 'Custom applications',
        description: 'Digital products and PWAs designed around real user and business flows.',
        detail:
          'We build custom apps (web apps and PWAs) when business flow does not fit a template. From onboarding to checkout, we design the experience around the user and connect the APIs, payments and automations you need.',
        points: [
          'PWA and mobile-first experience',
          'Custom flows and business rules',
          'API and payment gateway integration',
          'Fast shipping and continuous evolution',
        ],
      },
      gear: {
        label: 'Automation and integrations',
        description: 'Connections between systems, WhatsApp, payments and routines that remove manual work.',
        detail:
          'We automate repetitive tasks and connect the systems your company already uses. From invoices and bids with Playwright to WhatsApp, payments and data sync: less manual work, fewer errors and more scale.',
        points: [
          'Playwright: invoices, bids and routines',
          'WhatsApp, Stripe and Mercado Pago',
          'Sync between systems and APIs',
          'Alerts, queues and hands-off execution',
        ],
      },
    },
  },
  projects: {
    eyebrow: 'Portfolio',
    title: 'Projects delivered',
    subtitle: 'Real cases delivered for companies and organizations. Click to enlarge the screenshots.',
    wantSimilar: 'I want a project like this →',
    enlarge: 'Enlarge',
    awaiting: 'Screenshot coming soon',
    descriptions: {
      plify: 'ERP/SaaS for SMEs: proposals, clients, finance, WhatsApp, AI and Stripe payments.',
      westham:
        'Club website and admin: news, matches (FUT11, Fut7 and Futsal), projects, members, store, players and cash, all in one complete admin.',
      palha:
        'Album system for weddings and events: password, videos, downloads, gallery layouts and an admin-editable homepage.',
      fenix:
        'Business system with simulations, CRM, calendar, Playwright automation and WhatsApp invoices.',
      teuposto:
        'Platform for gas stations: analyses, documents, WhatsApp, Mercado Pago and a public page to follow RAQs.',
      demolay:
        'Chapter system: public site, member area, admin, finance, minutes, attendance, news and raffles.',
    },
  },
  process: {
    eyebrow: 'Method',
    title: 'How we deliver',
    subtitle: 'A clear process, from briefing to production operations.',
    stepLabel: 'Step',
    steps: [
      {
        title: 'Discovery',
        text: 'We map processes, business rules and the outcome that needs to exist in production.',
      },
      {
        title: 'Build',
        text: 'Clean architecture, security, performance and UX designed for day-to-day operations.',
      },
      {
        title: 'Launch and evolve',
        text: 'We ship, train the team and keep evolving based on real usage.',
      },
    ],
  },
  tech: {
    eyebrow: 'Stack',
    title: 'Technologies and platforms',
    subtitle: 'Tools we use end to end: frontend, automation, payments and cloud.',
  },
  contact: {
    eyebrow: 'Contact',
    title: "Let's build your system",
    subtitle: 'Tell us the challenge. We design, develop and ship to production.',
    cta: 'WhatsApp',
    ctaEmail: 'Email',
    chooseEmail: 'Open with',
    gmail: 'Gmail',
    outlook: 'Outlook',
    hotmail: 'Hotmail',
    defaultMail: 'Phone / PC mail app',
    copyEmail: 'Copy address',
    emailCopied: 'Email copied!',
    emailSubject: 'Quote for app development',
    whatsappMessage: 'Hi, I would like a quote for app development.',
  },
  leadership: {
    eyebrow: 'Leadership',
    name: 'Gabriel Carrara',
    role: 'CEO and Developer',
    bio: 'Full stack, automations and business systems, from idea to day-to-day operations.',
    cta: 'See the portfolio',
  },
  footer: {
    projects: 'Projects',
    services: 'Services',
    tech: 'Technologies',
    contact: 'Contact',
    portfolio: 'Portfolio',
  },
  auth: {
    loginTitle: 'Sign in',
    signupTitle: 'Create account',
    email: 'Email',
    password: 'Password',
    submitLogin: 'Sign in',
    submitSignup: 'Create account',
    switchToSignup: 'Create account',
    switchToLogin: 'I already have an account',
    google: 'Continue with Google',
  },
  lang: {
    label: 'Language',
  },
}
