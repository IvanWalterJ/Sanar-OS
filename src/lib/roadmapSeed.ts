import type { MetaCodigo } from './supabase';

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type TipoDesbloqueo =
  | 'auto'            // siempre disponible al crear cuenta
  | 'completar_anterior' // tareas ★ del pilar anterior
  | 'venta_real'      // al menos 1 venta registrada
  | 'qa_verde';       // QA 24/24 puntos verdes en meta 6.B

export interface RoadmapMeta {
  codigo: MetaCodigo;
  titulo: string;
  descripcion: string;
  es_estrella: boolean;  // tareas ★ que desbloquean el siguiente pilar
  tiempo_estimado: string;
  herramienta_id?: string; // herramienta de Biblioteca asignada (ej: 'A1')
  agente_id?: string;      // agente IA asignado
}

export interface RoadmapPilar {
  numero: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  titulo: string;
  subtitulo: string;       // descripción corta del pilar
  emoji: string;
  color: string;           // color Tailwind para el mapa visual
  desbloqueo: TipoDesbloqueo;
  estrellas_requeridas?: number; // cuántas ★ del pilar anterior se necesitan
  metas: RoadmapMeta[];
}

// ─── Los 9 Pilares del Método CLÍNICA ────────────────────────────────────────

export const SEED_ROADMAP_V2: RoadmapPilar[] = [
  // ─── PILAR 0: Onboarding ────────────────────────────────────────────────
  {
    numero: 0,
    titulo: 'Onboarding',
    subtitulo: 'El Coach te conoce',
    emoji: '🌱',
    color: 'emerald',
    desbloqueo: 'auto',
    metas: [
      {
        codigo: 'O.A',
        titulo: 'El Coach te conoce',
        descripcion:
          'Completa tu perfil completo: especialidad, nicho, historia de origen, por qué oficial, visión financiera y carta del día 91. Esta información precarga todas las herramientas IA de la Biblioteca.',
        es_estrella: true,
        tiempo_estimado: '20–30 min',
        herramienta_id: 'A1',
      },
    ],
  },

  // ─── PILAR 1: Identidad ─────────────────────────────────────────────────
  {
    numero: 1,
    titulo: 'Identidad',
    subtitulo: 'Tu fundamento como emprendedor/a',
    emoji: '💎',
    color: 'violet',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 1,
    metas: [
      {
        codigo: '1.A',
        titulo: 'Identidad como fundador/a',
        descripcion:
          'Define quién eres como emprendedor/a del sector salud: tu propósito, valores y el legado que querés construir a 3 años.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        herramienta_id: 'A2',
      },
      {
        codigo: '1.B',
        titulo: 'Historia personal documentada',
        descripcion:
          'Escribe tu historia de origen en 3 versiones: larga (300 palabras), media (150 palabras) y corta (50 palabras). La herramienta IA genera las 3 a partir de tus respuestas.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'A3',
        agente_id: 'agente-historia',
      },
      {
        codigo: '1.C',
        titulo: 'Creencias reformuladas',
        descripcion:
          'Identifica las 3 creencias limitantes más fuertes sobre dinero, vocación y visibilidad. El Coach las reformula en creencias potenciadoras con evidencia de tu propia historia.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        herramienta_id: 'A4',
      },
      {
        codigo: '1.D',
        titulo: 'Visión financiera clara',
        descripcion:
          'Define tu meta financiera a 90 días (en USD), calcula cuántos protocolos necesitás vender, y establece el ingreso que considera "libertad" para vos. Usa la calculadora PHR.',
        es_estrella: true,
        tiempo_estimado: '20 min',
        herramienta_id: 'B1',
      },
    ],
  },

  // ─── PILAR 2: Claridad y Oferta ─────────────────────────────────────────
  {
    numero: 2,
    titulo: 'Claridad y Oferta',
    subtitulo: 'A quién ayudás y qué les ofrecés',
    emoji: '🎯',
    color: 'blue',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 6,
    metas: [
      {
        codigo: '2.A',
        titulo: 'Nicho específico validado',
        descripcion:
          'Define tu nicho con máxima especificidad: no "psicóloga" sino "psicóloga de ansiedad para mujeres profesionales de 30-45 años". Valida con 3 personas reales de ese perfil.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'B2',
      },
      {
        codigo: '2.B',
        titulo: 'Avatar de cliente ideal completo',
        descripcion:
          'Construye el perfil completo de tu cliente ideal: demografía, dolores profundos, deseos, objeciones, lenguaje exacto que usa y plataformas donde está.',
        es_estrella: true,
        tiempo_estimado: '35 min',
        herramienta_id: 'B3',
      },
      {
        codigo: '2.C',
        titulo: 'Posicionamiento validado con personas reales',
        descripcion:
          'Escribe tu propuesta de valor única en 1 oración. Testea con 3 personas de tu nicho: ¿entienden inmediatamente de qué se trata?',
        es_estrella: true,
        tiempo_estimado: '25 min',
        herramienta_id: 'B4',
      },
    ],
  },

  // ─── PILAR 3: Programa y Precio ─────────────────────────────────────────
  {
    numero: 3,
    titulo: 'Programa y Precio',
    subtitulo: 'La estructura que vende tu transformación',
    emoji: '📐',
    color: 'indigo',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 6,
    metas: [
      {
        codigo: '3.A',
        titulo: 'Estructura del programa',
        descripcion:
          'Define el protocolo/método propio: nombre, duración, módulos o fases, sesiones incluidas, formato (1-1, grupal, híbrido) y resultados verificables en cada fase.',
        es_estrella: true,
        tiempo_estimado: '45 min',
        herramienta_id: 'B5',
        agente_id: 'agente-oferta',
      },
      {
        codigo: '3.B',
        titulo: 'Precio con justificación de valor',
        descripcion:
          'Establece el precio del protocolo con justificación de valor (no de costo). Calcula el ROI del cliente: cuánto vale para él/ella lograr el resultado prometido.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'B6',
      },
      {
        codigo: '3.C',
        titulo: 'Pre-venta validada con 1 pago real',
        descripcion:
          'Ofrece el protocolo a precio de pre-lanzamiento a 3-5 personas de tu red. El objetivo es 1 pago real que valide la oferta antes de construir el sistema completo.',
        es_estrella: true,
        tiempo_estimado: '60 min',
      },
    ],
  },

  // ─── PILAR 4: Presencia Digital ─────────────────────────────────────────
  {
    numero: 4,
    titulo: 'Presencia Digital',
    subtitulo: 'Tu clínica digital calibrada',
    emoji: '📱',
    color: 'cyan',
    desbloqueo: 'venta_real',
    metas: [
      {
        codigo: '4.A',
        titulo: 'Presencia digital calibrada',
        descripcion:
          'Calibra todos los puntos de presencia digital: bio de Instagram, highlights, link en bio, foto de perfil, nombre de usuario y la energía visual general de tu cuenta.',
        es_estrella: true,
        tiempo_estimado: '45 min',
        herramienta_id: 'D1',
      },
    ],
  },

  // ─── PILAR 5: Sistema de Publicación y Captación ─────────────────────────
  {
    numero: 5,
    titulo: 'Publicación y Captación',
    subtitulo: 'El sistema que atrae clientes de forma constante',
    emoji: '📡',
    color: 'sky',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 5,
    metas: [
      {
        codigo: '5.A',
        titulo: 'Sistema de publicación activo',
        descripcion:
          'Activa el sistema de publicación semanal: 1 video (Reel/story/live) + 3 stories diarias de los 3 tipos del banco (valor, proceso, prueba social). No opcional.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        herramienta_id: 'C1',
        agente_id: 'agente-contenido',
      },
      {
        codigo: '5.B',
        titulo: 'Sistema de captación activo',
        descripcion:
          'Conecta Instagram con ManyChat (o equivalente): configura 3 keywords disparadoras, respuestas automáticas y la secuencia de seguimiento post-interacción.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        herramienta_id: 'D2',
      },
    ],
  },

  // ─── PILAR 6: Embudo ────────────────────────────────────────────────────
  {
    numero: 6,
    titulo: 'Embudo',
    subtitulo: 'El sistema que convierte visitas en ventas',
    emoji: '🔄',
    color: 'amber',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 4,
    metas: [
      {
        codigo: '6.A',
        titulo: 'Embudo completo conectado',
        descripcion:
          'Conecta todos los componentes del embudo: contenido → CTA → lead magnet o link → formulario de pre-calificación → agenda → llamada de venta → link de pago.',
        es_estrella: true,
        tiempo_estimado: '90 min',
        herramienta_id: 'D3',
        agente_id: 'agente-embudo',
      },
      {
        codigo: '6.B',
        titulo: 'QA completo del embudo',
        descripcion:
          'Testea el embudo completo desde el punto de vista del cliente. Usa la checklist de 24 puntos del Coach. Los 24 puntos en verde desbloquean el Pilar 7.',
        es_estrella: true,
        tiempo_estimado: '60 min',
      },
    ],
  },

  // ─── PILAR 7: Campañas y Ventas ─────────────────────────────────────────
  {
    numero: 7,
    titulo: 'Campañas y Ventas',
    subtitulo: 'Amplificar y cerrar',
    emoji: '🚀',
    color: 'orange',
    desbloqueo: 'qa_verde',
    metas: [
      {
        codigo: '7.A',
        titulo: 'Campañas activas con métricas positivas',
        descripcion:
          'Lanza campañas de paid media (Meta Ads) o de contenido pago. Define presupuesto, audiencia, creativos y objetivos. Monitorea CPL y ajusta en los primeros 3 días.',
        es_estrella: true,
        tiempo_estimado: '90 min',
        herramienta_id: 'E1',
      },
      {
        codigo: '7.B',
        titulo: 'Guiones de venta dominados',
        descripcion:
          'Prepara y practica el guión de llamada de venta personalizado: apertura, diagnóstico, presentación, manejo de objeciones y cierre. El Agente de Venta genera el guión completo.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        herramienta_id: 'E2',
        agente_id: 'agente-venta',
      },
      {
        codigo: '7.C',
        titulo: 'Primera venta cerrada',
        descripcion:
          'Cierra la primera venta del protocolo a precio completo (sin descuento). Registra la venta en la app: monto, canal y protocolo de cierre. Este hito activa la notificación especial del Coach.',
        es_estrella: true,
        tiempo_estimado: '0 min (acción real)',
      },
    ],
  },

  // ─── PILAR 8: Optimización ──────────────────────────────────────────────
  {
    numero: 8,
    titulo: 'Optimización',
    subtitulo: 'Consolidar y escalar',
    emoji: '⚡',
    color: 'rose',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 7,
    metas: [
      {
        codigo: '8.A',
        titulo: 'Embudo optimizado',
        descripcion:
          'Analiza las métricas de las últimas 4 semanas: CPL, tasa de conversión de leads a llamadas, tasa de cierre. Identifica el cuello de botella y aplica 1 cambio de alto impacto.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        herramienta_id: 'E3',
      },
      {
        codigo: '8.B',
        titulo: 'Retrospectiva y plan del siguiente nivel',
        descripcion:
          'Retrospectiva completa de los 90 días con el Agente de Retrospectiva: logros, aprendizajes, patrones del Diario, próximos 3 meses. El Coach genera el plan del nivel siguiente.',
        es_estrella: true,
        tiempo_estimado: '90 min',
        agente_id: 'agente-retrospectiva',
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Total de metas en todo el programa */
export const TOTAL_METAS = SEED_ROADMAP_V2.reduce(
  (acc, pilar) => acc + pilar.metas.length,
  0,
);

/** Total de tareas ★ por pilar */
export const ESTRELLAS_POR_PILAR: Record<number, number> = SEED_ROADMAP_V2.reduce(
  (acc, pilar) => ({
    ...acc,
    [pilar.numero]: pilar.metas.filter((m) => m.es_estrella).length,
  }),
  {} as Record<number, number>,
);

/** Determina el nivel de avatar (1-5) basado en el pilar completado más alto */
export function calcularNivel(pilarCompletadoMasAlto: number): 1 | 2 | 3 | 4 | 5 {
  if (pilarCompletadoMasAlto >= 8) return 5;
  if (pilarCompletadoMasAlto >= 6) return 4;
  if (pilarCompletadoMasAlto >= 4) return 3;
  if (pilarCompletadoMasAlto >= 2) return 2;
  return 1;
}

/** Calcula el día del programa a partir de la fecha de inicio */
export function calcularDiaPrograma(fechaInicio: string): number {
  const inicio = new Date(fechaInicio);
  const hoy = new Date();
  const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(90, Math.max(1, diff + 1));
}

/** Retorna el color CSS para el estado del pilar en el mapa visual */
export function colorEstadoPilar(
  estado: 'completado' | 'en_progreso' | 'bloqueado',
  color: string,
): string {
  switch (estado) {
    case 'completado':
      return `bg-${color}-500 border-${color}-400 text-white`;
    case 'en_progreso':
      return `bg-${color}-500/30 border-${color}-500/60 text-${color}-200`;
    case 'bloqueado':
      return 'bg-white/5 border-white/10 text-white/30';
  }
}
