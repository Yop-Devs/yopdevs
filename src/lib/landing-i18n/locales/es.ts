import type { ptBr } from './pt-br'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? DeepStringify<U>[] : DeepStringify<T[K]>
}

export const es: DeepStringify<typeof ptBr> = {
  nav: {
    services: 'Servicios',
    projects: 'Proyectos',
    tech: 'Tecnologías',
    contact: 'Contacto',
    login: 'Área privada',
  },
  hero: {
    eyebrow: 'Empresa de desarrollo',
    title: 'Tecnología que transforma ideas en sistemas',
    subtitle: 'SaaS, paneles, apps y automatizaciones con estándar corporativo de TI, listas para producción.',
    ctaProjects: 'Ver proyectos',
    ctaContact: 'Hablar con nosotros',
    statProjects: 'Más de 25 proyectos entregados',
    statStack: 'Full stack',
    statDelivery: 'Entrega de punta a punta',
    logosLabel: 'Algunos proyectos ya desarrollados',
  },
  services: {
    eyebrow: 'Servicios',
    title: 'Soluciones de TI para tu negocio',
    subtitle: 'Desde el sitio institucional hasta el sistema empresarial completo, con entrega integral.',
    cta: 'Quiero este servicio',
    items: {
      globe: {
        label: 'Sitios institucionales',
        description: 'Presencia digital clara, rápida y alineada a la marca, con conversión y SEO sólido.',
        detail:
          'Creamos el sitio de tu empresa como canal de confianza y generación de leads: identidad visual fuerte, páginas rápidas, contenido estructurado y formularios que convierten.',
        points: [
          'Diseño alineado a la marca y responsive',
          'Rendimiento, SEO técnico y Core Web Vitals',
          'Formularios, CTAs e integración con WhatsApp',
          'Panel simple para actualizar contenidos',
        ],
      },
      code: {
        label: 'Sistemas web',
        description: 'Paneles y plataformas a medida para operación, ventas, CRM y gestión a escala.',
        detail:
          'Desarrollamos plataformas internas y productos SaaS que organizan la operación diaria: CRM, ventas, finanzas, ranking, procesos e informes.',
        points: [
          'CRM, ventas, ranking y procesos',
          'Dashboards e informes en tiempo real',
          'Multiusuario, sucursales y permisos',
          'APIs, autenticación y base PostgreSQL',
        ],
      },
      mobile: {
        label: 'Aplicaciones personalizadas',
        description: 'Productos digitales y PWAs pensados para el flujo real del usuario y del negocio.',
        detail:
          'Construimos aplicaciones a medida (web apps y PWAs) cuando el flujo del negocio no cabe en una plantilla.',
        points: [
          'PWA y experiencia mobile-first',
          'Flujos y reglas de negocio a medida',
          'Integración con APIs y pasarelas',
          'Publicación rápida y evolución continua',
        ],
      },
      gear: {
        label: 'Automatizaciones e integraciones',
        description: 'Conexiones entre sistemas, WhatsApp, pagos y rutinas que eliminan trabajo manual.',
        detail:
          'Automatizamos tareas repetitivas y conectamos los sistemas que tu empresa ya usa. Menos trabajo manual, menos error y más escala.',
        points: [
          'Playwright: boletos, pujas y rutinas',
          'WhatsApp, Stripe y Mercado Pago',
          'Sincronización entre sistemas y APIs',
          'Alertas, colas y ejecución sin intervención',
        ],
      },
    },
  },
  projects: {
    eyebrow: 'Portafolio',
    title: 'Proyectos producidos',
    subtitle: 'Casos reales entregados a empresas y organizaciones. Haz clic para ampliar las capturas.',
    wantSimilar: 'Quiero un proyecto así →',
    enlarge: 'Ampliar',
    awaiting: 'Captura pendiente',
    descriptions: {
      plify: 'ERP/SaaS para pymes: propuestas, clientes, finanzas, WhatsApp, IA y pagos con Stripe.',
      westham:
        'Sitio y panel del club: noticias, partidos, proyectos, socios, tienda, jugadores y caja, todo en un admin completo.',
      palha:
        'Sistema de álbumes para bodas y eventos: contraseña, videos, descargas, galerías y home editable por el admin.',
      fenix:
        'Sistema empresarial con simulaciones, CRM, calendario, automatización con Playwright y boletos por WhatsApp.',
      teuposto:
        'Plataforma para estaciones: análisis, documentos, WhatsApp, Mercado Pago y página pública para seguir RAQs.',
      meb:
        'Gestión de flota propia y de terceros: conductores, viajes, finanzas, documentación con avisos de vencimiento e informes.',
      toq:
        'Red social de tenis con gestión de canchas, clubes, comunidades, torneos, clases, chat y planes con pago automático.',
      demolay:
        'Sistema del capítulo: sitio público, área de miembro, admin, finanzas, actas, asistencia, noticias y sorteos.',
    },
  },
  process: {
    eyebrow: 'Método',
    title: 'Cómo entregamos',
    subtitle: 'Un proceso claro, del briefing a la operación en producción.',
    stepLabel: 'Etapa',
    steps: [
      {
        title: 'Descubrimiento',
        text: 'Mapeamos procesos, reglas de negocio y el resultado que debe existir en producción.',
      },
      {
        title: 'Construcción',
        text: 'Arquitectura limpia, seguridad, rendimiento y UX pensada para el día a día de la operación.',
      },
      {
        title: 'Entrega y evolución',
        text: 'Publicamos, capacitamos al equipo y seguimos evolucionando con base en el uso real.',
      },
    ],
  },
  tech: {
    eyebrow: 'Stack',
    title: 'Tecnologías y plataformas',
    subtitle: 'Herramientas que usamos de punta a punta: frontend, automatización, pagos y cloud.',
  },
  contact: {
    eyebrow: 'Contacto',
    title: 'Vamos a construir tu sistema',
    subtitle: 'Cuéntanos el desafío. Diseñamos, desarrollamos y lo llevamos a producción.',
    cta: 'WhatsApp',
    ctaEmail: 'Correo',
    chooseEmail: 'Abrir con',
    gmail: 'Gmail',
    outlook: 'Outlook',
    hotmail: 'Hotmail',
    defaultMail: 'App del móvil / PC',
    copyEmail: 'Copiar dirección',
    emailCopied: '¡Correo copiado!',
    emailSubject: 'Presupuesto de desarrollo de aplicación',
    whatsappMessage: 'Hola, me gustaría pedir un presupuesto de desarrollo de aplicación.',
  },
  leadership: {
    eyebrow: 'Liderazgo',
    name: 'Gabriel Carrara',
    role: 'CEO y Desarrollador',
    bio: 'Full stack, automatizaciones y sistemas empresariales, de la idea a la operación diaria.',
    cta: 'Conocer el portafolio',
  },
  footer: {
    projects: 'Proyectos',
    services: 'Servicios',
    tech: 'Tecnologías',
    contact: 'Contacto',
    portfolio: 'Portafolio',
  },
  auth: {
    loginTitle: 'Entrar',
    signupTitle: 'Crear cuenta',
    email: 'Correo',
    password: 'Contraseña',
    submitLogin: 'Entrar',
    submitSignup: 'Crear cuenta',
    switchToSignup: 'Crear cuenta',
    switchToLogin: 'Ya tengo cuenta',
    google: 'Continuar con Google',
  },
  lang: {
    label: 'Idioma',
  },
}
