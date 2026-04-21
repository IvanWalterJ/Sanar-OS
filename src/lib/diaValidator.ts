/**
 * diaValidator.ts — Validador del Día 45 (Regla #5 v7)
 *
 * El día 45 es el "punto de no retorno": al cerrar Fase 3 (P8) el ADN debe tener
 * los campos críticos completos. Si el usuario intenta avanzar a Fase 4 con
 * el ADN incompleto a partir del día 45, la app muestra un banner bloqueando
 * el avance y listando qué campos faltan y en qué pilar se completan.
 *
 * Los campos críticos están definidos en `ADN_SCHEMA_V7` con `criticoDia45: true`
 * y se exportan como `CAMPOS_CRITICOS_DIA_45`. Ver Anexo D del documento maestro v7.
 */

import type { ProfileV2 } from './supabase';
import {
  ADN_SCHEMA_V7,
  campoEstaCompleto,
  type ADNCampo,
} from './adnSchema';

export const DIA_PUNTO_DE_NO_RETORNO = 45;

export interface ValidacionDia45 {
  /** true si todos los campos críticos están completos. */
  ok: boolean;
  /** true si el usuario ya está en Día 45 o después. */
  esDespuesDelDia45: boolean;
  /** Campos que faltan completar (cuando ok === false). */
  camposFaltantes: ADNCampo[];
  /** Porcentaje de campos críticos completados. */
  porcentajeCompleto: number;
  /**
   * true si la Fase 4 debe estar bloqueada: está después del día 45 y tiene
   * campos críticos incompletos.
   */
  debeBloquearFase4: boolean;
}

/**
 * Devuelve los campos del ADN marcados como críticos para el Día 45.
 * Reutiliza la bandera `criticoDia45` del schema v7 (Sprint 3).
 */
export function obtenerCamposCriticosDia45(): ADNCampo[] {
  return ADN_SCHEMA_V7
    .flatMap((seccion) => seccion.campos)
    .filter((c) => c.criticoDia45);
}

/**
 * Valida el estado del ADN respecto al umbral del Día 45.
 *
 * @param perfil    perfil del usuario (puede ser parcial)
 * @param diaActual día del programa (1-90); si es undefined asume el día actual
 *                  no es relevante y solo mira los campos
 */
export function validarADNDia45(
  perfil: Partial<ProfileV2>,
  diaActual?: number,
): ValidacionDia45 {
  const criticos = obtenerCamposCriticosDia45();
  const completos = criticos.filter((c) => campoEstaCompleto(perfil, c));
  const faltantes = criticos.filter((c) => !campoEstaCompleto(perfil, c));

  const porcentaje = criticos.length === 0
    ? 100
    : Math.round((completos.length / criticos.length) * 100);

  const esDespues = typeof diaActual === 'number' && diaActual >= DIA_PUNTO_DE_NO_RETORNO;
  const ok = faltantes.length === 0;

  return {
    ok,
    esDespuesDelDia45: esDespues,
    camposFaltantes: faltantes,
    porcentajeCompleto: porcentaje,
    debeBloquearFase4: esDespues && !ok,
  };
}

/**
 * Agrupa los campos faltantes por el pilar de origen, para mostrarle al usuario
 * a dónde tiene que volver para completar cada uno.
 */
export function agruparFaltantesPorPilar(
  faltantes: ADNCampo[],
): Array<{ pilar: string; campos: ADNCampo[] }> {
  const grupos = new Map<string, ADNCampo[]>();
  for (const campo of faltantes) {
    // "P5.2" → "P5"
    const pilar = campo.pilarOrigen.split('.')[0];
    const actual = grupos.get(pilar) ?? [];
    actual.push(campo);
    grupos.set(pilar, actual);
  }
  return Array.from(grupos.entries())
    .map(([pilar, campos]) => ({ pilar, campos }))
    .sort((a, b) => a.pilar.localeCompare(b.pilar));
}
