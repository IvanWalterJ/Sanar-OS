import type { MetaCodigo } from './supabase';

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type TipoDesbloqueo =
  | 'auto'             // siempre disponible al crear cuenta
  | 'completar_anterior' // tareas ★ del pilar anterior
  | 'venta_real'       // al menos 1 venta registrada
  | 'qa_verde';        // QA 24/24 puntos verdes

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
  numero: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  titulo: string;
  subtitulo: string;          // descripción corta del pilar
  emoji: string;
  color: string;              // color Tailwind para el mapa visual
  desbloqueo: TipoDesbloqueo;
  estrellas_requeridas?: number; // cuántas ★ del pilar anterior se necesitan
  metas: RoadmapMeta[];
  // ── Metadata del Método CLÍNICA ──────────────────────────────────────────
  fase: number;               // 0-6 (fase del programa)
  dias_inicio: number;        // día de inicio estimado
  dias_fin: number;           // día de fin estimado
  metodo_letra?: string;      // letra del acrónimo C-L-Í-N-I-C-A
  es_hito?: boolean;          // pilar hito especial (ej: Día 45)
}

// ─── Los 10 Pilares del ADN del Negocio — Método CLÍNICA ────────────────────

export const SEED_ROADMAP_V2: RoadmapPilar[] = [

  // ── FASE 0: ONBOARDING (Días 1-3) ─────────────────────────────────────────
  {
    numero: 0,
    titulo: 'Onboarding',
    subtitulo: 'El Coach te conoce — ADN prototipo beta',
    emoji: '🌱',
    color: 'emerald',
    desbloqueo: 'auto',
    fase: 0,
    dias_inicio: 1,
    dias_fin: 3,
    metas: [
      {
        codigo: 'O.A',
        titulo: 'Diagnóstico de Identidad Digital',
        descripcion:
          'Respondé las preguntas de los 3 bloques del onboarding: tus referentes, tus miedos y deseos, y el contexto de tu negocio. La IA genera tu ADN prototipo beta — el punto de partida que cada pilar irá refinando.',
        es_estrella: true,
        tiempo_estimado: '20–30 min',
        herramienta_id: 'A1',
      },
    ],
  },

  // ── FASE 1: SPRINT DE IDENTIDAD (Días 3-20) — Letra C ─────────────────────

  // ─── PILAR 1: Historia ──────────────────────────────────────────────────────
  {
    numero: 1,
    titulo: 'Historia',
    subtitulo: 'Tu narrativa personal en 3 formatos',
    emoji: '📖',
    color: 'violet',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 1,
    fase: 1,
    dias_inicio: 3,
    dias_fin: 8,
    metodo_letra: 'C',
    metas: [
      {
        codigo: '1.A',
        titulo: 'Video + Línea de Tiempo Vital',
        descripcion:
          'Mirá el video "Por qué tu historia importa más que tu título". Luego completá el ejercicio de línea de tiempo vital: 5-8 momentos que te marcaron (incluyendo fracasos y descubrimientos). Este material interno alimentará al agente IA.',
        es_estrella: true,
        tiempo_estimado: '40 min',
        agente_id: 'agente-historia',
      },
      {
        codigo: '1.B',
        titulo: 'Agente IA — Historia en 3 versiones',
        descripcion:
          'Usá el Agente Historia para generar tus 3 versiones: 300 palabras (sitio web), 150 palabras (bio en redes), 50 palabras (presentaciones y contenido). El agente lee tu línea de tiempo y extrae tu historia real.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'A3',
        agente_id: 'agente-historia',
      },
      {
        codigo: '1.C',
        titulo: 'Historia aprobada y guardada',
        descripcion:
          'Revisá las 3 versiones con el Coach IA: ¿suena a vos o genérico? ¿Hay algo que suene forzado? Aprobá las versiones y guardalas en el Manual de Negocio. Las 3 versiones aparecerán automáticamente en la sección "Quién Soy".',
        es_estrella: true,
        tiempo_estimado: '20 min',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ─── PILAR 2: Propósito ─────────────────────────────────────────────────────
  {
    numero: 2,
    titulo: 'Propósito',
    subtitulo: '¿Por qué existís en este mercado? — 1 oración',
    emoji: '🎯',
    color: 'blue',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 1,
    dias_inicio: 8,
    dias_fin: 13,
    metodo_letra: 'C',
    metas: [
      {
        codigo: '2.A',
        titulo: 'Video + Ejercicio Los 5 Por Qués',
        descripcion:
          'Mirá el video "El propósito como filtro de decisiones". Luego respondé: ¿Por qué hacés lo que hacés? ¿Por qué eso importa? Repetí 5 veces. Al quinto nivel suele aparecer algo que te sorprende — ese es tu propósito real.',
        es_estrella: true,
        tiempo_estimado: '35 min',
        agente_id: 'agente-proposito',
      },
      {
        codigo: '2.B',
        titulo: 'Agente IA — Destilador de Propósito',
        descripcion:
          'Usá el Agente Propósito para sintetizar en 1 oración específica, verificable y personal. No "ayudar a la gente a sentirse mejor" — sino "mis pacientes X logran Y en Z tiempo". Una oración que solo vos podés decir.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        herramienta_id: 'A2',
        agente_id: 'agente-proposito',
      },
      {
        codigo: '2.C',
        titulo: 'Propósito validado y diferenciado',
        descripcion:
          'Validá con el Coach IA: si tu propósito es este, ¿qué tipo de pacientes rechazarías? Si no podés responder, el propósito todavía no está listo. Un propósito real filtra, no incluye a todos.',
        es_estrella: true,
        tiempo_estimado: '15 min',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ─── PILAR 3: Legado ────────────────────────────────────────────────────────
  {
    numero: 3,
    titulo: 'Legado',
    subtitulo: 'Tu horizonte de 10 años — el norte estratégico',
    emoji: '🌅',
    color: 'indigo',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 1,
    dias_inicio: 13,
    dias_fin: 20,
    metodo_letra: 'C',
    metas: [
      {
        codigo: '3.A',
        titulo: 'Video + Carta a tu yo de 10 años',
        descripcion:
          'Mirá el video "Legado vs. éxito financiero". Luego escribí una carta como si ya lograste todo lo que querías: describí tu vida, tus pacientes, el impacto que dejaste, cómo se siente. Este material es el más valioso del ADN.',
        es_estrella: true,
        tiempo_estimado: '40 min',
        agente_id: 'agente-legado',
      },
      {
        codigo: '3.B',
        titulo: 'Agente IA — Sintetizador de Legado',
        descripcion:
          'Usá el Agente Legado para extraer tu legado en 2-3 oraciones que distingan entre legado real (impacto en otros), metas financieras y reconocimiento personal. El legado trasciende lo económico.',
        es_estrella: true,
        tiempo_estimado: '20 min',
        agente_id: 'agente-legado',
      },
      {
        codigo: '3.C',
        titulo: 'Legado documentado — "Quién Soy" al 100%',
        descripcion:
          'Con Historia + Propósito + Legado completos, la sección "Quién Soy" de tu ADN está al 100%. El Coach IA ahora tiene tu base filosófica real. Guardá el legado en el Manual de Negocio.',
        es_estrella: true,
        tiempo_estimado: '15 min',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ── FASE 2: SPRINT DE MERCADO (Días 20-35) — Letras L + Í ─────────────────

  // ─── PILAR 4: Avatar del Paciente Ideal ────────────────────────────────────
  {
    numero: 4,
    titulo: 'Avatar',
    subtitulo: 'Tu paciente ideal — persona real, no demografía',
    emoji: '👤',
    color: 'cyan',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 2,
    dias_inicio: 20,
    dias_fin: 27,
    metodo_letra: 'L',
    metas: [
      {
        codigo: '4.A',
        titulo: 'Video + Análisis de 3 pacientes reales',
        descripcion:
          'Mirá el video "Cómo construir el avatar desde datos reales". Luego elegí 3 pacientes actuales o pasados con muy buenos resultados. Para cada uno: el problema cuando llegaron, cómo lo describían, qué intentaron sin éxito, qué obtuvieron, cómo lo describen ahora.',
        es_estrella: true,
        tiempo_estimado: '45 min',
        agente_id: 'agente-avatar',
      },
      {
        codigo: '4.B',
        titulo: 'Agente IA — Constructor de Avatar',
        descripcion:
          'El Agente Avatar detecta patrones comunes de tus 3 pacientes y construye el perfil: nombre ficticio, edad, profesión, situación de vida, mínimo 5 dolores, 3 sueños, objeciones frecuentes, comportamientos de búsqueda, lenguaje exacto que usa.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'B2',
        agente_id: 'agente-avatar',
      },
      {
        codigo: '4.C',
        titulo: 'Avatar validado — 5 dolores + 3 sueños mínimo',
        descripcion:
          'Testá con el Coach IA si el avatar es suficientemente específico. Vago: "profesional 30-50 años con estrés". Preciso: "médica de 42 años con consultorio propio, trabaja 60h/semana, dos hijos adolescentes, siente que estudió toda la vida para esto y el dinero no alcanza". Si podría ser cualquiera, no está listo.',
        es_estrella: true,
        tiempo_estimado: '20 min',
        herramienta_id: 'B2',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ─── PILAR 5: Nicho y USP ───────────────────────────────────────────────────
  {
    numero: 5,
    titulo: 'Nicho y USP',
    subtitulo: 'Por qué te eligen a vos y no a otro',
    emoji: '💡',
    color: 'sky',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 2,
    dias_inicio: 27,
    dias_fin: 35,
    metodo_letra: 'Í',
    metas: [
      {
        codigo: '5.A',
        titulo: 'Video + Agente IA Definidor de Nicho',
        descripcion:
          'Mirá el video "El nicho no es restricción — es amplificación". El Agente Nicho cruza tu Historia, Propósito y Avatar y te pregunta: ¿a quién específicamente NO querés atender? ¿En qué problema sos claramente mejor que el promedio? ¿Qué grupo te busca específicamente?',
        es_estrella: true,
        tiempo_estimado: '35 min',
        herramienta_id: 'B1',
        agente_id: 'agente-nicho',
      },
      {
        codigo: '5.B',
        titulo: 'Agente IA — Constructor de USP',
        descripcion:
          'Construí tu USP con el formato: "Ayudo a [avatar específico] a lograr [resultado concreto] sin [obstáculo o sacrificio que temen]". El agente genera 3 versiones, vos elegís y ajustás. Si cualquier colega con tu mismo título pudiera decirla, la USP no está lista.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        herramienta_id: 'B3',
        agente_id: 'agente-nicho',
      },
      {
        codigo: '5.C',
        titulo: 'Test de Diferenciación — USP aprobada',
        descripcion:
          'Pasá el test con el Coach IA: "Si borro tu nombre y pongo el de otro especialista, ¿la USP sigue aplicando?" Si la respuesta es sí, la USP todavía no está lista. La sección "A Quién Sirvo" se completa al 100% cuando Avatar + Nicho + USP están aprobados.',
        es_estrella: true,
        tiempo_estimado: '15 min',
        herramienta_id: 'B3',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ── FASE 3: SPRINT DE OFERTA (Días 35-45) — Letra Í ───────────────────────

  // ─── PILAR 6: Matriz A → B → C ─────────────────────────────────────────────
  {
    numero: 6,
    titulo: 'Matriz A→B→C',
    subtitulo: 'El infierno, los obstáculos y el cielo de tu paciente',
    emoji: '🔺',
    color: 'amber',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 3,
    dias_inicio: 35,
    dias_fin: 39,
    metodo_letra: 'Í',
    metas: [
      {
        codigo: '6.A',
        titulo: 'Video + Ejercicio 10 transformaciones reales',
        descripcion:
          'Mirá el video "La Matriz A→B→C: por qué el obstáculo importa más que el dolor". Documentá 10 transformaciones de pacientes pasados: para cada uno, el estado A (qué le dolía), los obstáculos B (qué le impedía avanzar solo) y el estado C (qué obtuvo y cómo lo describe). Este es el material más valioso del ADN.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        agente_id: 'agente-matriz',
      },
      {
        codigo: '6.B',
        titulo: 'Agente IA — Matriz A→B→C',
        descripcion:
          'El Agente Matriz lee las 10 transformaciones, detecta patrones y construye la matriz definitiva. Profundiza especialmente en B (obstáculos): si son vagos, hace más preguntas hasta que sean concretos. A se usa en marketing, B justifica el programa, C es lo que compra el paciente.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'B4',
        agente_id: 'agente-matriz',
      },
      {
        codigo: '6.C',
        titulo: 'Matriz validada — B concreto y específico',
        descripcion:
          'Validá con el Coach IA: "Si tu paciente leyera esta lista de obstáculos B, ¿diría exactamente, eso soy yo?" Si tenés dudas, el B todavía no está listo. Un B vago significa un programa que parece prescindible.',
        es_estrella: true,
        tiempo_estimado: '15 min',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ─── PILAR 7: Método Propio ─────────────────────────────────────────────────
  {
    numero: 7,
    titulo: 'Método Propio',
    subtitulo: 'Tu proceso único con nombre propio',
    emoji: '⚙️',
    color: 'orange',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 3,
    dias_inicio: 39,
    dias_fin: 42,
    metodo_letra: 'N',
    metas: [
      {
        codigo: '7.A',
        titulo: 'Video + Ejercicio Pasos actuales del protocolo',
        descripcion:
          'Mirá el video "Tu método propio: convirtiendo lo que hacés en activo diferenciador". Describí honestamente cómo trabajás con pacientes de principio a fin: ¿qué pasa en la primera sesión? ¿Y en las siguientes? ¿Cómo sabés que el proceso terminó? ¿Cómo medís el resultado? Documentá lo que ya hacés, no lo que idealizás.',
        es_estrella: true,
        tiempo_estimado: '40 min',
        agente_id: 'agente-metodo',
      },
      {
        codigo: '7.B',
        titulo: 'Agente IA — Documentador de Método',
        descripcion:
          'El Agente Método organiza tus pasos en 3-7 etapas nombradas. Cada etapa tiene: qué es, por qué existe en el recorrido A→C, cómo sabe el paciente que está completa. El nombre del método ideal evoca el resultado, no el mecanismo.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        herramienta_id: 'B4',
        agente_id: 'agente-metodo',
      },
      {
        codigo: '7.C',
        titulo: 'Método con nombre y pasos documentados',
        descripcion:
          'Aprobá el nombre del método y sus etapas. El Coach IA sugiere opciones de naming. "Sesiones de fisioterapia" es genérico. "Protocolo de Reintegración Funcional en 8 semanas" es un activo diferenciador que el paciente compra.',
        es_estrella: true,
        tiempo_estimado: '20 min',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ─── PILAR 8: Escalera de Ofertas ──────────────────────────────────────────
  {
    numero: 8,
    titulo: 'Escalera de Ofertas',
    subtitulo: '4 niveles de acceso a tu trabajo — Hito Día 45',
    emoji: '🏗️',
    color: 'rose',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 3,
    fase: 3,
    dias_inicio: 42,
    dias_fin: 45,
    metodo_letra: 'I',
    es_hito: true,
    metas: [
      {
        codigo: '8.A',
        titulo: 'Video + Agente IA — Oferta Mid (producto principal)',
        descripcion:
          'Mirá el video "La escalera de valor". Diseñá primero la Oferta Mid ($1,500-$2,500): el protocolo completo que lleva al paciente de A a C. Todo lo demás se construye desde acá. Sin Oferta Mid clara, el resto no tiene sentido.',
        es_estrella: true,
        tiempo_estimado: '45 min',
        herramienta_id: 'B5',
        agente_id: 'agente-oferta',
      },
      {
        codigo: '8.B',
        titulo: 'Agente IA — Oferta High + Oferta Low diseñadas',
        descripcion:
          'Diseñá la Oferta High ($4,000-$6,000): la Mid con acceso directo, soporte intensivo y máxima personalización. Y la Oferta Low ($500-$1,000): las primeras 2-3 sesiones del método para quien quiere probar antes de comprometerse.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        agente_id: 'agente-oferta',
      },
      {
        codigo: '8.C',
        titulo: 'Agente IA — Lead Magnet creado',
        descripcion:
          'Creá el Lead Magnet gratuito o casi gratuito: resuelve el primer dolor urgente de A, pero no es una muestra del programa — es un recurso completo que da un resultado inmediato en un problema pequeño. Captura el contacto del prospecto.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        agente_id: 'agente-oferta',
      },
      {
        codigo: '8.D',
        titulo: '🏆 Hito Día 45 — ADN base completo',
        descripcion:
          'Con Historia + Propósito + Legado + Avatar + Nicho + Matriz + Método + Escalera de Ofertas completos, llegaste al punto de no retorno. Las campañas DEBEN activarse hoy. Sin ADN base completo en el día 45, los $10,000 USD/mes en 90 días no son un objetivo realista.',
        es_estrella: true,
        tiempo_estimado: '20 min (validación con Coach IA)',
        agente_id: 'agente-coach',
      },
    ],
  },

  // ── FASE 4: ACTIVACIÓN Y VENTAS (Días 45-80) — Letras N + I + C ───────────

  // ─── PILAR 9: Sistemas ──────────────────────────────────────────────────────
  {
    numero: 9,
    titulo: 'Sistemas',
    subtitulo: 'Marketing · Ventas · Servicio — en paralelo',
    emoji: '🚀',
    color: 'fuchsia',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 4,
    fase: 4,
    dias_inicio: 45,
    dias_fin: 80,
    metodo_letra: 'C',
    metas: [
      {
        codigo: '9.A',
        titulo: 'Sistema de Marketing — Landing + Ads activos',
        descripcion:
          'Agente IA genera el copy completo de la landing page usando Avatar, Matriz A→B→C y Oferta Mid. Publicá en GHL. Agente IA genera 3 versiones de anuncio (una desde A, una desde B, una desde C). Activá la primera campaña Meta. Sin tráfico no hay llamadas.',
        es_estrella: true,
        tiempo_estimado: '120 min',
        herramienta_id: 'D3',
        agente_id: 'agente-embudo',
      },
      {
        codigo: '9.B',
        titulo: 'Sistema de Ventas — Script + Roleplay + 1ª llamada real',
        descripcion:
          'Agente IA construye el script de llamada de diagnóstico personalizado (45 min): apertura, diagnóstico, presentación, manejo de objeciones, cierre. Coach IA simula ser el avatar para practicar. Tomá tu primera llamada real y hacé un debrief completo con el Coach.',
        es_estrella: true,
        tiempo_estimado: '90 min',
        herramienta_id: 'E1',
        agente_id: 'agente-venta',
      },
      {
        codigo: '9.C',
        titulo: '🎉 Primera venta cerrada',
        descripcion:
          'Cerrá la primera venta del protocolo. Registrala en la app (monto, canal, fecha). Este hito activa la notificación especial del Coach y actualiza el Avatar con lo aprendido en la llamada: nuevas objeciones, lenguaje real del paciente, patrones de quién cierra y quién no.',
        es_estrella: true,
        tiempo_estimado: '0 min (acción real)',
      },
      {
        codigo: '9.D',
        titulo: 'Sistema de Servicio — Protocolo automatizado',
        descripcion:
          'Documentá el protocolo de entrega completo: desde el email de bienvenida hasta el seguimiento post-protocolo. El Agente Servicio identifica qué pasos se pueden automatizar en GHL. Si te vas 5 días sin internet, ¿tu servicio sigue corriendo? Si no, el sistema todavía no está listo.',
        es_estrella: true,
        tiempo_estimado: '60 min',
        agente_id: 'agente-servicio',
      },
    ],
  },

  // ── FASE 5: IDENTIDAD VISUAL (Días 70-80) ─────────────────────────────────

  // ─── PILAR 10: Identidad Visual ────────────────────────────────────────────
  {
    numero: 10,
    titulo: 'Identidad Visual',
    subtitulo: 'El sistema visual que expresa quién sos',
    emoji: '🎨',
    color: 'teal',
    desbloqueo: 'completar_anterior',
    estrellas_requeridas: 4,
    fase: 5,
    dias_inicio: 70,
    dias_fin: 80,
    metas: [
      {
        codigo: '10.A',
        titulo: 'Video + Agente IA — Paleta de Colores',
        descripcion:
          'Mirá el video "Identidad visual para profesionales de salud". El Agente Colores construye tu paleta desde tu Historia, Propósito y Avatar: primario, secundario, acento y neutros. Con justificación de por qué cada color. Una fisioterapeuta para mujeres con dolor crónico no puede tener paleta corporativa azul tech.',
        es_estrella: true,
        tiempo_estimado: '35 min',
        agente_id: 'agente-visual',
      },
      {
        codigo: '10.B',
        titulo: 'Agente IA — Tipografía + Tono de Voz',
        descripcion:
          'Agente Tipografía: fuentes para título, cuerpo y subtítulos optimizadas para legibilidad digital y coherencia de nicho. Agente Tono: define tu voz escrita (formal/cercano, técnico/simple, distante/empático) con ejemplos de cómo decís lo mismo de las dos maneras.',
        es_estrella: true,
        tiempo_estimado: '30 min',
        agente_id: 'agente-visual',
      },
      {
        codigo: '10.C',
        titulo: 'Brief para diseñador completado',
        descripcion:
          'Completá el brief con todo lo generado: paleta, tipografías, tono de voz, referencias visuales, qué querés y qué no querés. Listo para trabajar con diseñador o para implementar solo en Canva/Figma.',
        es_estrella: true,
        tiempo_estimado: '25 min',
        agente_id: 'agente-visual',
      },
      {
        codigo: '10.D',
        titulo: 'Coherencia visual validada con Coach IA',
        descripcion:
          'El Coach verifica que la identidad visual sea coherente con tu Propósito y Avatar. Identidad visual completa + Pilares 1-9 completados = ADN del Negocio al 100%. Estás listo para escalar.',
        es_estrella: true,
        tiempo_estimado: '20 min',
        agente_id: 'agente-coach',
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
  if (pilarCompletadoMasAlto >= 10) return 5;
  if (pilarCompletadoMasAlto >= 8)  return 4;
  if (pilarCompletadoMasAlto >= 5)  return 3;
  if (pilarCompletadoMasAlto >= 2)  return 2;
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

/** Agrupa los pilares por fase para la vista del roadmap */
export interface GrupoFase {
  fase: number;
  titulo: string;
  subtitulo: string;
  metodo_letra?: string;
  dias: string;
  pilares: RoadmapPilar[];
}

export const FASES_ROADMAP: Omit<GrupoFase, 'pilares'>[] = [
  { fase: 0, titulo: 'Fase 0 — Onboarding',              subtitulo: 'El Coach te conoce',                        dias: 'Días 1-3' },
  { fase: 1, titulo: 'Fase 1 — Sprint de Identidad',     subtitulo: 'Quién sos',                                 dias: 'Días 3-20',  metodo_letra: 'C' },
  { fase: 2, titulo: 'Fase 2 — Sprint de Mercado',       subtitulo: 'A quién servís',                            dias: 'Días 20-35', metodo_letra: 'LÍ' },
  { fase: 3, titulo: 'Fase 3 — Sprint de Oferta',        subtitulo: 'Qué ofrecés',                               dias: 'Días 35-45', metodo_letra: 'NI' },
  { fase: 4, titulo: 'Fase 4 — Activación y Ventas',     subtitulo: 'Cómo llegás y vendés',                      dias: 'Días 45-80', metodo_letra: 'C' },
  { fase: 5, titulo: 'Fase 5 — Identidad Visual',        subtitulo: 'Cómo te reconocen',                         dias: 'Días 70-80' },
];
