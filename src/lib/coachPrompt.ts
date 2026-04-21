/**
 * coachPrompt.ts — Constructor del System Prompt dinámico del Coach IA
 * Método CLÍNICA v2.0
 *
 * El Coach no es un chatbot genérico. Antes de cada interacción, el sistema
 * construye dinámicamente el system prompt con todos los datos del usuario.
 */
import type { ProfileV2, DiarioEntradaV2, MetricaSemana, MetricaSemanaV2, HojaDeRutaItem } from './supabase';
import { NIVEL_NOMBRES } from './supabase';
import { SEED_ROADMAP_V2 } from './roadmapSeed';
import { calcularFunnelKPIs, diagnosticarEmbudo, type FunnelKPIs } from './funnelCalcs';
import { ADN_SCHEMA_V7, campoEstaCompleto, getADNValor } from './adnSchema';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ContextoCoach {
  perfil: Partial<ProfileV2>;
  ultimaEntradaDiario?: Partial<DiarioEntradaV2>;
  entradasSemana?: Partial<DiarioEntradaV2>[];
  metricasSemana?: Partial<MetricaSemana>;
  metricasEmbudoV2?: MetricaSemanaV2;
  energiaPromedio7d?: number;
  tareasHojaDeRuta?: HojaDeRutaItem[];
  ventasRegistradas?: number;
  esResumenViernes?: boolean;
  esResumenDomingo?: boolean;
  esRetrospectivaMensual?: boolean;
  esCallDeVenta?: boolean;
  hayBloqueoPersistente?: boolean;
  baseDeConocimiento?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function semaforo(
  diasSinDiario: number,
  progresoPct: number,
): 'verde' | 'amarillo' | 'rojo' {
  if (diasSinDiario >= 5 || progresoPct < 30) return 'rojo';
  if (diasSinDiario >= 3 || progresoPct < 60) return 'amarillo';
  return 'verde';
}

function tarea_estrella_actual(tareas: HojaDeRutaItem[]): string {
  const pendiente = tareas
    .filter((t) => !t.completada && t.es_estrella)
    .sort((a, b) => a.pilar_numero - b.pilar_numero)[0];
  if (!pendiente) return 'No hay tareas ★ pendientes — ¡estás al día!';
  const pilar = SEED_ROADMAP_V2.find((p) => p.numero === pendiente.pilar_numero);
  const meta = pilar?.metas.find((m) => m.codigo === pendiente.meta_codigo);
  return meta
    ? `META ${pendiente.meta_codigo}: ${meta.titulo} (Pilar ${pendiente.pilar_numero} — ${pilar?.titulo})`
    : `META ${pendiente.meta_codigo} del Pilar ${pendiente.pilar_numero}`;
}

function energia_baja_consecutiva(entradas: Partial<DiarioEntradaV2>[]): boolean {
  const ultimas2 = entradas.slice(0, 2);
  return ultimas2.length === 2 && ultimas2.every((e) => (e.energia_nivel ?? 10) < 4);
}

function pensamiento_coincide_programa(
  pensamientoActual: string,
  programasInconscientes: ProfileV2['programas_inconscientes'],
): string | null {
  if (!pensamientoActual || !programasInconscientes?.length) return null;
  const lower = pensamientoActual.toLowerCase();
  const coincide = programasInconscientes.find((p) =>
    p.programa.toLowerCase().split(' ').some((palabra) => lower.includes(palabra)),
  );
  return coincide ? coincide.programa : null;
}

// ─── Constructor principal ────────────────────────────────────────────────────

export function buildCoachSystemPrompt(ctx: ContextoCoach): string {
  const { perfil, ultimaEntradaDiario, entradasSemana = [], tareasHojaDeRuta = [], ventasRegistradas = 0 } = ctx;

  const nivel = perfil.nivel_avatar ?? 1;
  const nombreNivel = NIVEL_NOMBRES[nivel as 1 | 2 | 3 | 4 | 5];
  const diasSinDiario = ultimaEntradaDiario
    ? Math.floor((Date.now() - new Date(ultimaEntradaDiario.fecha ?? '').getTime()) / 86400000)
    : 999;
  const progresoPct = perfil.progreso_porcentaje ?? 0;
  const semaforoColor = semaforo(diasSinDiario, progresoPct);
  const tareaEstrella = tareasHojaDeRuta.length > 0 ? tarea_estrella_actual(tareasHojaDeRuta) : 'Iniciar el programa';

  // ─── Adaptación por nivel de avatar ────────────────────────────────────────
  const TONO_POR_NIVEL: Record<number, string> = {
    1: 'Sé cálido y muy guiado. Este profesional recién empieza. Explicá el "por qué" de cada paso. Celebrá los pequeños avances. No abrumes con demasiada información a la vez.',
    2: 'Mantén el tono cálido pero aumentá la exigencia. Ya conocen las bases. Empezá a hacer preguntas que lleven a la acción. Menos explicación, más ejecución.',
    3: 'Sé directo y orientado a resultados. Ya tienen el sistema básico. Ahora es momento de apretar en métricas y consistencia. Podés hacer preguntas incómodas.',
    4: 'Sé exigente y estratégico. Están en modo aceleración. Hablá de números, conversiones, optimización. El tono es de par a par, no de mentor a alumno.',
    5: 'Sé igual a igual. Son emprendedores consolidados. La conversación es de estrategia avanzada, escalabilidad y sistemas. No expliques lo obvio.',
  };

  // ─── Secciones del prompt ───────────────────────────────────────────────────

  const BASE = `
Sos el Coach IA del Método CLÍNICA — programa de 90 días para sanadores que quieren construir su clínica digital y escalar sus ingresos.

Tu personalidad: directo, cálido, exigente cuando hace falta, nunca condescendiente. No usás frases de autoayuda vacías. No felicitás por todo. Cuando algo no está bien, lo decís. Cuando algo está muy bien, lo celebrás con especificidad (nombrás exactamente qué hizo bien y por qué importa).

Tu objetivo en cada conversación: que el profesional salga con 1 acción concreta para ejecutar en las próximas 24 horas. No 5 acciones. Una.

REGLA CLAVE: Si el usuario pregunta "¿qué hago?" o "¿cuál es mi próximo paso?", respondé con el próximo paso exacto de la Hoja de Ruta (ver TAREA PRIORITARIA ACTUAL). No inventes tareas que no existan en el programa.

Conocés su ADN completo (campos completados con herramientas IA), sus métricas del embudo de ventas, y su energía de los últimos 7 días. Usá toda esta información para personalizar cada respuesta.
  `.trim();

  // ─── ADN completo leído desde el schema v7 (56 campos agrupados en 7 secciones)
  //     Se itera sobre ADN_SCHEMA_V7 para que cualquier campo nuevo aparezca aquí
  //     automáticamente sin tocar el prompt. Ver src/lib/adnSchema.ts.
  const seccionesAdnTexto: string[] = [];
  let camposCompletados = 0;
  for (const seccion of ADN_SCHEMA_V7) {
    const lineasSeccion: string[] = [];
    for (const campo of seccion.campos) {
      if (!campoEstaCompleto(perfil, campo)) continue;
      camposCompletados += 1;
      const valor = getADNValor(perfil, campo);
      let textoValor = '';
      if (typeof valor === 'string') {
        textoValor = valor.length > 180 ? `${valor.substring(0, 180)}…` : valor;
      } else if (Array.isArray(valor)) {
        textoValor = valor.filter(Boolean).join(' · ').substring(0, 180);
      } else if (typeof valor === 'object' && valor !== null) {
        textoValor = 'completado';
      } else {
        textoValor = String(valor);
      }
      lineasSeccion.push(`  - ${campo.label}: ${textoValor}`);
    }
    if (lineasSeccion.length > 0) {
      seccionesAdnTexto.push(`[${seccion.codigo}] ${seccion.titulo} (${seccion.pilarRange})\n${lineasSeccion.join('\n')}`);
    }
  }

  const ADN_SECTION = camposCompletados > 0
    ? `\n=== ADN DEL NEGOCIO (${camposCompletados}/56 campos completados) ===\n${seccionesAdnTexto.join('\n\n')}`
    : '';

  // Funnel metrics
  let EMBUDO_SECTION = '';
  if (ctx.metricasEmbudoV2) {
    const kpis = calcularFunnelKPIs(ctx.metricasEmbudoV2);
    const diagnosticos = diagnosticarEmbudo(kpis);
    const criticos = diagnosticos.filter(d => d.nivel === 'critico');
    const alertas = diagnosticos.filter(d => d.nivel === 'alerta');
    EMBUDO_SECTION = `
=== MÉTRICAS DEL EMBUDO (última semana) ===
Gasto ads: $${ctx.metricasEmbudoV2.gasto_ads} | Mensajes: ${ctx.metricasEmbudoV2.mensajes_recibidos} | Formularios: ${ctx.metricasEmbudoV2.formularios_completados}
Agendados: ${ctx.metricasEmbudoV2.agendados} | Shows: ${ctx.metricasEmbudoV2.shows} | Llamadas: ${ctx.metricasEmbudoV2.llamadas_tomadas}
Ventas: ${ctx.metricasEmbudoV2.ventas_cerradas} | Ingresos: $${ctx.metricasEmbudoV2.ingresos_cobrados} | Horas/sem: ${ctx.metricasEmbudoV2.horas_trabajadas_semana}
KPIs: Tasa cierre=${kpis.tasa_cierre !== null ? (kpis.tasa_cierre * 100).toFixed(1) + '%' : '—'} | CPV=${kpis.cpv !== null ? '$' + kpis.cpv.toFixed(0) : '—'} | PHR=${kpis.phr !== null ? '$' + kpis.phr.toFixed(0) : '—'}
${criticos.length > 0 ? `CRÍTICOS: ${criticos.map(d => `${d.etapa}: ${d.mensaje}`).join(' | ')}` : ''}
${alertas.length > 0 ? `ALERTAS: ${alertas.map(d => `${d.etapa}: ${d.mensaje}`).join(' | ')}` : ''}
    `.trim();
  }

  // Energy average
  const energiaAvg = ctx.energiaPromedio7d;
  const ENERGIA_SECTION = energiaAvg !== undefined
    ? `\n=== ENERGÍA PROMEDIO 7 DÍAS: ${energiaAvg.toFixed(1)}/10 ===${energiaAvg < 5 ? '\n⚠️ ENERGÍA BAJA — abordar esto en la conversación. Preguntar por sueño, alimentación, movimiento.' : ''}`
    : '';

  const CONTEXTO_USUARIO = `
=== DATOS DEL PROFESIONAL ===
Nombre: ${perfil.nombre ?? 'No especificado'}
Especialidad: ${perfil.especialidad ?? 'No especificada'}
Nicho: ${perfil.nicho ?? perfil.adn_nicho ?? 'Aún no definido'}
Avatar de cliente ideal: ${perfil.avatar_cliente ?? (perfil.adn_avatar ? perfil.adn_avatar.nombre_ficticio : 'Aún no definido')}
Posicionamiento: ${perfil.posicionamiento ?? 'Aún no definido'}
Historia de origen: ${perfil.historia_origen ? perfil.historia_origen.substring(0, 200) + '...' : perfil.historia_300 ? perfil.historia_300.substring(0, 200) + '...' : 'Aún no documentada'}
${ADN_SECTION}
=== ESTADO DEL PROGRAMA ===
Día del programa: ${perfil.dia_programa ?? 1} de 90
Pilar actual: ${perfil.pilar_actual ?? 0} de 14
Progreso total: ${progresoPct}%
Nivel en el programa: Nivel ${nivel} — ${nombreNivel}
Ventas registradas: ${ventasRegistradas}
Semáforo: ${semaforoColor === 'verde' ? 'EN CAMINO' : semaforoColor === 'amarillo' ? 'AJUSTAR' : 'INTERVENCIÓN NECESARIA'}
${EMBUDO_SECTION}${ENERGIA_SECTION}
=== TAREA PRIORITARIA ACTUAL ===
${tareaEstrella}

=== ADAPTACIÓN DE TONO ===
${TONO_POR_NIVEL[nivel] ?? TONO_POR_NIVEL[1]}
  `.trim();

  let DIARIO_SECTION = '';
  if (ultimaEntradaDiario) {
    DIARIO_SECTION = `
=== ÚLTIMA ENTRADA DEL DIARIO ===
Fecha: ${ultimaEntradaDiario.fecha ?? 'hoy'}
Energía: ${ultimaEntradaDiario.energia_nivel ?? '?'}/10
Estado general: ${ultimaEntradaDiario.respuestas?.q1 ?? 'No registrado'}
Fricción del día: ${ultimaEntradaDiario.respuestas?.q2 ?? 'No registrado'}
Acción tomada: ${ultimaEntradaDiario.respuestas?.q3 ?? 'No registrado'}
Pensamiento dominante: ${ultimaEntradaDiario.pensamiento_dominante ?? ultimaEntradaDiario.respuestas?.q4 ?? 'No registrado'}
Emoción predominante: ${ultimaEntradaDiario.emocion ?? ultimaEntradaDiario.respuestas?.q5 ?? 'No registrado'}
Aprendizaje: ${ultimaEntradaDiario.aprendizaje ?? ultimaEntradaDiario.respuestas?.q6 ?? 'No registrado'}
Acción para mañana: ${ultimaEntradaDiario.accion_manana ?? ultimaEntradaDiario.respuestas?.q7 ?? 'No registrado'}
    `.trim();
  }

  // ─── Secciones condicionales ────────────────────────────────────────────────

  let SECCIONES_CONDICIONALES = '';

  // 1. Carta del día 91 → si energía baja por 2 días consecutivos
  if (perfil.carta_dia91 && energia_baja_consecutiva(entradasSemana)) {
    SECCIONES_CONDICIONALES += `
=== CARTA DEL DÍA 91 (MOSTRAR HOY) ===
La energía del profesional lleva 2+ días por debajo de 4/10. En algún momento de esta conversación, compartí un fragmento de la Carta del Día 91 (no la transcribas entera — elegí el párrafo más relevante para este momento):
"${perfil.carta_dia91.substring(0, 400)}..."

Usala cuando el profesional necesite reconectarse con su por qué. No la uses de forma forzada.
    `.trim();
  }

  // 2. Programas inconscientes → si pensamiento dominante coincide
  const pensamientoHoy = ultimaEntradaDiario?.pensamiento_dominante ?? '';
  const programaActivado = pensamiento_coincide_programa(pensamientoHoy, perfil.programas_inconscientes);
  if (programaActivado && perfil.programas_inconscientes) {
    const reformulacion = perfil.programas_inconscientes.find((p) => p.programa === programaActivado);
    if (reformulacion) {
      SECCIONES_CONDICIONALES += `
=== PROGRAMA INCONSCIENTE ACTIVO ===
El pensamiento dominante de hoy ("${pensamientoHoy}") coincide con el programa inconsciente registrado:
- Programa: "${reformulacion.programa}"
- Reformulación: "${reformulacion.reformulacion}"

Cuando el profesional mencione este pensamiento, conectalo gentilmente con la reformulación. No lo hagas de forma mecánica — integrálo en la conversación.
      `.trim();
    }
  }

  // 3. Por qué oficial → siempre útil cuando el ánimo está bajo
  if (perfil.por_que_oficial && semaforoColor === 'rojo') {
    SECCIONES_CONDICIONALES += `
=== POR QUÉ OFICIAL ===
Si el profesional está desmotivado o en modo "no puedo", recordale su por qué:
"${perfil.por_que_oficial}"
    `.trim();
  }

  // 4. Protocolo de cierre → cuando está en Pilar 7 y menciona llamada de venta
  if (ctx.esCallDeVenta) {
    SECCIONES_CONDICIONALES += `
=== MODO LLAMADA DE VENTA ===
El profesional está preparándose para una llamada de venta. Enfocate en:
1. Repasar el guión de apertura y diagnóstico
2. Anticipar las objeciones más probables para su nicho
3. Recordarle que la llamada es diagnóstico primero, presentación después
4. Cierres específicos para su precio y avatar
No des consejos genéricos de ventas — todo debe ser específico para su nicho y protocolo.
    `.trim();
  }

  // 5. Resumen semanal (domingo)
  if ((ctx.esResumenDomingo || ctx.esResumenViernes) && entradasSemana.length >= 3) {
    const energiaPromedio = entradasSemana.reduce((sum, e) => sum + (e.energia_nivel ?? 5), 0) / entradasSemana.length;
    SECCIONES_CONDICIONALES += `
=== MODO RESUMEN SEMANAL ===
Es domingo. Analizá los patrones de la semana basándote en el Diario:
- Energía promedio: ${energiaPromedio.toFixed(1)}/10
- Entradas registradas: ${entradasSemana.length} de 7 posibles
- Fricción recurrente: ${entradasSemana.map((e) => e.respuestas?.q2 ?? '').filter(Boolean).join(' / ')}

Generá el resumen de la semana según el Método CLÍNICA (racha, energía, bloqueo recurrente, pensamiento dominante, emoción dominante, 3 acciones para la próxima semana).
    `.trim();
  }

  // 6. Retrospectiva mensual
  if (ctx.esRetrospectivaMensual) {
    SECCIONES_CONDICIONALES += `
=== MODO RETROSPECTIVA MENSUAL ===
El profesional está haciendo la revisión mensual. Estructura la conversación en:
1. ¿Dónde estabas hace 30 días vs dónde estás hoy? (con números)
2. ¿Cuál fue el mayor logro del mes? (específico)
3. ¿Cuál fue el mayor aprendizaje? (que cambia algo en el próximo mes)
4. ¿Qué está bloqueado y necesita atención? (diagnosticá el cuello de botella)
5. ¿Cuáles son los 3 objetivos del próximo mes? (SMART)
6. Revisión de la Hoja de Ruta: ¿dónde estás vs donde deberías estar en el día ${perfil.dia_programa ?? '?'} de 90?
    `.trim();
  }

  // ─── Base de conocimiento ────────────────────────────────────────────────────

  const CONOCIMIENTO_SECTION = ctx.baseDeConocimiento
    ? `=== BASE DE CONOCIMIENTO DEL PROFESIONAL ===\nDocumentos generados con herramientas IA en tareas completadas. Usá esta información para personalizar absolutamente todo lo que respondés.\n\n${ctx.baseDeConocimiento}`.trim()
    : '';

  // ─── Prompt final ───────────────────────────────────────────────────────────

  return [BASE, CONTEXTO_USUARIO, CONOCIMIENTO_SECTION, DIARIO_SECTION, SECCIONES_CONDICIONALES]
    .filter(Boolean)
    .join('\n\n');
}

// ─── Detectores de contexto ────────────────────────────────────────────────────

export function detectarContextoConversacion(mensajeUsuario: string): Partial<ContextoCoach> {
  const msg = mensajeUsuario.toLowerCase();
  return {
    esCallDeVenta: msg.includes('llamada') || msg.includes('venta') || msg.includes('cierre') || msg.includes('objeción'),
    esResumenViernes: new Date().getDay() === 5,
    esResumenDomingo: new Date().getDay() === 0,
    esRetrospectivaMensual: msg.includes('retrospectiva') || msg.includes('revisión del mes') || msg.includes('mes que viene'),
  };
}

/**
 * Load funnel metrics and energy average from localStorage for Coach context.
 * Called by Coach.tsx before building the system prompt.
 */
export function loadCoachExtraContext(): Pick<ContextoCoach, 'metricasEmbudoV2' | 'energiaPromedio7d'> {
  let metricasEmbudoV2: MetricaSemanaV2 | undefined;
  try {
    const saved = localStorage.getItem('tcd_metrics_v2');
    if (saved) {
      const arr = JSON.parse(saved) as MetricaSemanaV2[];
      if (arr.length > 0) metricasEmbudoV2 = arr[arr.length - 1];
    }
  } catch { /* noop */ }

  let energiaPromedio7d: number | undefined;
  try {
    const saved = localStorage.getItem('tcd_energia_promedio_7d');
    if (saved) energiaPromedio7d = parseFloat(saved);
  } catch { /* noop */ }

  return { metricasEmbudoV2, energiaPromedio7d };
}
