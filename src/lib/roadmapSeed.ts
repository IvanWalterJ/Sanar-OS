import type { MetaCodigo, PilarId, TipoTarea } from './supabase';

// ─── Tipos base V3 ──────────────────────────────────────────────────────────

export type TipoDesbloqueo =
  | 'auto'
  | 'completar_anterior'
  | 'venta_real'
  | 'qa_verde';

export interface RoadmapMeta {
  codigo: MetaCodigo;
  titulo: string;
  descripcion: string;
  tipo: TipoTarea;
  es_estrella: boolean;
  tiempo_estimado: string;
  orden: number;                       // secuencia dentro del pilar (1,2,3...)
  herramienta_id?: string;             // para tipo HERRAMIENTA
  usa_ia: boolean;                     // false para P1.2 y P3.2 (escritura pura)
  adn_field?: string;                  // campo de ProfileV2 donde guarda
  requiere_datos_de?: MetaCodigo[];    // dependencia explícita de datos
  es_recurrente?: boolean;             // P9A.4: se puede usar repetidamente
  video_youtube_id?: string;           // para tipo VIDEO (placeholder hasta que se suba el video)
  coach_instruccion?: string;          // para tipo COACH (texto exacto)
}

export interface RoadmapPilar {
  id: PilarId;
  numero_orden: number;                // 0-13 para display secuencial
  titulo: string;
  subtitulo: string;
  color: string;                       // hex color
  desbloqueo: TipoDesbloqueo;
  pilar_prerequisito?: PilarId;
  metas: RoadmapMeta[];
  fase: number;
  dias_inicio: number;
  dias_fin: number;
  metodo_letra?: string;
  hito_mensaje?: string;
  hito_tipo?: 'milestone' | 'urgent' | 'checkpoint';
  /** Lucide icon name for this pilar */
  icon: string;
  // Backward compat aliases (para transición gradual)
  /** @deprecated Usar id */
  numero: number;
  /** @deprecated Usar icon */
  emoji?: string;
  /** @deprecated Usar pilar_prerequisito + completar_anterior */
  estrellas_requeridas?: number;
  /** @deprecated */
  es_hito?: boolean;
}

// ─── Los 14 Pilares — 49 Pasos — Versión Final Definitiva ──────────────────
//
// Regla #2 v7 (orden dentro de cada pilar): VIDEO → HERRAMIENTA → COACH.
// El enforcement técnico está en `isTaskUnlocked()` en Roadmap.tsx — nadie
// puede completar una tarea con `orden: N+1` sin haber cerrado la de `orden: N`.
//
// Excepciones documentadas (no rompen el enforcement):
//   - P0 (Onboarding): el VIDEO de bienvenida va al final del pilar según v7.
//   - P9B (Captación): cierra con dos COACH consecutivos por la cronología
//     "practicar con Simulador → primera llamada real → debrief".
//   - P11 (Análisis): sólo dos COACH mientras esperamos la expansión a las
//     4 sub-tareas del v7 (revisión tablero · retrospectiva · plan ciclo 2 ·
//     masterclass analytics).

export const SEED_ROADMAP_V3: RoadmapPilar[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 0: ONBOARDING · Días 1–3
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'P0',
    numero_orden: 0,
    titulo: 'Onboarding',
    subtitulo: 'Bienvenida y ADN prototipo beta',
    color: '#F5A623',
    numero: 0,
    icon: 'Sprout',
    emoji: '🌱',
    desbloqueo: 'auto',
    fase: 0,
    dias_inicio: 1,
    dias_fin: 3,
    metas: [
      {
        codigo: 'P0.1',
        titulo: 'Bienvenida: qué vas a construir en 90 días',
        descripcion: 'Video que explica qué es el ADN del Negocio, por qué existe la app y qué va a pasar en los próximos 90 días.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P0_1',
      },
      {
        codigo: 'P0.2',
        titulo: 'Formulario de bienvenida',
        descripcion: 'Respondé las preguntas iniciales: ¿A qué profesionales del mundo admirás? ¿Qué tienen ellos que vos querés tener? ¿Qué te impidió hasta ahora cobrar lo que vale tu trabajo? ¿Cómo te imaginás tu vida con $10K/mes extra? ¿Cuántos años ejercés tu profesión? ¿Presencial, online o mixto? ¿Cuántos pacientes pagando por mes? ¿Qué problema principal resolvés? La IA genera tu ADN prototipo beta.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '20 min',
        orden: 2,
        herramienta_id: 'H-P0.2',
        usa_ia: true,
        adn_field: 'adn_formulario_bienvenida',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 1: SPRINT DE IDENTIDAD · Días 3–20 · Letra C (Claridad)
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 1: Historia · Días 3–8 ─────────────────────────────────────────
  {
    id: 'P1',
    numero_orden: 1,
    titulo: 'Historia',
    subtitulo: 'Tu narrativa personal en 3 formatos',
    color: '#F5A623',
    numero: 1,
    icon: 'BookOpen',
    emoji: '📖',
    estrellas_requeridas: 1,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P0',
    fase: 1,
    dias_inicio: 3,
    dias_fin: 8,
    metodo_letra: 'C',
    metas: [
      {
        codigo: 'P1.1',
        titulo: 'Por qué tu historia importa más que tu título',
        descripcion: 'Video sobre la importancia de tu historia personal como herramienta de conexión y diferenciación.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P1_1',
      },
      {
        codigo: 'P1.2',
        titulo: 'Línea de tiempo vital',
        descripcion: 'Anotá los 5 a 8 momentos que más te marcaron en la vida. Fracasos, enfermedades, cambios de rumbo, descubrimientos. No los ve nadie más — es el insumo para construir tu historia.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P1.2',
        usa_ia: false,
        adn_field: 'adn_linea_tiempo',
      },
      {
        codigo: 'P1.3',
        titulo: 'Generador de Historia en 3 versiones',
        descripcion: 'Usa tu línea de tiempo para generar: Historia 300 palabras (para la web), Historia 150 palabras (para redes), Historia 50 palabras (para presentaciones). Tres textareas editables.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P1.3',
        usa_ia: true,
        adn_field: 'historia_300',
        requiere_datos_de: ['P1.2'],
      },
      {
        codigo: 'P1.4',
        titulo: 'Revisión de la historia',
        descripcion: 'Abrí el Coach y leele tu historia de 50 palabras. Preguntale: "¿Suena auténtica o suena a bio de LinkedIn?" Si hay algo forzado, el Coach te ayuda a ajustarlo.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Abrí el Coach y leele tu historia de 50 palabras. Preguntale: "¿Suena auténtica o suena a bio de LinkedIn?" Si hay algo forzado, el Coach te ayuda a ajustarlo.',
      },
    ],
  },

  // ─── PILAR 2: Propósito · Días 8–13 ───────────────────────────────────────
  {
    id: 'P2',
    numero_orden: 2,
    titulo: 'Propósito',
    subtitulo: 'El propósito como filtro de decisiones',
    color: '#F5A623',
    numero: 2,
    icon: 'Target',
    emoji: '🎯',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P1',
    fase: 1,
    dias_inicio: 8,
    dias_fin: 13,
    metodo_letra: 'C',
    metas: [
      {
        codigo: 'P2.1',
        titulo: 'El propósito como filtro de decisiones',
        descripcion: 'Video sobre cómo el propósito funciona como filtro para todas las decisiones del negocio.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P2_1',
      },
      {
        codigo: 'P2.2',
        titulo: 'Los 5 por qué',
        descripcion: 'Formulario encadenado de 5 preguntas. La primera aparece sola. Cuando respondés, aparece la segunda, y así. 1: "¿Por qué hacés lo que hacés?" 2: "¿Y eso por qué importa?" 3: "¿Y por qué eso importa para vos específicamente?" 4: "¿Qué cambiaría si más personas tuvieran esto?" 5: "¿Para qué estás realmente acá?"',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '20 min',
        orden: 2,
        herramienta_id: 'H-P2.2',
        usa_ia: false,
        adn_field: 'adn_cinco_por_que',
      },
      {
        codigo: 'P2.3',
        titulo: 'Destilador de Propósito',
        descripcion: 'Usa las 5 respuestas ya guardadas. Genera 3 versiones de la oración de propósito con la estructura: "Ayudo a [quién específico] a [resultado concreto] para que [para qué más profundo]." Elegí una y editala.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '20 min',
        orden: 3,
        herramienta_id: 'H-P2.3',
        usa_ia: true,
        adn_field: 'proposito',
        requiere_datos_de: ['P2.2'],
      },
      {
        codigo: 'P2.4',
        titulo: 'Test del propósito',
        descripcion: 'Decile al Coach cuál es tu propósito. Preguntale: "Con este propósito, ¿qué tipo de pacientes rechazaría?" Si no podés responder fácilmente, el propósito todavía no está listo.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Decile al Coach cuál es tu propósito. Preguntale: "Con este propósito, ¿qué tipo de pacientes rechazaría?" Si no podés responder fácilmente, el propósito todavía no está listo.',
      },
    ],
  },

  // ─── PILAR 3: Legado · Días 13–20 ─────────────────────────────────────────
  {
    id: 'P3',
    numero_orden: 3,
    titulo: 'Legado',
    subtitulo: 'Legado vs. éxito financiero',
    color: '#F5A623',
    numero: 3,
    icon: 'Sunrise',
    emoji: '🌅',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P2',
    fase: 1,
    dias_inicio: 13,
    dias_fin: 20,
    metodo_letra: 'C',
    hito_mensaje: 'Sabés quién sos, para qué estás y qué querés dejar. El siguiente paso es saber a quién servís.',
    hito_tipo: 'milestone',
    metas: [
      {
        codigo: 'P3.1',
        titulo: 'Legado vs. éxito financiero',
        descripcion: 'Video sobre la diferencia entre legado real y metas financieras.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P3_1',
      },
      {
        codigo: 'P3.2',
        titulo: 'Carta al yo de dentro de 10 años',
        descripcion: 'Es el año 2035. Lograste todo lo que querías lograr. ¿Cómo es tu vida? ¿A quiénes ayudaste? ¿Qué dejaste? ¿Cómo te sentís? Mínimo 200 palabras.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P3.2',
        usa_ia: false,
        adn_field: 'adn_carta_futuro',
      },
      {
        codigo: 'P3.3',
        titulo: 'Sintetizador de Legado',
        descripcion: 'Usa la carta ya guardada. Genera el legado en 2 a 3 oraciones. Distingue legado de meta financiera. Textarea editable.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 3,
        herramienta_id: 'H-P3.3',
        usa_ia: true,
        adn_field: 'legado',
        requiere_datos_de: ['P3.2'],
      },
      {
        codigo: 'P3.4',
        titulo: 'Clarificación del legado',
        descripcion: 'Decile al Coach tu legado. Preguntale: "Si en 10 años logré este legado pero no gané mucho dinero, ¿valió la pena?" Esa respuesta separa el legado real del ego.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Decile al Coach tu legado. Preguntale: "Si en 10 años logré este legado pero no gané mucho dinero, ¿valió la pena?" Esa respuesta separa el legado real del ego.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 2: SPRINT DE MERCADO · Días 20–38 · Letras L + Í
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 4: Avatar · Días 20–26 ─────────────────────────────────────────
  {
    id: 'P4',
    numero_orden: 4,
    titulo: 'Avatar',
    subtitulo: 'Tu paciente ideal desde datos reales',
    color: '#F5A623',
    numero: 4,
    icon: 'UserCircle',
    emoji: '👤',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P3',
    fase: 2,
    dias_inicio: 20,
    dias_fin: 26,
    metodo_letra: 'L',
    metas: [
      {
        codigo: 'P4.1',
        titulo: 'Cómo construir el avatar desde datos reales',
        descripcion: 'Video sobre cómo construir un avatar basado en pacientes reales, no en demografía inventada.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P4_1',
      },
      {
        codigo: 'P4.2',
        titulo: 'Análisis de 3 pacientes reales',
        descripcion: '3 bloques iguales (Paciente 1, 2, 3). Para cada uno: "¿Qué problema tenía cuando llegó?" · "¿Cómo lo describía con sus propias palabras?" · "¿Qué intentó antes sin éxito?" · "¿Qué obtuvo después de trabajar juntos?" · "¿Cómo describe su vida ahora?"',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '40 min',
        orden: 2,
        herramienta_id: 'H-P4.2',
        usa_ia: false,
        adn_field: 'adn_pacientes_reales',
      },
      {
        codigo: 'P4.3',
        titulo: 'Constructor de Avatar',
        descripcion: 'Usa los 3 análisis ya guardados. Genera: nombre ficticio, edad, profesión, situación de vida, dolores ×5 mínimo, sueños ×3 mínimo, objeciones ×3, lenguaje exacto que usa (3 a 5 frases textuales). Textarea editable.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P4.3',
        usa_ia: true,
        adn_field: 'adn_avatar',
        requiere_datos_de: ['P4.2'],
      },
      {
        codigo: 'P4.4',
        titulo: 'Validación del avatar',
        descripcion: 'Contale al Coach quién es tu avatar. Preguntale: "¿Es suficientemente específico o sigue siendo vago?" Un avatar vago es "profesional de 35 a 50 años con estrés". Un avatar preciso es una persona real con una vida real.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Contale al Coach quién es tu avatar. Preguntale: "¿Es suficientemente específico o sigue siendo vago?" Un avatar vago es "profesional de 35 a 50 años con estrés". Un avatar preciso es una persona real con una vida real.',
      },
    ],
  },

  // ─── PILAR 5: Nicho + PUV · Días 26–31 ────────────────────────────────────
  {
    id: 'P5',
    numero_orden: 5,
    titulo: 'Nicho + PUV',
    subtitulo: 'Nicho no es restricción, es amplificación',
    color: '#F5A623',
    numero: 5,
    icon: 'Lightbulb',
    emoji: '💡',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P4',
    fase: 2,
    dias_inicio: 26,
    dias_fin: 31,
    metodo_letra: 'Í',
    metas: [
      {
        codigo: 'P5.1',
        titulo: 'Nicho no es restricción, es amplificación',
        descripcion: 'Video sobre cómo un nicho bien definido amplifica tu alcance en vez de limitarlo.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P5_1',
      },
      {
        codigo: 'P5.2',
        titulo: 'Definidor de Nicho y PUV',
        descripcion: 'Campos: "¿A quién específicamente NO querés atender?" · "¿En qué problema sos claramente mejor que el promedio de tu especialidad?" · "¿Qué tenés vos que ningún colega tiene?" · "¿Qué grupo de personas te busca a vos y no a otro?" Genera: descripción del nicho (2-3 oraciones) + 3 versiones de PUV: "Ayudo a [avatar] a [resultado] sin [obstáculo que temen]."',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P5.2',
        usa_ia: true,
        adn_field: 'adn_nicho',
      },
      {
        codigo: 'P5.3',
        titulo: 'Test de diferenciación',
        descripcion: 'Decile al Coach tu PUV. Preguntale: "Si borro mi nombre y pongo el de otro colega de mi especialidad, ¿todavía aplica?" Si la respuesta es sí, la PUV necesita más trabajo.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 3,
        usa_ia: false,
        coach_instruccion: 'Decile al Coach tu PUV. Preguntale: "Si borro mi nombre y pongo el de otro colega de mi especialidad, ¿todavía aplica?" Si la respuesta es sí, la PUV necesita más trabajo.',
      },
    ],
  },

  // ─── PILAR 6: Matriz A→B→C · Días 31–38 ───────────────────────────────────
  {
    id: 'P6',
    numero_orden: 6,
    titulo: 'Matriz A→B→C',
    subtitulo: 'Por qué el obstáculo es más importante que el dolor',
    color: '#F5A623',
    numero: 6,
    icon: 'Triangle',
    emoji: '🔺',
    estrellas_requeridas: 2,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P5',
    fase: 2,
    dias_inicio: 31,
    dias_fin: 38,
    metodo_letra: 'Í',
    hito_mensaje: 'Sabés a quién servís y qué lo tiene preso. El siguiente paso es convertir eso en un producto con precio.',
    hito_tipo: 'milestone',
    metas: [
      {
        codigo: 'P6.1',
        titulo: 'La Matriz A→B→C: por qué el obstáculo es más importante que el dolor',
        descripcion: 'Video explicativo sobre los 3 estados de la transformación del paciente.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P6_1',
      },
      {
        codigo: 'P6.2',
        titulo: 'Transformaciones reales de pacientes',
        descripcion: '10 bloques colapsables. Mínimo 5 completados para poder avanzar. Para cada paciente: "Estado A — ¿Cómo llegó? ¿Qué le dolía? ¿Cómo lo describía?" · "Estado B — ¿Qué le impedía resolverlo solo? ¿Qué intentó antes?" · "Estado C — ¿Dónde terminó? ¿Qué cambió en su vida?"',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '60 min',
        orden: 2,
        herramienta_id: 'H-P6.2',
        usa_ia: false,
        adn_field: 'adn_transformaciones',
      },
      {
        codigo: 'P6.3',
        titulo: 'Constructor de Matriz A→B→C',
        descripcion: 'Usa los casos ya guardados. Genera: Estado A (2-3 párrafos, experiencia emocional en lenguaje del paciente), Estado B (lista de 5-8 obstáculos — la razón por la que existe el programa), Estado C (2-3 párrafos, la vida sin el problema). Tres secciones editables.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P6.3',
        usa_ia: true,
        adn_field: 'matriz_a',
        requiere_datos_de: ['P6.2'],
      },
      {
        codigo: 'P6.4',
        titulo: 'Validación de la Matriz',
        descripcion: 'Mostrále al Coach la lista de obstáculos del B. Preguntale: "¿Si mi paciente leyera esto, diría que le estoy hablando a él?" Si la respuesta no es un sí claro, el B necesita más trabajo.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Mostrále al Coach la lista de obstáculos del B. Preguntale: "¿Si mi paciente leyera esto, diría que le estoy hablando a él?" Si la respuesta no es un sí claro, el B necesita más trabajo.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 3: SPRINT DE OFERTA · Días 36–45 · Letras N + I
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 7: Método · Días 36–42 ─────────────────────────────────────────
  {
    id: 'P7',
    numero_orden: 7,
    titulo: 'Método',
    subtitulo: 'Tu método propio como activo diferenciador',
    color: '#F5A623',
    numero: 7,
    icon: 'Cog',
    emoji: '⚙️',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P6',
    fase: 3,
    dias_inicio: 36,
    dias_fin: 42,
    metodo_letra: 'N',
    metas: [
      {
        codigo: 'P7.1',
        titulo: 'Tu método propio: cómo convertir lo que hacés en un activo diferenciador',
        descripcion: 'Video sobre cómo transformar tu proceso en un método con nombre propio.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P7_1',
      },
      {
        codigo: 'P7.2',
        titulo: 'Documentador del proceso actual',
        descripcion: 'Campos: "¿Qué pasa en el primer contacto con el paciente?" · "¿Cómo es la primera sesión?" · "¿Qué hacés en las sesiones siguientes, paso a paso?" · "¿Cómo sabés que el proceso terminó?" · "¿Cómo medís el resultado?" · "¿Cuánto tiempo dura el proceso completo?"',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P7.2',
        usa_ia: false,
        adn_field: 'adn_proceso_actual',
      },
      {
        codigo: 'P7.3',
        titulo: 'Generador de Método',
        descripcion: 'Usa el proceso ya guardado + la Matriz A→B→C. Genera: 5 opciones de nombre para el método (el usuario elige una) + 3 a 7 pasos con nombre y descripción breve.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P7.3',
        usa_ia: true,
        adn_field: 'metodo_nombre',
        requiere_datos_de: ['P7.2'],
      },
      {
        codigo: 'P7.4',
        titulo: 'Naming del método',
        descripcion: 'Contale al Coach el nombre que elegiste para tu método. Preguntale: "¿El nombre evoca el resultado que logra el paciente, o describe el proceso técnico que uso?" El nombre tiene que evocar el resultado.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Contale al Coach el nombre que elegiste para tu método. Preguntale: "¿El nombre evoca el resultado que logra el paciente, o describe el proceso técnico que uso?" El nombre tiene que evocar el resultado.',
      },
    ],
  },

  // ─── PILAR 8: Escalera de Ofertas · Días 42–45 ────────────────────────────
  {
    id: 'P8',
    numero_orden: 8,
    titulo: 'Escalera de Ofertas',
    subtitulo: 'Los cuatro niveles de acceso a tu trabajo',
    color: '#F5A623',
    numero: 8,
    icon: 'Building2',
    emoji: '🏗️',
    estrellas_requeridas: 3,
    es_hito: true,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P7',
    fase: 3,
    dias_inicio: 42,
    dias_fin: 45,
    metodo_letra: 'I',
    hito_mensaje: 'ADN base completo. Es el momento de activar tu campaña. Para llegar a $10K en los próximos 45 días necesitás tomar al menos 30 llamadas. Eso empieza ahora.',
    hito_tipo: 'urgent',
    metas: [
      {
        codigo: 'P8.1',
        titulo: 'La escalera de valor: por qué necesitás los cuatro niveles',
        descripcion: 'Video sobre la lógica de tener Lead Magnet + Low + Mid + High.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P8_1',
      },
      {
        codigo: 'P8.2',
        titulo: 'Diseñador de Oferta Mid',
        descripcion: 'La Oferta Mid se construye primero porque es el producto principal. Campos: "¿Cuánto tiempo dura el protocolo completo?" · "¿Cuántas sesiones incluye?" · "¿Qué resultado concreto y medible garantizás?" · "¿Qué soporte adicional incluye?" · "¿Qué precio tenés en mente?" Usa el Método y la Matriz A→B→C del ADN.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P8.2',
        usa_ia: true,
        adn_field: 'oferta_mid',
      },
      {
        codigo: 'P8.3',
        titulo: 'Generador de Oferta High + Low + Lead Magnet',
        descripcion: 'Usa la Oferta Mid ya guardada. Genera las otras 3: Oferta High ($4.000-$6.000, Mid amplificado con acceso directo), Oferta Low ($500-$1.000, primeras 2-3 sesiones), Lead Magnet (gratis o hasta $27, recurso que resuelve el primer dolor). Tres secciones editables.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P8.3',
        usa_ia: true,
        adn_field: 'oferta_high',
        requiere_datos_de: ['P8.2'],
      },
      {
        codigo: 'P8.4',
        titulo: 'Validación de precios',
        descripcion: 'Mostrále al Coach tus 4 ofertas con precios. Preguntale: "¿Son coherentes con lo que cobra alguien de mi especialidad en mi mercado?" El objetivo es ni demasiado bajo (quema el posicionamiento) ni demasiado alto (genera fricción innecesaria).',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Mostrále al Coach tus 4 ofertas con precios. Preguntale: "¿Son coherentes con lo que cobra alguien de mi especialidad en mi mercado?" El objetivo es ni demasiado bajo (quema el posicionamiento) ni demasiado alto (genera fricción innecesaria).',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 4: ACTIVACIÓN Y VENTAS · Días 45–80 · Letras N + I + C
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 9A: Infraestructura · Días 45–52 ──────────────────────────────
  {
    id: 'P9A',
    numero_orden: 9,
    titulo: 'Infraestructura',
    subtitulo: 'El embudo mínimo viable',
    color: '#F5A623',
    numero: 9,
    icon: 'Megaphone',
    emoji: '📣',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P8',
    fase: 4,
    dias_inicio: 45,
    dias_fin: 52,
    metodo_letra: 'C',
    metas: [
      {
        codigo: 'P9A.1',
        titulo: 'El embudo mínimo viable para profesionales de salud',
        descripcion: 'Video explicativo sobre el embudo: campaña → DM con palabra clave → respuesta automática → formulario de filtro → calendario → llamada → venta.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P9A_1',
      },
      {
        codigo: 'P9A.2',
        titulo: 'Generador de Copy de Landing Page',
        descripcion: 'Sin campos nuevos. Usa Avatar + Matriz A→B→C + Oferta Mid del ADN. Genera el copy completo: headline, subheadline, sección del problema, obstáculos, solución, qué incluye, para quién es, para quién no es, preguntas frecuentes, llamado a la acción.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 2,
        herramienta_id: 'H-P9A.2',
        usa_ia: true,
        adn_field: 'adn_landing_copy',
      },
      {
        codigo: 'P9A.3',
        titulo: 'Generador de 3 Anuncios para Meta',
        descripcion: 'Sin campos nuevos. Usa el ADN. Genera 3 versiones: Anuncio desde el A (el dolor), Anuncio desde el B (el obstáculo), Anuncio desde el C (el sueño). Para cada versión: copy para imagen estática + guión de 30 segundos para video/reel.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 3,
        herramienta_id: 'H-P9A.3',
        usa_ia: true,
        adn_field: 'adn_anuncios',
      },
      {
        codigo: 'P9A.4',
        titulo: 'Genius Contenido — Plan semanal orgánico',
        descripcion: 'Campo: "¿Qué objeción o miedo de tu avatar apareció más esta semana?" Genera 5 ideas de contenido: 2 reels, 2 posts, 1 carrusel. Cada idea: formato, hook de apertura, idea central, CTA. Este paso es recurrente — podés volver todas las semanas.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        herramienta_id: 'H-P9A.4',
        usa_ia: true,
        es_recurrente: true,
      },
      {
        codigo: 'P9A.5',
        titulo: 'Revisión del embudo antes de activar',
        descripcion: 'Decile al Coach que ya tenés el copy de la landing y los anuncios listos. Preguntale: "¿El mensaje de los anuncios habla exactamente al mismo avatar que la landing? ¿El formulario de filtro en GHL está configurado? ¿El calendario tiene al menos 3 horarios disponibles esta semana?" Si todo está, activá.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 5,
        usa_ia: false,
        coach_instruccion: 'Decile al Coach que ya tenés el copy de la landing y los anuncios listos. Preguntale: "¿El mensaje de los anuncios habla exactamente al mismo avatar que la landing? ¿El formulario de filtro en GHL está configurado? ¿El calendario tiene al menos 3 horarios disponibles esta semana?" Si todo está, activá.',
      },
    ],
  },

  // ─── PILAR 9B: Captación · Días 52–72 ─────────────────────────────────────
  {
    id: 'P9B',
    numero_orden: 10,
    titulo: 'Captación',
    subtitulo: 'No estás vendiendo, estás evaluando',
    color: '#F5A623',
    numero: 9,
    icon: 'Phone',
    emoji: '📞',
    estrellas_requeridas: 4,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P9A',
    fase: 4,
    dias_inicio: 52,
    dias_fin: 72,
    metodo_letra: 'C',
    metas: [
      {
        codigo: 'P9B.1',
        titulo: 'La llamada de diagnóstico: no estás vendiendo, estás evaluando',
        descripcion: 'Video sobre cómo encarar la llamada de diagnóstico sin vender.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P9B_1',
      },
      {
        codigo: 'P9B.2',
        titulo: 'Constructor de Script de Ventas',
        descripcion: 'Sin campos nuevos. Usa Avatar + Matriz A→B→C del ADN. Genera el script completo de 45 minutos: apertura y encuadre, preguntas de diagnóstico, profundización del dolor, presentación de la solución, manejo de las 5 objeciones más comunes del avatar, cierre con precio.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 2,
        herramienta_id: 'H-P9B.2',
        usa_ia: true,
        adn_field: 'script_venta',
      },
      {
        codigo: 'P9B.3',
        titulo: 'Preparación con el Simulador de Llamada',
        descripcion: 'Antes de tu primera llamada real, abrí el Simulador de Llamada desde Agentes IA y practicá al menos 3 roleplays con tu avatar. Después volvé al Coach y preguntale: "Ya practiqué 3 simulaciones. ¿Qué patrones de objeción aparecieron? ¿Qué debería ajustar del script antes de la primera llamada real?" El simulador NO guarda nada en el ADN — solo entrena.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '45 min',
        orden: 3,
        usa_ia: false,
        coach_instruccion: 'Ya practiqué 3 simulaciones con el Simulador de Llamada. ¿Qué patrones de objeción aparecieron? ¿Qué debería ajustar del script antes de la primera llamada real?',
      },
      {
        codigo: 'P9B.4',
        titulo: 'Debrief de la primera llamada real',
        descripcion: 'Después de tu primera llamada real, vení al Coach y contale exactamente qué pasó: ¿llegó al precio? ¿qué objeción apareció que no esperabas? ¿cómo respondiste? ¿cerró o no? El Coach te ayuda a ajustar el script para la próxima.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 4,
        usa_ia: false,
        coach_instruccion: 'Después de tu primera llamada real, vení al Coach y contale exactamente qué pasó: ¿llegó al precio? ¿qué objeción apareció que no esperabas? ¿cómo respondiste? ¿cerró o no? El Coach te ayuda a ajustar el script para la próxima.',
      },
    ],
  },

  // ─── PILAR 9C: Seguimiento · Días 65–75 ───────────────────────────────────
  {
    id: 'P9C',
    numero_orden: 11,
    titulo: 'Seguimiento',
    subtitulo: 'Automatizar la entrega sin perder el toque personal',
    color: '#F5A623',
    numero: 9,
    icon: 'Handshake',
    emoji: '🤝',
    estrellas_requeridas: 3,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P9B',
    fase: 4,
    dias_inicio: 65,
    dias_fin: 75,
    metodo_letra: 'C',
    metas: [
      {
        codigo: 'P9C.1',
        titulo: 'Automatizar la entrega sin perder el toque personal',
        descripcion: 'Video sobre cómo automatizar procesos manteniendo la calidad del servicio.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P9C_1',
      },
      {
        codigo: 'P9C.2',
        titulo: 'Documentador de Protocolo de Entrega',
        descripcion: 'Campos: "¿Qué recibe el paciente en las primeras 24 horas después de pagar?" · "¿Cómo se configura la primera sesión?" · "¿Qué recordatorios automáticos necesita durante el protocolo?" · "¿Cómo se hace el seguimiento entre sesiones?" · "¿Qué pasa al terminar el protocolo?" Genera: email de bienvenida automático, lista de 5 automatizaciones prioritarias para GHL, protocolo de cierre.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '30 min',
        orden: 2,
        herramienta_id: 'H-P9C.2',
        usa_ia: true,
        adn_field: 'adn_protocolo_servicio',
      },
      {
        codigo: 'P9C.3',
        titulo: 'Auditoría del sistema de entrega',
        descripcion: 'Preguntale al Coach: "¿Si me voy 5 días sin internet, mi servicio sigue funcionando?" Describile el estado actual de tus automatizaciones. El Coach te dice qué falta.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 3,
        usa_ia: false,
        coach_instruccion: 'Preguntale al Coach: "¿Si me voy 5 días sin internet, mi servicio sigue funcionando?" Describile el estado actual de tus automatizaciones. El Coach te dice qué falta.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 5: IDENTIDAD VISUAL · Días 70–80
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 10: Identidad Visual · Días 70–80 ──────────────────────────────
  {
    id: 'P10',
    numero_orden: 12,
    titulo: 'Identidad Visual',
    subtitulo: 'El sistema visual que expresa quién sos',
    color: '#F5A623',
    numero: 10,
    icon: 'Palette',
    emoji: '🎨',
    estrellas_requeridas: 2,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P9C',
    fase: 5,
    dias_inicio: 70,
    dias_fin: 80,
    metodo_letra: 'A',
    metas: [
      {
        codigo: 'P10.1',
        titulo: 'Identidad visual para profesionales de salud',
        descripcion: 'Video sobre identidad visual alineada con tu nicho y posicionamiento.',
        tipo: 'VIDEO',
        es_estrella: false,
        tiempo_estimado: '15 min',
        orden: 1,
        usa_ia: false,
        video_youtube_id: 'PLACEHOLDER_P10_1',
      },
      {
        codigo: 'P10.2',
        titulo: 'Generador de Sistema de Identidad',
        descripcion: 'Sin campos nuevos. Usa Historia + Propósito + Avatar + Nicho del ADN. Genera: paleta de colores (primario, secundario, acento, neutros con justificación), tipografías de Google Fonts, tono de voz (5 palabras que SÍ y 5 que NO, con ejemplo), brief completo para diseñador o Canva.',
        tipo: 'HERRAMIENTA',
        es_estrella: true,
        tiempo_estimado: '25 min',
        orden: 2,
        herramienta_id: 'H-P10.2',
        usa_ia: true,
        adn_field: 'adn_identidad_sistema',
      },
      {
        codigo: 'P10.3',
        titulo: 'Coherencia de la identidad',
        descripcion: 'Mostrále al Coach tu paleta de colores y el tono de voz. Preguntale: "¿Es coherente con el tipo de paciente que quiero atraer y con lo que prometí en mi propósito?" Una fisioterapeuta para mujeres con dolor crónico no puede tener una identidad de startup tecnológica.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 3,
        usa_ia: false,
        coach_instruccion: 'Mostrále al Coach tu paleta de colores y el tono de voz que generaste. Preguntale: "¿Es coherente con el tipo de paciente que quiero atraer y con lo que prometí en mi propósito?" Una fisioterapeuta para mujeres con dolor crónico no puede tener una identidad de startup tecnológica.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FASE 6: ANÁLISIS Y OPTIMIZACIÓN · Días 85–90
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PILAR 11: Análisis · Días 85–90 ──────────────────────────────────────
  {
    id: 'P11',
    numero_orden: 13,
    titulo: 'Análisis y Optimización',
    subtitulo: 'Retrospectiva y plan de ajuste',
    color: '#F5A623',
    numero: 11,
    icon: 'BarChart3',
    emoji: '📊',
    estrellas_requeridas: 2,
    desbloqueo: 'completar_anterior',
    pilar_prerequisito: 'P10',
    fase: 6,
    dias_inicio: 85,
    dias_fin: 90,
    hito_mensaje: '¿ADN al 100%? ¿Ingresos del mes ≥ $10.000 USD? Si sí: celebración + certificado + opción de renovar. Si no: se activa la garantía.',
    hito_tipo: 'checkpoint',
    metas: [
      {
        codigo: 'P11.1',
        titulo: 'Retrospectiva con el Agente + plan con el Coach',
        descripcion: 'Abrí el Agente de Retrospectiva Mensual desde Agentes IA y completá la retrospectiva (qué funcionó · qué no · cuello de botella según métricas del Dashboard). Después decile al Coach: "Ya hice la retrospectiva del ciclo. El cuello de botella que identifiqué fue X. ¿Qué plan concreto me sugerís para el ciclo 2 · Consolidar / Optimizar / Escalar?" El Agente NO guarda en el ADN — solo analiza.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '60 min',
        orden: 1,
        usa_ia: false,
        coach_instruccion: 'Ya hice la retrospectiva del ciclo con el Agente. El cuello de botella que identifiqué fue X. ¿Qué plan concreto me sugerís para el ciclo 2 · Consolidar / Optimizar / Escalar?',
      },
      {
        codigo: 'P11.2',
        titulo: 'Plan de ajuste',
        descripcion: 'Mostrále al Coach el diagnóstico que te dio el Agente de Retrospectiva. Preguntale: "¿Qué cambio concreto en el embudo o en el script me daría más impacto esta semana?" El Coach responde desde tu ADN y tus métricas reales.',
        tipo: 'COACH',
        es_estrella: true,
        tiempo_estimado: '15 min',
        orden: 2,
        usa_ia: false,
        coach_instruccion: 'Mostrále al Coach el diagnóstico que te dio el Agente de Retrospectiva. Preguntale: "¿Qué cambio concreto en el embudo o en el script me daría más impacto esta semana?" El Coach responde desde tu ADN y tus métricas reales.',
      },
    ],
  },
];

// ─── Helpers V3 ─────────────────────────────────────────────────────────────

/** Total de metas en todo el programa (49) */
export const TOTAL_METAS = SEED_ROADMAP_V3.reduce(
  (acc, pilar) => acc + pilar.metas.length,
  0,
);

/** Total de tareas ★ por pilar */
export const ESTRELLAS_POR_PILAR: Record<string, number> = SEED_ROADMAP_V3.reduce(
  (acc, pilar) => ({
    ...acc,
    [pilar.id]: pilar.metas.filter((m) => m.es_estrella).length,
  }),
  {} as Record<string, number>,
);

/**
 * Determina el nivel de avatar (1-5) según el pilar más alto completado (v7).
 *
 * Triggers v7:
 *  - Nivel 1 · Sanador Despierto · post P0 (default)
 *  - Nivel 2 · Sanador Narrado · post P3 (Fase 1 cerrada)
 *  - Nivel 3 · Sanador Posicionado · post P8 (Fase 3 cerrada)
 *  - Nivel 4 · Sanador Activo · post P9A (infraestructura lista)
 *  - Nivel 5 · Sanador Libre · post P11 + $10K cerrado
 *
 * Nota: el flag `cerroPrimer10K` habilita el salto a Nivel 5.
 * Si es `false`, un usuario con P11 completado queda en Nivel 4 hasta validar ingresos.
 */
export function calcularNivel(
  pilarCompletado: PilarId | number,
  cerroPrimer10K: boolean = false,
): 1 | 2 | 3 | 4 | 5 {
  let orden: number;
  if (typeof pilarCompletado === 'number') {
    orden = pilarCompletado;
  } else {
    const pilar = SEED_ROADMAP_V3.find((p) => p.id === pilarCompletado);
    if (!pilar) return 1;
    orden = pilar.numero_orden;
  }
  if (orden >= 13 && cerroPrimer10K) return 5; // P11 completado + $10K
  if (orden >= 9) return 4;                    // P9A completado
  if (orden >= 8) return 3;                    // P8 completado
  if (orden >= 3) return 2;                    // P3 completado
  return 1;                                    // default (post P0)
}

/** Calcula el día del programa a partir de la fecha de inicio */
export function calcularDiaPrograma(fechaInicio: string): number {
  const inicio = new Date(fechaInicio);
  const hoy = new Date();
  const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(90, Math.max(1, diff + 1));
}

/** Retorna clases de estilo para el estado del pilar */
export function colorEstadoPilar(
  estado: 'completado' | 'en_progreso' | 'bloqueado',
): string {
  switch (estado) {
    case 'completado':
      return 'border-l-[3px] border-l-[#22C55E] bg-[#141414] border border-[rgba(245,166,35,0.2)]';
    case 'en_progreso':
      return 'border-l-[3px] border-l-[#F5A623] bg-[#141414] border border-[rgba(245,166,35,0.2)]';
    case 'bloqueado':
      return 'opacity-40 cursor-not-allowed bg-[#141414] border border-[rgba(245,166,35,0.1)]';
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
  { fase: 0, titulo: 'Fase 0 — Onboarding',              subtitulo: 'El Coach te conoce',              dias: 'Días 1–3' },
  { fase: 1, titulo: 'Fase 1 — Sprint de Identidad',     subtitulo: 'Quién sos',                       dias: 'Días 3–20',  metodo_letra: 'C' },
  { fase: 2, titulo: 'Fase 2 — Sprint de Mercado',       subtitulo: 'A quién servís',                  dias: 'Días 20–38', metodo_letra: 'LÍ' },
  { fase: 3, titulo: 'Fase 3 — Sprint de Oferta',        subtitulo: 'Qué ofrecés',                     dias: 'Días 36–45', metodo_letra: 'NI' },
  { fase: 4, titulo: 'Fase 4 — Activación y Ventas',     subtitulo: 'Cómo llegás y vendés',             dias: 'Días 45–75', metodo_letra: 'C' },
  { fase: 5, titulo: 'Fase 5 — Identidad Visual',        subtitulo: 'Cómo te reconocen',                dias: 'Días 70–80', metodo_letra: 'A' },
  { fase: 6, titulo: 'Fase 6 — Análisis y Optimización', subtitulo: 'Retrospectiva y cierre',           dias: 'Días 85–90' },
];

// ─── Backward compatibility alias ───────────────────────────────────────────

/** @deprecated Usar SEED_ROADMAP_V3 */
export const SEED_ROADMAP_V2 = SEED_ROADMAP_V3;
