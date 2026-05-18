// ═══════════════════════════════════════════════════════════════════════════
// Pre-Activación Checklist — versión operativa (validada por Ivan + Lupe).
// 6 secciones · 32 pasos tácticos con herramienta asociada.
// ═══════════════════════════════════════════════════════════════════════════

export interface PreactivacionStepDef {
  id: string;
  /** Label corto multilínea para columna. Usar \n para forzar salto de línea. */
  lbl: string;
  title: string;
  /** Detail rendered as HTML — puede contener <strong>. */
  detail: string;
}

export interface PreactivacionSection {
  id: string;
  title: string;
  /** Etiqueta corta para el header de grupo en la matriz. */
  short: string;
  items: PreactivacionStepDef[];
}

export interface PreactivacionStep extends PreactivacionStepDef {
  sectionId: string;
}

export const SECTIONS: PreactivacionSection[] = [
  {
    id: 'contenido',
    title: 'Contenido Orgánico',
    short: 'CONTENIDO',
    items: [
      {
        id: 'posts_paleta',
        lbl: 'Posts\npaleta',
        title: 'Posts/carruseles publicados con su paleta',
        detail: 'Feed con piezas consistentes en paleta y tipografía de marca. <strong>Herramienta:</strong> Canva.',
      },
      {
        id: 'post_cta_lm',
        lbl: 'Post CTA\n→ LM',
        title: 'Post/carrusel con CTA al lead magnet (comentario keyword)',
        detail: 'Al menos 1 pieza con CTA "comentá [keyword] y te mando el LM". <strong>Herramienta:</strong> Canva.',
      },
      {
        id: 'reel_editado',
        lbl: 'Reel\neditado',
        title: 'Reel editado con subtítulos y música',
        detail: 'Reel publicado con subtítulos quemados y audio de tendencia o música licenciada. <strong>Herramienta:</strong> CapCut.',
      },
      {
        id: 'programado_7d',
        lbl: 'Prog.\n7 días',
        title: 'Contenido programado para los próximos 7 días',
        detail: 'Mín 4-5 piezas agendadas en cola, no publicación manual día a día. <strong>Herramienta:</strong> Meta Business Suite.',
      },
      {
        id: 'bio_optim',
        lbl: 'Bio\noptim.',
        title: 'Bio de Instagram/Facebook optimizada con CTA claro',
        detail: 'PUV en bio + foto profesional + UN link al lead magnet o agenda. <strong>Herramienta:</strong> Instagram.',
      },
      {
        id: 'destacados',
        lbl: 'Desta\ncadas',
        title: 'Portadas de destacados alineadas a la marca',
        detail: 'Highlights con portadas en la paleta. Sobre Mí · Método · Testimonios · Agendar. <strong>Herramienta:</strong> Canva.',
      },
      {
        id: 'creativos_ads',
        lbl: 'Creativos\nads',
        title: 'Creativos específicos para ads (hook 2seg + CTA)',
        detail: 'Distintos al orgánico. Hook en los primeros 2 segundos + CTA directo. <strong>Herramienta:</strong> Canva / CapCut.',
      },
    ],
  },
  {
    id: 'lm',
    title: 'Lead Magnet',
    short: 'LM',
    items: [
      {
        id: 'lm_funcional',
        lbl: 'LM\nfuncional',
        title: 'Lead magnet creado y funcional (quiz IA / PDF / video)',
        detail: 'Probado end-to-end por una persona externa. <strong>Herramienta:</strong> HTML + API Claude.',
      },
      {
        id: 'landing_lm',
        lbl: 'Landing\nLM',
        title: 'Landing del lead magnet publicada y accesible',
        detail: 'URL pública, mobile-first, carga rápida. <strong>Herramienta:</strong> HTML.',
      },
      {
        id: 'botones_ok',
        lbl: 'Botones\nOK',
        title: 'Botones de la landing funcionan correctamente',
        detail: 'Cada CTA testeado: redirige, abre o ejecuta lo prometido. <strong>Herramienta:</strong> HTML.',
      },
      {
        id: 'wa_precarg',
        lbl: 'WA pre\ncarg.',
        title: 'Botón WhatsApp con mensaje precargado',
        detail: 'Link wa.me con texto inicial listo para enviar (sin tipear). <strong>Herramienta:</strong> HTML.',
      },
      {
        id: 'entrega_auto',
        lbl: 'Entrega\nauto',
        title: 'Lead magnet se entrega automáticamente al completar',
        detail: 'Sin intervención humana. Email o DM inmediato post-conversión. <strong>Herramienta:</strong> GHL / ManyChat.',
      },
      {
        id: 'captura_email',
        lbl: 'Captura\nemail',
        title: 'Captura email del lead al completar',
        detail: 'Email entra a la base con tag identificable. <strong>Herramienta:</strong> GHL.',
      },
    ],
  },
  {
    id: 'vsl_agenda',
    title: 'VSL y Agenda',
    short: 'VSL+AGENDA',
    items: [
      {
        id: 'vsl_subida',
        lbl: 'VSL\nsubida',
        title: 'VSL grabada y subida',
        detail: '8-15 min. Gancho → problema → método → prueba social → oferta → CTA. <strong>Herramienta:</strong> YouTube.',
      },
      {
        id: 'landing_vsl',
        lbl: 'Landing\nVSL',
        title: 'Landing VSL con video + CTA a agenda',
        detail: 'Página con VSL embebida y botón directo al calendario. <strong>Herramienta:</strong> HTML.',
      },
      {
        id: 'calendario_ghl',
        lbl: 'Cal.\nGHL',
        title: 'Calendario GHL configurado y funcionando',
        detail: 'Zona horaria correcta, slots reales disponibles, link Meet/Zoom automático. <strong>Herramienta:</strong> GHL.',
      },
      {
        id: 'preparacion',
        lbl: 'Página\nprep.',
        title: 'Página de preparación post-agenda optimizada',
        detail: 'Después de agendar: video o checklist que prepara al lead para la llamada. <strong>Herramienta:</strong> HTML.',
      },
      {
        id: 'recordatorio_pre',
        lbl: 'Record.\npre-ses.',
        title: 'Recordatorio automático pre-sesión (email/WPP)',
        detail: '24hs antes + 1hr antes. Email + WhatsApp. Reduce no-shows. <strong>Herramienta:</strong> GHL.',
      },
    ],
  },
  {
    id: 'auto',
    title: 'Automatizaciones',
    short: 'AUTO',
    items: [
      {
        id: 'manychat_kw',
        lbl: 'ManyChat\nkeyword',
        title: 'ManyChat: keyword en comentario IG → DM con link al LM',
        detail: 'Comentario con palabra clave dispara DM automático con el lead magnet. <strong>Herramienta:</strong> ManyChat.',
      },
      {
        id: 'ghl_kw',
        lbl: 'GHL\nkeyword',
        title: 'GHL: automatización keyword comentario IG → respuesta',
        detail: 'Workflow paralelo o backup en GHL para la misma keyword. <strong>Herramienta:</strong> GHL.',
      },
      {
        id: 'notif_agenda',
        lbl: 'Notif.\nagenda',
        title: 'Notificación cuando llega nueva agenda (al equipo)',
        detail: 'Cada nueva reserva genera ping al equipo. <strong>Herramienta:</strong> GHL → Discord.',
      },
      {
        id: 'emails_post_lm',
        lbl: 'Emails\npost LM',
        title: 'Secuencia de 3-5 emails post lead magnet',
        detail: 'Email 1: entrega. 2-3: valor. 4-5: CTA agendar. <strong>Herramienta:</strong> GHL email.',
      },
      {
        id: 'leads_sheets',
        lbl: 'Leads →\nSheets',
        title: 'Leads nuevos → Google Sheets automático',
        detail: 'Cada lead se replica a Sheets para tracking y respaldo. <strong>Herramienta:</strong> Make / n8n.',
      },
      {
        id: 'email_bienvenida',
        lbl: 'Email\nbienv.',
        title: 'Email de bienvenida automático para nuevos leads',
        detail: 'Inmediato post-captura. Presentación + próximos pasos. <strong>Herramienta:</strong> GHL.',
      },
    ],
  },
  {
    id: 'meta',
    title: 'Meta Ads',
    short: 'META',
    items: [
      {
        id: 'bm_team',
        lbl: 'BM +\nequipo',
        title: 'Business Manager configurado y con acceso del equipo',
        detail: 'BM verificado con datos reales. Roles asignados al equipo. <strong>Herramienta:</strong> Meta.',
      },
      {
        id: 'pixel_all',
        lbl: 'Pixel\ntodo',
        title: 'Pixel Meta instalado en todas las landings',
        detail: 'PageView + eventos de conversión activos. Verificar con Pixel Helper. <strong>Herramienta:</strong> Meta + HTML.',
      },
      {
        id: 'campana_armada',
        lbl: 'Camp.\narmada',
        title: 'Campaña armada (1 campaña / 1 ad set / creativos)',
        detail: 'Estructura mínima limpia: 1 campaña, 1 ad set, mín 3 creativos. <strong>Herramienta:</strong> Meta Ads.',
      },
      {
        id: 'campana_activa',
        lbl: 'Camp.\nactiva',
        title: 'Campaña activa y corriendo con $25/día',
        detail: 'Budget mínimo de $25 USD/día durante al menos 7 días. <strong>Herramienta:</strong> Meta Ads.',
      },
      {
        id: 'cpl_ok',
        lbl: 'CPL\nOK',
        title: 'CPL dentro de rango saludable ($3-8 USD)',
        detail: 'Costo por lead entre $3 y $8 USD. Si está fuera, frenar y ajustar. <strong>Herramienta:</strong> Meta Ads.',
      },
    ],
  },
  {
    id: 'plataformas',
    title: 'Plataformas',
    short: 'PLATAF.',
    items: [
      {
        id: 'skool_lm',
        lbl: 'Skool\n+ LMs',
        title: 'Skool montado con lead magnets adentro',
        detail: 'Comunidad creada, bienvenida + LMs como contenido inicial. <strong>Herramienta:</strong> Skool.',
      },
      {
        id: 'dominio_landing',
        lbl: 'Dominio\nlanding',
        title: 'Dominio personalizado conectado a la landing',
        detail: 'No URL genérica de plataforma. DNS configurado y SSL activo. <strong>Herramienta:</strong> DNS / Cloudflare.',
      },
      {
        id: 'discord_org',
        lbl: 'Discord\norg.',
        title: 'Canal de Discord organizado',
        detail: 'Canales por tema, roles, notificaciones del embudo conectadas. <strong>Herramienta:</strong> Discord.',
      },
    ],
  },
];

export const STEPS: PreactivacionStep[] = SECTIONS.flatMap((section) =>
  section.items.map<PreactivacionStep>((item) => ({ ...item, sectionId: section.id }))
);

export const TOTAL_STEPS = STEPS.length;

export function getSectionById(id: string): PreactivacionSection | undefined {
  return SECTIONS.find((s) => s.id === id);
}
