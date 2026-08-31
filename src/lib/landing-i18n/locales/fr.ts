import type { ptBr } from './pt-br'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? DeepStringify<U>[] : DeepStringify<T[K]>
}

export const fr: DeepStringify<typeof ptBr> = {
  nav: {
    services: 'Services',
    projects: 'Projets',
    tech: 'Technologies',
    contact: 'Contact',
    login: 'Espace privé',
  },
  hero: {
    eyebrow: 'Entreprise de développement',
    title: 'La technologie qui transforme les idées en systèmes',
    subtitle: 'SaaS, tableaux de bord, apps et automatisations au standard IT d’entreprise, prêts pour la production.',
    ctaProjects: 'Voir les projets',
    ctaContact: 'Nous contacter',
    statProjects: 'Plus de 25 projets livrés',
    statStack: 'Full stack',
    statDelivery: 'Livraison de bout en bout',
    logosLabel: 'Quelques projets déjà réalisés',
  },
  services: {
    eyebrow: 'Services',
    title: 'Solutions IT pour votre entreprise',
    subtitle: 'Du site institutionnel au système métier complet, avec une livraison de bout en bout.',
    cta: 'Je veux ce service',
    items: {
      globe: {
        label: 'Sites institutionnels',
        description: 'Présence digitale claire, rapide et alignée à la marque, avec conversion et SEO solide.',
        detail:
          'Nous créons le site de votre entreprise comme canal de confiance et de génération de leads: identité visuelle forte, pages rapides, contenu structuré et formulaires qui convertissent.',
        points: [
          'Design aligné à la marque et responsive',
          'Performance, SEO technique et Core Web Vitals',
          'Formulaires, CTA et intégration WhatsApp',
          'Panel simple pour mettre à jour le contenu',
        ],
      },
      code: {
        label: 'Systèmes web',
        description: 'Panels et plateformes sur mesure pour les opérations, ventes, CRM et gestion à l’échelle.',
        detail:
          'Nous développons des plateformes internes et des produits SaaS qui organisent le quotidien: CRM, ventes, finance, classement, processus et rapports.',
        points: [
          'CRM, ventes, classement et processus',
          'Tableaux de bord et rapports en temps réel',
          'Multi-utilisateurs, filiales et permissions',
          'APIs, authentification et base PostgreSQL',
        ],
      },
      mobile: {
        label: 'Applications personnalisées',
        description: 'Produits digitaux et PWA pensés pour le flux réel de l’utilisateur et du métier.',
        detail:
          'Nous construisons des applications sur mesure (web apps et PWA) lorsque le flux métier ne rentre pas dans un template.',
        points: [
          'PWA et expérience mobile-first',
          'Flux et règles métier sur mesure',
          'Intégration APIs et gateways',
          'Mise en ligne rapide et évolution continue',
        ],
      },
      gear: {
        label: 'Automatisations et intégrations',
        description: 'Liens entre systèmes, WhatsApp, paiements et routines qui éliminent le travail manuel.',
        detail:
          'Nous automatisons les tâches répétitives et connectons les systèmes que votre entreprise utilise déjà. Moins de travail manuel, moins d’erreurs, plus d’échelle.',
        points: [
          'Playwright: factures, enchères et routines',
          'WhatsApp, Stripe et Mercado Pago',
          'Synchronisation entre systèmes et APIs',
          'Alertes, files et exécution sans intervention',
        ],
      },
    },
  },
  projects: {
    eyebrow: 'Portfolio',
    title: 'Projets produits',
    subtitle: 'Cas réels livrés pour des entreprises et organisations. Cliquez pour agrandir les captures.',
    wantSimilar: 'Je veux un projet comme ça →',
    enlarge: 'Agrandir',
    awaiting: 'Capture à venir',
    descriptions: {
      plify: 'ERP/SaaS pour PME: propositions, clients, finance, WhatsApp, IA et paiements Stripe.',
      westham:
        'Site et panel du club: actualités, matchs, projets, membres, boutique, joueurs et caisse, le tout dans un admin complet.',
      palha:
        'Système d’albums pour mariages et événements: mot de passe, vidéos, téléchargements, grilles et page d’accueil éditable.',
      fenix:
        'Système d’entreprise avec simulations, CRM, calendrier, automatisation Playwright et factures via WhatsApp.',
      teuposto:
        'Plateforme pour stations: analyses, documents, WhatsApp, Mercado Pago et page publique pour suivre les RAQ.',
      demolay:
        'Système du chapitre: site public, espace membre, admin, finances, procès-verbaux, présence, actualités et tirages.',
    },
  },
  process: {
    eyebrow: 'Méthode',
    title: 'Comment nous livrons',
    subtitle: 'Un processus clair, du briefing à l’opération en production.',
    stepLabel: 'Étape',
    steps: [
      {
        title: 'Découverte',
        text: 'Nous cartographions les processus, les règles métier et le résultat qui doit exister en production.',
      },
      {
        title: 'Construction',
        text: 'Architecture propre, sécurité, performance et UX pensée pour le quotidien de l’opération.',
      },
      {
        title: 'Livraison et évolution',
        text: 'Nous publions, formons l’équipe et continuons d’évoluer selon l’usage réel.',
      },
    ],
  },
  tech: {
    eyebrow: 'Stack',
    title: 'Technologies et plateformes',
    subtitle: 'Outils que nous utilisons de bout en bout: frontend, automatisation, paiements et cloud.',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Construisons votre système',
    subtitle: 'Parlez-nous du défi. Nous concevons, développons et mettons en production.',
    cta: 'WhatsApp',
    ctaEmail: 'E-mail',
    chooseEmail: 'Ouvrir avec',
    gmail: 'Gmail',
    outlook: 'Outlook',
    hotmail: 'Hotmail',
    defaultMail: 'App mobile / PC',
    copyEmail: 'Copier l’adresse',
    emailCopied: 'E-mail copié !',
    emailSubject: 'Devis pour développement d’application',
    whatsappMessage: 'Bonjour, je souhaite un devis pour le développement d’une application.',
  },
  leadership: {
    eyebrow: 'Direction',
    name: 'Gabriel Carrara',
    role: 'CEO et Développeur',
    bio: 'Full stack, automatisations et systèmes d’entreprise, de l’idée à l’opération au quotidien.',
    cta: 'Voir le portfolio',
  },
  footer: {
    projects: 'Projets',
    services: 'Services',
    tech: 'Technologies',
    contact: 'Contact',
    portfolio: 'Portfolio',
  },
  auth: {
    loginTitle: 'Connexion',
    signupTitle: 'Créer un compte',
    email: 'E-mail',
    password: 'Mot de passe',
    submitLogin: 'Connexion',
    submitSignup: 'Créer un compte',
    switchToSignup: 'Créer un compte',
    switchToLogin: "J'ai déjà un compte",
    google: 'Continuer avec Google',
  },
  lang: {
    label: 'Langue',
  },
}
