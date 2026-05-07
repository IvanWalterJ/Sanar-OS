// ═══════════════════════════════════════════════════════════════════════════
// Pre-Activación Checklist
// Pasos mínimos indispensables para activar Meta Ads de un cliente.
// Port del HTML interno preactivacion-tcd.html (validado por Ivan + Lupe).
// ═══════════════════════════════════════════════════════════════════════════

export interface PreactivacionStepDef {
  id: string;
  /** Label corto multilínea para columna (\n para wrap, ­ para soft hyphen). */
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
    id: 'adn',
    title: 'ADN del Negocio',
    short: 'ADN',
    items: [
      {
        id: 'identidad',
        lbl: 'Identi­dad',
        title: 'Identidad resuelta: historia + propósito + legado',
        detail: 'Historia en versión corta (~50 palabras) como mínimo. Propósito en 1 frase. Declaración de legado. <strong>Que suene a la persona, no a plantilla.</strong>',
      },
      {
        id: 'avatar',
        lbl: 'Avatar',
        title: 'Avatar documentado desde pacientes reales',
        detail: 'Demografía + psicografía + journey + objeciones. Mapeado desde los 3 mejores pacientes reales.',
      },
      {
        id: 'nicho_puv',
        lbl: 'Nicho\n+ PUV',
        title: 'Micro-nicho + PUV definidos',
        detail: 'Nicho estrecho. PUV: Yo ayudo a [persona] a [resultado] para que [beneficio]. Si se googlea y hay 20 iguales, no sirve.',
      },
      {
        id: 'matriz_abc',
        lbl: 'Matriz\nA→B→C',
        title: 'Matriz Infierno → Obstáculos → Cielo',
        detail: '<strong>A:</strong> de dónde viene el avatar. <strong>B:</strong> por qué no pudo solo. <strong>C:</strong> vida transformada. Alimenta todo el copy.',
      },
      {
        id: 'metodo',
        lbl: 'Método\npropio',
        title: 'Método propio con nombre y pasos',
        detail: '3 a 7 pasos con nombre y transformación. Acrónimo o metáfora. Sin método propio vende lo mismo que todos.',
      },
      {
        id: 'ofertas',
        lbl: 'Ofertas\n+ math',
        title: 'Escalera de ofertas + matemática del $10K',
        detail: 'LM $0 → Low ~$297 → Mid $1.5K-3K → High $3K+. Con matemática ROAS 3x/5x/7x.',
      },
    ],
  },
  {
    id: 'meta',
    title: 'Meta Ads',
    short: 'META',
    items: [
      {
        id: 'bm_cuenta',
        lbl: 'BM +\ncuenta',
        title: 'Business Manager + cuenta publicitaria',
        detail: 'BM verificado con datos reales. Cuenta con moneda, zona horaria y país correctos.',
      },
      {
        id: 'pago',
        lbl: 'Método\nde pago',
        title: 'Método de pago activo',
        detail: 'Tarjeta con saldo, probada con cobro mínimo.',
      },
      {
        id: 'pixel',
        lbl: 'Pixel +\neventos',
        title: 'Pixel instalado y disparando eventos',
        detail: 'PageView en landing + Lead/ScheduleAppointment en thank you. Verificar con Pixel Helper.',
      },
      {
        id: 'dominio',
        lbl: 'Dominio\nverific.',
        title: 'Dominio verificado en el BM',
        detail: 'Configuración → Seguridad de la marca → Dominios.',
      },
    ],
  },
  {
    id: 'landing',
    title: 'Landing + Embudo',
    short: 'LANDING',
    items: [
      {
        id: 'landing_ok',
        lbl: 'Landing\npublic.',
        title: 'Landing publicada, mobile-first, copy desde ADN',
        detail: 'URL limpia, rápida, funciona en celular. Copy con headline dolor, PUV, Matriz C, CTA.',
      },
      {
        id: 'vsl',
        lbl: 'VSL\ngrabado',
        title: 'VSL grabado y embebido',
        detail: '8-15 min. Gancho → problema → método → prueba social → oferta → CTA.',
      },
      {
        id: 'form_agenda',
        lbl: 'Form +\nThank U',
        title: 'Formulario/agenda + thank you page',
        detail: 'El lead agenda o deja datos. Thank you con próximos pasos. Testear flujo completo.',
      },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda + Llamadas',
    short: 'AGENDA',
    items: [
      {
        id: 'calendario',
        lbl: 'Calen­dario',
        title: 'Calendario con disponibilidad real',
        detail: 'GHL/Calendly, zona horaria correcta, mín 10 slots/semana. Link Meet/Zoom automático.',
      },
      {
        id: 'recordatorios',
        lbl: 'Recor­dato­rios',
        title: 'Recordatorios automáticos',
        detail: 'Email + WhatsApp: 24hs antes + 1hr antes. Reduce no-shows del 40% al 15%.',
      },
      {
        id: 'script',
        lbl: 'Script\nventa W',
        title: 'Script de venta (técnica W) practicado',
        detail: 'Apertura → Dolor → Deseo → Obstáculo → Cierre. Practicado 2-3 veces.',
      },
    ],
  },
  {
    id: 'ig',
    title: 'Instagram',
    short: 'IG',
    items: [
      {
        id: 'perfil',
        lbl: 'Perfil\noptim.',
        title: 'Perfil optimizado',
        detail: 'Bio con PUV, foto profesional, UN link a landing.',
      },
      {
        id: 'doce_posts',
        lbl: '12\nposts',
        title: 'Mínimo 12 publicaciones',
        detail: 'Mix N1 dolor + N2 método + N3 testimonios. Perfil no puede verse vacío.',
      },
      {
        id: 'ig_bm',
        lbl: 'IG →\nBM',
        title: 'Instagram conectado al BM',
        detail: 'Vinculado a Fan Page y Business Manager.',
      },
      {
        id: 'highlights',
        lbl: 'Desta­cadas',
        title: '3-4 historias destacadas',
        detail: 'Sobre Mí · Método · Testimonios · Agendar.',
      },
    ],
  },
  {
    id: 'lm',
    title: 'Lead Magnets',
    short: 'LM',
    items: [
      {
        id: 'lm_principal',
        lbl: 'Lead\nMagnet',
        title: 'Al menos 1 lead magnet listo',
        detail: 'PDF, quiz, masterclass o herramienta. Resuelve micro-problema del avatar.',
      },
      {
        id: 'lm_entrega',
        lbl: 'Entrega\n+ emails',
        title: 'Entrega automática + 3 emails',
        detail: 'Entrega instantánea. Email 1: entrega. Email 2: valor. Email 3: CTA agendar.',
      },
    ],
  },
  {
    id: 'skool',
    title: 'Comunidad Skool',
    short: 'SKOOL',
    items: [
      {
        id: 'skool_lista',
        lbl: 'Skool\ncreada',
        title: 'Comunidad gratuita creada',
        detail: 'Nombre del método, PUV, portada profesional.',
      },
      {
        id: 'skool_contenido',
        lbl: 'Bienve­nida\n+ posts',
        title: 'Bienvenida + 5 posts pre-cargados',
        detail: 'Comunidad NO puede estar vacía. Reglas + contenido listo.',
      },
      {
        id: 'skool_flujo',
        lbl: 'Flujo →\nllamada',
        title: 'Flujo: entrada → valor → llamada',
        detail: 'Camino natural hacia agendar la llamada.',
      },
    ],
  },
  {
    id: 'ads',
    title: 'Creativos',
    short: 'ADS',
    items: [
      {
        id: 'seis_creativos',
        lbl: '6 crea­tivos',
        title: '6 creativos: 2×N1 + 2×N2 + 2×N3',
        detail: 'Frío, tibio, caliente. Mín 2 formatos (reel + carrusel).',
      },
      {
        id: 'copy_adn',
        lbl: 'Copy\nADN',
        title: 'Copy desde el ADN del cliente',
        detail: 'Palabras del avatar, Matriz A→B→C. Cada ad → UNA acción.',
      },
    ],
  },
  {
    id: 'auto',
    title: 'Automatización',
    short: 'AUTO',
    items: [
      {
        id: 'email_nurture',
        lbl: 'Email\nnurture',
        title: 'Email marketing + nurture 6 emails',
        detail: 'Dominio verificado. Secuencia 28 días automática.',
      },
      {
        id: 'whatsapp_seg',
        lbl: 'WA +\nseguim.',
        title: 'WhatsApp + protocolo seguimiento',
        detail: 'Mensajes rápidos, etiquetas. Recontacto 48hs/7d/14d.',
      },
    ],
  },
  {
    id: 'metricas',
    title: 'Métricas',
    short: 'KPI',
    items: [
      {
        id: 'kpis_budget',
        lbl: 'KPIs +\nbudget',
        title: 'KPIs + presupuesto de ads definido',
        detail: 'CPM·CPC·CPL·Show·Cierre·CPA con benchmarks. Presupuesto diario/mensual.',
      },
      {
        id: 'tablero',
        lbl: 'Tablero\nsemanal',
        title: 'Tablero de seguimiento semanal',
        detail: 'Sheets/Notion/app. Se actualiza TODAS las semanas.',
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
