export type MemberPortfolioLanguage = 'pt-br' | 'pt-pt' | 'en' | 'fr' | 'es'

export const memberLanguageLabels: Record<MemberPortfolioLanguage, string> = {
  'pt-br': '🇧🇷 PT-BR',
  'pt-pt': '🇵🇹 PT-PT',
  en: '🇬🇧 EN',
  fr: '🇫🇷 FR',
  es: '🇪🇸 ES',
}

const LANGUAGES: MemberPortfolioLanguage[] = ['pt-br', 'pt-pt', 'en', 'fr', 'es']

export function isMemberPortfolioLanguage(value: string): value is MemberPortfolioLanguage {
  return (LANGUAGES as string[]).includes(value)
}

export function detectMemberPortfolioLanguage(): MemberPortfolioLanguage {
  if (typeof navigator === 'undefined') return 'pt-br'
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('pt-br')) return 'pt-br'
  if (browserLang.startsWith('pt')) return 'pt-pt'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('es')) return 'es'
  return 'en'
}

export function htmlLangForMember(language: MemberPortfolioLanguage): string {
  switch (language) {
    case 'pt-br':
      return 'pt-BR'
    case 'pt-pt':
      return 'pt'
    case 'en':
      return 'en'
    case 'fr':
      return 'fr'
    case 'es':
      return 'es'
    default:
      return 'pt-BR'
  }
}

export function dateLocaleForMember(language: MemberPortfolioLanguage): string {
  switch (language) {
    case 'pt-br':
      return 'pt-BR'
    case 'pt-pt':
      return 'pt-PT'
    case 'en':
      return 'en-US'
    case 'fr':
      return 'fr-FR'
    case 'es':
      return 'es-ES'
    default:
      return 'pt-BR'
  }
}

export type MemberLocaleStrings = {
  navAbout: string
  navSkills: string
  navProjects: string
  navExperience: string
  navFormation: string
  navContact: string
  joinNetwork: string
  joinShort: string
  ariaCloseMenu: string
  ariaOpenMenu: string
  heroGreeting: string
  heroCtaWork: string
  heroCtaContact: string
  aboutTitle: string
  /** Secção Sobre vazia (campo about_text no painel) */
  noAboutBody: string
  titleAvailable: string
  skillsHeading: string
  skillsSubtitle: string
  /** Título de cartão quando veio vazio do JSON legado */
  skillsCardUntitled: string
  projectsHeading: string
  projectsSubtitle: string
  noProjects: string
  viewProject: string
  experienceHeading: string
  experienceSubtitle: string
  formationHeading: string
  formationSubtitle: string
  aboutCardLocation: string
  aboutCardAge: string
  aboutCardStatus: string
  aboutCardMarital: string
  contactHeading: string
  contactSubtitle: string
  labelPhone: string
  labelWebsite: string
  openProfile: string
  repos: string
  joinNetworkFooter: string
  footerCopyright: string
  footerDisclaimer: string
  footerBackHome: string
  periodPresent: string
  loading: string
  errorNotFound: string
  errorLoad: string
  backToHome: string
}

export const memberLocales: Record<MemberPortfolioLanguage, MemberLocaleStrings> = {
  'pt-br': {
    navAbout: 'Sobre',
    navSkills: 'Skills',
    navProjects: 'Projetos',
    navExperience: 'Experiência',
    navFormation: 'Formação',
    navContact: 'Contato',
    joinNetwork: 'Entrar na rede',
    joinShort: 'Entrar',
    ariaCloseMenu: 'Fechar menu',
    ariaOpenMenu: 'Abrir menu',
    heroGreeting: 'Olá, eu sou',
    heroCtaWork: 'Conheça meu trabalho',
    heroCtaContact: 'Entre em contato',
    aboutTitle: 'Sobre',
    noAboutBody: 'Ainda não há texto nesta secção.',
    titleAvailable: 'Disponível para oportunidades',
    skillsHeading: 'Habilidades & Tecnologias',
    skillsSubtitle: 'Competências registadas na plataforma.',
    skillsCardUntitled: 'Sem título',
    projectsHeading: 'Projetos',
    projectsSubtitle: 'Trabalhos e iniciativas partilhados pelo membro.',
    noProjects: 'Nenhum projeto publicado.',
    viewProject: 'Ver projeto',
    experienceHeading: 'Experiência',
    experienceSubtitle: 'Trajetória profissional.',
    formationHeading: 'Formação & Certificações',
    formationSubtitle: 'Cursos, instituições e certificações partilhados pelo membro.',
    aboutCardLocation: 'Localização',
    aboutCardAge: 'Idade',
    aboutCardStatus: 'Status',
    aboutCardMarital: 'Estado civil',
    contactHeading: 'Contato',
    contactSubtitle: 'Canais indicados pelo membro.',
    labelPhone: 'Telefone',
    labelWebsite: 'Website',
    openProfile: 'Abrir perfil',
    repos: 'Repositórios',
    joinNetworkFooter: 'Entrar na rede YOP Devs',
    footerCopyright: '© {year} YOP Devs. Todos os direitos reservados.',
    footerDisclaimer:
      'Conteúdo de portfólio fornecido pelo membro. A YOP Devs não se responsabiliza pela veracidade das informações exibidas.',
    footerBackHome: 'Voltar ao início',
    periodPresent: 'Atual',
    loading: 'A carregar…',
    errorNotFound: 'Portfólio não encontrado.',
    errorLoad: 'Erro ao carregar portfólio',
    backToHome: 'Voltar ao início',
  },
  'pt-pt': {
    navAbout: 'Sobre',
    navSkills: 'Skills',
    navProjects: 'Projetos',
    navExperience: 'Experiência',
    navFormation: 'Formação',
    navContact: 'Contacto',
    joinNetwork: 'Entrar na rede',
    joinShort: 'Entrar',
    ariaCloseMenu: 'Fechar menu',
    ariaOpenMenu: 'Abrir menu',
    heroGreeting: 'Olá, eu sou',
    heroCtaWork: 'Conheça o meu trabalho',
    heroCtaContact: 'Entre em contacto',
    aboutTitle: 'Sobre',
    noAboutBody: 'Ainda não há texto nesta secção.',
    titleAvailable: 'Disponível para oportunidades',
    skillsHeading: 'Skills e tecnologias',
    skillsSubtitle: 'Competências registadas na plataforma.',
    skillsCardUntitled: 'Sem título',
    projectsHeading: 'Projetos',
    projectsSubtitle: 'Trabalhos e iniciativas partilhados pelo membro.',
    noProjects: 'Nenhum projeto publicado.',
    viewProject: 'Ver projeto',
    experienceHeading: 'Experiência',
    experienceSubtitle: 'Percurso profissional.',
    formationHeading: 'Formação & Certificações',
    formationSubtitle: 'Cursos, instituições e certificações partilhados pelo membro.',
    aboutCardLocation: 'Localização',
    aboutCardAge: 'Idade',
    aboutCardStatus: 'Estado',
    aboutCardMarital: 'Estado civil',
    contactHeading: 'Contacto',
    contactSubtitle: 'Canais indicados pelo membro.',
    labelPhone: 'Telefone',
    labelWebsite: 'Website',
    openProfile: 'Abrir perfil',
    repos: 'Repositórios',
    joinNetworkFooter: 'Entrar na rede YOP Devs',
    footerCopyright: '© {year} YOP Devs. Todos os direitos reservados.',
    footerDisclaimer:
      'Conteúdo de portfólio fornecido pelo membro. A YOP Devs não se responsabiliza pela veracidade das informações exibidas.',
    footerBackHome: 'Voltar ao início',
    periodPresent: 'Atual',
    loading: 'A carregar…',
    errorNotFound: 'Portfólio não encontrado.',
    errorLoad: 'Erro ao carregar o portfólio',
    backToHome: 'Voltar ao início',
  },
  en: {
    navAbout: 'About',
    navSkills: 'Skills',
    navProjects: 'Projects',
    navExperience: 'Experience',
    navFormation: 'Education',
    navContact: 'Contact',
    joinNetwork: 'Join the network',
    joinShort: 'Join',
    ariaCloseMenu: 'Close menu',
    ariaOpenMenu: 'Open menu',
    heroGreeting: "Hi, I'm",
    heroCtaWork: 'See my work',
    heroCtaContact: 'Get in touch',
    aboutTitle: 'About',
    noAboutBody: 'There is no content in this section yet.',
    titleAvailable: 'Available for opportunities',
    skillsHeading: 'Skills & technologies',
    skillsSubtitle: 'Skills saved on the platform.',
    skillsCardUntitled: 'Untitled',
    projectsHeading: 'Projects',
    projectsSubtitle: 'Work and initiatives shared by the member.',
    noProjects: 'No projects published yet.',
    viewProject: 'View project',
    experienceHeading: 'Experience',
    experienceSubtitle: 'Professional background.',
    formationHeading: 'Education & certifications',
    formationSubtitle: 'Courses, schools, and certifications shared by the member.',
    aboutCardLocation: 'Location',
    aboutCardAge: 'Age',
    aboutCardStatus: 'Status',
    aboutCardMarital: 'Marital status',
    contactHeading: 'Contact',
    contactSubtitle: 'Channels provided by the member.',
    labelPhone: 'Phone',
    labelWebsite: 'Website',
    openProfile: 'Open profile',
    repos: 'Repositories',
    joinNetworkFooter: 'Join YOP Devs',
    footerCopyright: '© {year} YOP Devs. All rights reserved.',
    footerDisclaimer:
      'Portfolio content is provided by the member. YOP Devs is not responsible for the accuracy of the information displayed.',
    footerBackHome: 'Back to home',
    periodPresent: 'Present',
    loading: 'Loading…',
    errorNotFound: 'Portfolio not found.',
    errorLoad: 'Could not load portfolio',
    backToHome: 'Back to home',
  },
  fr: {
    navAbout: 'À propos',
    navSkills: 'Compétences',
    navProjects: 'Projets',
    navExperience: 'Expérience',
    navFormation: 'Formation',
    navContact: 'Contact',
    joinNetwork: 'Rejoindre le réseau',
    joinShort: 'Rejoindre',
    ariaCloseMenu: 'Fermer le menu',
    ariaOpenMenu: 'Ouvrir le menu',
    heroGreeting: 'Bonjour, je suis',
    heroCtaWork: 'Découvrir mon travail',
    heroCtaContact: 'Me contacter',
    aboutTitle: 'À propos',
    noAboutBody: "Il n'y a pas encore de texte dans cette section.",
    titleAvailable: 'Disponible pour des opportunités',
    skillsHeading: 'Compétences & technologies',
    skillsSubtitle: 'Compétences enregistrées sur la plateforme.',
    skillsCardUntitled: 'Sans titre',
    projectsHeading: 'Projets',
    projectsSubtitle: 'Travaux et initiatives partagés par le membre.',
    noProjects: 'Aucun projet publié.',
    viewProject: 'Voir le projet',
    experienceHeading: 'Expérience',
    experienceSubtitle: 'Parcours professionnel.',
    formationHeading: 'Formation & certifications',
    formationSubtitle: 'Cours, établissements et certifications partagés par le membre.',
    aboutCardLocation: 'Localisation',
    aboutCardAge: 'Âge',
    aboutCardStatus: 'Statut',
    aboutCardMarital: 'État civil',
    contactHeading: 'Contact',
    contactSubtitle: 'Canaux indiqués par le membre.',
    labelPhone: 'Téléphone',
    labelWebsite: 'Site web',
    openProfile: 'Ouvrir le profil',
    repos: 'Dépôts',
    joinNetworkFooter: 'Rejoindre YOP Devs',
    footerCopyright: '© {year} YOP Devs. Tous droits réservés.',
    footerDisclaimer:
      "Contenu du portfolio fourni par le membre. YOP Devs n'est pas responsable de l'exactitude des informations affichées.",
    footerBackHome: "Retour à l'accueil",
    periodPresent: 'Actuel',
    loading: 'Chargement…',
    errorNotFound: 'Portfolio introuvable.',
    errorLoad: 'Erreur de chargement du portfolio',
    backToHome: "Retour à l'accueil",
  },
  es: {
    navAbout: 'Sobre',
    navSkills: 'Skills',
    navProjects: 'Proyectos',
    navExperience: 'Experiencia',
    navFormation: 'Formación',
    navContact: 'Contacto',
    joinNetwork: 'Entrar en la red',
    joinShort: 'Entrar',
    ariaCloseMenu: 'Cerrar menú',
    ariaOpenMenu: 'Abrir menú',
    heroGreeting: 'Hola, soy',
    heroCtaWork: 'Conoce mi trabajo',
    heroCtaContact: 'Ponte en contacto',
    aboutTitle: 'Sobre',
    noAboutBody: 'Todavía no hay texto en esta sección.',
    titleAvailable: 'Disponible para oportunidades',
    skillsHeading: 'Skills y tecnologías',
    skillsSubtitle: 'Competencias registradas en la plataforma.',
    skillsCardUntitled: 'Sin título',
    projectsHeading: 'Proyectos',
    projectsSubtitle: 'Trabajos e iniciativas compartidas por el miembro.',
    noProjects: 'No hay proyectos publicados.',
    viewProject: 'Ver proyecto',
    experienceHeading: 'Experiencia',
    experienceSubtitle: 'Trayectoria profesional.',
    formationHeading: 'Formación y certificaciones',
    formationSubtitle: 'Cursos, centros y certificaciones compartidos por el miembro.',
    aboutCardLocation: 'Ubicación',
    aboutCardAge: 'Edad',
    aboutCardStatus: 'Estado',
    aboutCardMarital: 'Estado civil',
    contactHeading: 'Contacto',
    contactSubtitle: 'Canales indicados por el miembro.',
    labelPhone: 'Teléfono',
    labelWebsite: 'Sitio web',
    openProfile: 'Abrir perfil',
    repos: 'Repositorios',
    joinNetworkFooter: 'Entrar en YOP Devs',
    footerCopyright: '© {year} YOP Devs. Todos los derechos reservados.',
    footerDisclaimer:
      'Contenido del portfolio proporcionado por el miembro. YOP Devs no se responsabiliza de la veracidad de la información mostrada.',
    footerBackHome: 'Volver al inicio',
    periodPresent: 'Actual',
    loading: 'Cargando…',
    errorNotFound: 'Portfolio no encontrado.',
    errorLoad: 'Error al cargar el portfolio',
    backToHome: 'Volver al inicio',
  },
}
