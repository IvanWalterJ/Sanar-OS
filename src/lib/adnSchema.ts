/**
 * Schema ADN v7 · Método CLÍNICA
 *
 * Agrupa los 56 campos del ADN del Negocio en 7 secciones según el documento maestro v7:
 *   - ID  (Identidad)         · transversal · P1-P3
 *   - META (Meta/Onboarding)  · P0
 *   - IRR (Irresistible)      · P4-P7
 *   - NEG (Negocio)           · P7-P8
 *   - INF (Infraestructura)   · P9A + P10
 *   - CAP (Captación)         · P9B-P9C
 *   - MET (Métricas)          · P11
 *
 * Los campos existentes en ProfileV2 se mapean por `profileKey`. Los campos que
 * viven dentro de objetos JSON (ej. `adn_avatar.dolores`) usan `profilePath`.
 * Los campos nuevos del v7 que todavía no existen en DB se marcan con `pending: true`
 * hasta que la migración SQL los agregue.
 */

import type { ProfileV2 } from './supabase';

export type ADNSeccionCodigo = 'ID' | 'META' | 'IRR' | 'NEG' | 'INF' | 'CAP' | 'MET';

export interface ADNCampo {
  /** Código único del campo en v7 (usado en copy y glosario). */
  codigo: string;
  /** Label visible al usuario. */
  label: string;
  /** Pilar de origen (P0.2, P1.2, etc). */
  pilarOrigen: string;
  /** Nombre de la columna en ProfileV2 (si aplica). */
  profileKey?: keyof ProfileV2;
  /** Path de extracción para campos anidados en JSON (ej. "adn_avatar.dolores"). */
  profilePath?: string;
  /** true si todavía no hay columna en DB (esperando migración). */
  pending?: boolean;
  /** Campos obligatorios para la verificación del Día 45 (Sprint 6B). */
  criticoDia45?: boolean;
}

export interface ADNSeccion {
  codigo: ADNSeccionCodigo;
  titulo: string;
  subtitulo: string;
  pilarRange: string;
  campos: ADNCampo[];
}

/**
 * Schema completo v7 · 56 campos agrupados en 7 secciones.
 * Ver Anexo C del documento maestro v7 para el glosario.
 */
export const ADN_SCHEMA_V7: ADNSeccion[] = [
  // ─── ID · Identidad transversal · P1-P3 ────────────────────────────────────
  {
    codigo: 'ID',
    titulo: 'Identidad',
    subtitulo: 'Tu voz. Atraviesa todo el sistema.',
    pilarRange: 'P1-P3',
    campos: [
      { codigo: 'ID.linea_tiempo_7_puntos', label: 'Línea de tiempo vital (7 puntos)', pilarOrigen: 'P1.2', profileKey: 'adn_linea_tiempo' },
      { codigo: 'ID.historia_larga_300', label: 'Historia larga (~300 palabras)', pilarOrigen: 'P1.3', profileKey: 'historia_300', criticoDia45: true },
      { codigo: 'ID.historia_media_150', label: 'Historia media (~150 palabras)', pilarOrigen: 'P1.3', profileKey: 'historia_150' },
      { codigo: 'ID.historia_corta_50', label: 'Historia corta (~50 palabras)', pilarOrigen: 'P1.3', profileKey: 'historia_50' },
      { codigo: 'ID.cinco_por_que', label: 'Los 5 por qué', pilarOrigen: 'P2.2', profileKey: 'adn_cinco_por_que' },
      { codigo: 'ID.proposito_parrafo', label: 'Propósito (párrafo)', pilarOrigen: 'P2.3', profileKey: 'proposito' },
      { codigo: 'ID.proposito_frase', label: 'Propósito (frase corta)', pilarOrigen: 'P2.3', profileKey: 'proposito', criticoDia45: true },
      { codigo: 'ID.carta_futuro_2036', label: 'Carta al yo de 2036', pilarOrigen: 'P3.2', profileKey: 'adn_carta_futuro' },
      { codigo: 'ID.legado_declaracion', label: 'Declaración de legado', pilarOrigen: 'P3.3', profileKey: 'legado', criticoDia45: true },
    ],
  },

  // ─── META · Onboarding · P0 ────────────────────────────────────────────────
  {
    codigo: 'META',
    titulo: 'Meta',
    subtitulo: 'El snapshot con el que entraste.',
    pilarRange: 'P0',
    campos: [
      { codigo: 'META.profesion', label: 'Profesión / especialidad', pilarOrigen: 'P0.1', profileKey: 'especialidad' },
      { codigo: 'META.anios_experiencia', label: 'Años de experiencia', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.anios_experiencia' },
      { codigo: 'META.pacientes_actuales', label: 'Pacientes activos', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.pacientes_actuales' },
      { codigo: 'META.facturacion_rango', label: 'Rango de facturación', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.facturacion_rango' },
      { codigo: 'META.frustracion_actual', label: 'Frustración principal hoy', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.frustracion_actual' },
      { codigo: 'META.vision_90_dias', label: 'Visión 90 días', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.vision_90_dias' },
      { codigo: 'META.horas_disponibles', label: 'Horas disponibles / día', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.horas_disponibles' },
      { codigo: 'META.experiencia_digital', label: 'Experiencia digital previa', pilarOrigen: 'P0.1', profilePath: 'adn_formulario_bienvenida.experiencia_digital' },
    ],
  },

  // ─── IRR · Irresistible · P4-P7 ────────────────────────────────────────────
  {
    codigo: 'IRR',
    titulo: 'Irresistible',
    subtitulo: 'A quién le hablás y por qué te eligen a vos.',
    pilarRange: 'P4-P7',
    campos: [
      { codigo: 'IRR.avatar_demografia', label: 'Avatar · demografía', pilarOrigen: 'P4.3', profilePath: 'adn_avatar.edad', criticoDia45: true },
      { codigo: 'IRR.avatar_psicografia', label: 'Avatar · psicografía', pilarOrigen: 'P4.3', profilePath: 'adn_avatar.dolores', criticoDia45: true },
      { codigo: 'IRR.avatar_journey', label: 'Avatar · journey', pilarOrigen: 'P4.3', profileKey: 'adn_avatar_journey', pending: true },
      { codigo: 'IRR.avatar_objeciones', label: 'Avatar · objeciones', pilarOrigen: 'P4.3', profilePath: 'adn_avatar.objeciones' },
      { codigo: 'IRR.nicho', label: 'Nicho', pilarOrigen: 'P5.2', profileKey: 'adn_nicho' },
      { codigo: 'IRR.micronicho', label: 'Micronicho', pilarOrigen: 'P5.2', profileKey: 'adn_micronicho', pending: true, criticoDia45: true },
      { codigo: 'IRR.puv', label: 'PUV (Propuesta Única de Valor)', pilarOrigen: 'P5.3', profileKey: 'adn_usp', criticoDia45: true },
      { codigo: 'IRR.transformaciones_lista', label: 'Lista de transformaciones', pilarOrigen: 'P5.4', profileKey: 'adn_transformaciones' },
      { codigo: 'IRR.matriz_a_infierno', label: 'Matriz A · el infierno', pilarOrigen: 'P6.2', profileKey: 'matriz_a', criticoDia45: true },
      { codigo: 'IRR.matriz_b_obstaculos', label: 'Matriz B · los obstáculos', pilarOrigen: 'P6.3', profileKey: 'matriz_b' },
      { codigo: 'IRR.matriz_c_cielo', label: 'Matriz C · el cielo', pilarOrigen: 'P6.4', profileKey: 'matriz_c', criticoDia45: true },
      { codigo: 'IRR.metodo_nombre', label: 'Nombre del método propio', pilarOrigen: 'P7.2', profileKey: 'metodo_nombre', criticoDia45: true },
      { codigo: 'IRR.metodo_pasos', label: 'Pasos del método (3-7)', pilarOrigen: 'P7.3', profileKey: 'metodo_pasos', criticoDia45: true },
    ],
  },

  // ─── NEG · Negocio · P7-P8 ─────────────────────────────────────────────────
  {
    codigo: 'NEG',
    titulo: 'Negocio',
    subtitulo: 'Tus ofertas y la matemática que cierra.',
    pilarRange: 'P7-P8',
    campos: [
      { codigo: 'NEG.proceso_actual', label: 'Proceso actual documentado', pilarOrigen: 'P7.4', profileKey: 'adn_proceso_actual' },
      { codigo: 'NEG.oferta_mid', label: 'Oferta Mid ($1.5K-3K)', pilarOrigen: 'P8.2', profileKey: 'oferta_mid', criticoDia45: true },
      { codigo: 'NEG.oferta_high', label: 'Oferta High ($3K+)', pilarOrigen: 'P8.3', profileKey: 'oferta_high' },
      { codigo: 'NEG.oferta_low', label: 'Oferta Low ($297)', pilarOrigen: 'P8.4', profileKey: 'oferta_low' },
      { codigo: 'NEG.lead_magnet', label: 'Lead Magnet ($0)', pilarOrigen: 'P8.5', profileKey: 'lead_magnet' },
      { codigo: 'NEG.escenarios_roas', label: 'Escenarios ROAS ($10K)', pilarOrigen: 'P8.6', profileKey: 'adn_escenarios_roas', pending: true },
    ],
  },

  // ─── INF · Infraestructura · P9A + P10 ─────────────────────────────────────
  {
    codigo: 'INF',
    titulo: 'Infraestructura',
    subtitulo: 'El embudo técnico y la identidad visual.',
    pilarRange: 'P9A + P10',
    campos: [
      { codigo: 'INF.landing_copy_completo', label: 'Copy completo de landing', pilarOrigen: 'P9A.2', profileKey: 'adn_landing_copy' },
      { codigo: 'INF.vsl_script', label: 'Script del VSL', pilarOrigen: 'P9A.2', profileKey: 'adn_vsl_script', pending: true },
      { codigo: 'INF.anuncios_meta_6_creativos', label: 'Anuncios Meta · 6 creativos N1/N2/N3', pilarOrigen: 'P9A.3', profileKey: 'adn_anuncios' },
      { codigo: 'INF.meta_config', label: 'Configuración Meta Ads', pilarOrigen: 'P9A.4', profileKey: 'adn_meta_config', pending: true },
      { codigo: 'INF.skool_setup', label: 'Setup Skool (Free + Paid)', pilarOrigen: 'P9A.5', profileKey: 'adn_skool_setup', pending: true },
      { codigo: 'INF.paleta_colores', label: 'Paleta de colores', pilarOrigen: 'P10.2', profileKey: 'identidad_colores' },
      { codigo: 'INF.tipografias', label: 'Tipografías', pilarOrigen: 'P10.2', profileKey: 'identidad_tipografia' },
      { codigo: 'INF.templates_canva', label: 'Templates en Canva (10-15)', pilarOrigen: 'P10.3', profileKey: 'adn_templates_canva', pending: true },
      { codigo: 'INF.creativos_v2_con_identidad', label: 'Creativos v2 con identidad aplicada', pilarOrigen: 'P10.4', profileKey: 'adn_creativos_v2', pending: true },
    ],
  },

  // ─── CAP · Captación · P9B-P9C ─────────────────────────────────────────────
  {
    codigo: 'CAP',
    titulo: 'Captación',
    subtitulo: 'Cómo convertís mensajes en ventas.',
    pilarRange: 'P9B-P9C',
    campos: [
      { codigo: 'CAP.script_venta_W', label: 'Script de venta · la W', pilarOrigen: 'P9B.3', profileKey: 'script_venta' },
      { codigo: 'CAP.triage_audios_5', label: 'Triage WhatsApp · 5 audios', pilarOrigen: 'P9B.2', profileKey: 'adn_triage_audios', pending: true },
      { codigo: 'CAP.masterclass_estructura', label: 'Masterclass · 90 min · 5 bloques', pilarOrigen: 'P9B.4', profileKey: 'adn_masterclass_estructura', pending: true },
      { codigo: 'CAP.protocolo_entrega', label: 'Protocolo de entrega post-venta', pilarOrigen: 'P9B.5', profileKey: 'adn_protocolo_servicio' },
      { codigo: 'CAP.emails_nurture_6', label: 'Secuencia 6 emails · 28 días', pilarOrigen: 'P9C.2', profileKey: 'adn_emails_nurture', pending: true },
      { codigo: 'CAP.plan_contenido_semanal', label: 'Plan de contenido semanal (Mar N1 · Jue N2 · Sáb N3)', pilarOrigen: 'P9C.3', profileKey: 'adn_plan_contenido_semanal', pending: true },
      { codigo: 'CAP.retargeting_config', label: 'Configuración de retargeting', pilarOrigen: 'P9C.4', profileKey: 'adn_retargeting_config', pending: true },
    ],
  },

  // ─── MET · Métricas · P11 ──────────────────────────────────────────────────
  {
    codigo: 'MET',
    titulo: 'Métricas',
    subtitulo: 'El cierre del ciclo y el plan del siguiente.',
    pilarRange: 'P11',
    campos: [
      { codigo: 'MET.tablero_cierre_ciclo', label: 'Tablero de cierre del ciclo', pilarOrigen: 'P11.1', profileKey: 'adn_tablero_cierre', pending: true },
      { codigo: 'MET.retrospectiva_documentada', label: 'Retrospectiva documentada', pilarOrigen: 'P11.2', profileKey: 'adn_retrospectiva', pending: true },
      { codigo: 'MET.plan_ciclo_2', label: 'Plan del ciclo 2 (Consolidar / Optimizar / Escalar)', pilarOrigen: 'P11.3', profileKey: 'adn_plan_ciclo_2', pending: true },
      { codigo: 'MET.masterclass_analytics', label: 'Masterclass Analytics', pilarOrigen: 'P11.4', profileKey: 'adn_masterclass_analytics', pending: true },
    ],
  },
];

/** Campos críticos que se verifican el Día 45 (Anexo D del v7). */
export const CAMPOS_CRITICOS_DIA_45: string[] = ADN_SCHEMA_V7
  .flatMap((seccion) => seccion.campos)
  .filter((c) => c.criticoDia45)
  .map((c) => c.codigo);

/** Extrae el valor de un campo del perfil, soportando paths anidados. */
export function getADNValor(perfil: Partial<ProfileV2>, campo: ADNCampo): unknown {
  if (campo.profileKey) {
    return perfil[campo.profileKey];
  }
  if (campo.profilePath) {
    const partes = campo.profilePath.split('.');
    let cursor: unknown = perfil;
    for (const parte of partes) {
      if (cursor === null || cursor === undefined) return undefined;
      if (typeof cursor !== 'object') return undefined;
      cursor = (cursor as Record<string, unknown>)[parte];
    }
    return cursor;
  }
  return undefined;
}

/** Devuelve true si el campo tiene valor válido en el perfil. */
export function campoEstaCompleto(perfil: Partial<ProfileV2>, campo: ADNCampo): boolean {
  const valor = getADNValor(perfil, campo);
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim().length > 0;
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'object') return Object.keys(valor).length > 0;
  if (typeof valor === 'number') return true;
  if (typeof valor === 'boolean') return true;
  return false;
}

/** Calcula el porcentaje de completitud de una sección del ADN. */
export function calcularCompletitudSeccion(
  perfil: Partial<ProfileV2>,
  seccion: ADNSeccion,
): { completos: number; total: number; porcentaje: number } {
  const completos = seccion.campos.filter((c) => campoEstaCompleto(perfil, c)).length;
  const total = seccion.campos.length;
  const porcentaje = total === 0 ? 0 : Math.round((completos / total) * 100);
  return { completos, total, porcentaje };
}

/** Porcentaje de completitud del ADN completo. */
export function calcularCompletitudTotal(perfil: Partial<ProfileV2>): {
  completos: number;
  total: number;
  porcentaje: number;
} {
  const todosLosCampos = ADN_SCHEMA_V7.flatMap((s) => s.campos);
  const completos = todosLosCampos.filter((c) => campoEstaCompleto(perfil, c)).length;
  const total = todosLosCampos.length;
  const porcentaje = total === 0 ? 0 : Math.round((completos / total) * 100);
  return { completos, total, porcentaje };
}
