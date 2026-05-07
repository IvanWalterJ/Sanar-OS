// ═══════════════════════════════════════════════════════════════════════════
// API helpers para cliente_preactivacion_check
// Usado por PreactivacionMatriz / MatrizGrid en el panel admin.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase';
import { TOTAL_STEPS } from './preactivacionSteps';

export type ChecksByCliente = Map<string, Set<string>>;

interface CheckRow {
  cliente_id: string;
  step_id: string;
}

/**
 * Trae TODOS los rows tildados de todos los clientes.
 * Solo admins (RLS bloquea al resto). Vuelve un Map<cliente_id, Set<step_id>>.
 */
export async function loadAllChecks(): Promise<ChecksByCliente> {
  const map: ChecksByCliente = new Map();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from('cliente_preactivacion_check')
    .select('cliente_id, step_id');

  if (error) {
    throw new Error(`Error cargando checklist: ${error.message}`);
  }

  for (const row of (data ?? []) as CheckRow[]) {
    let set = map.get(row.cliente_id);
    if (!set) {
      set = new Set<string>();
      map.set(row.cliente_id, set);
    }
    set.add(row.step_id);
  }
  return map;
}

/**
 * Toggle de un paso para un cliente.
 * - on=true  → INSERT (idempotente, ignora duplicados)
 * - on=false → DELETE
 */
export async function setCheck(
  clienteId: string,
  stepId: string,
  on: boolean,
  completadoPor: string,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  if (on) {
    const { error } = await supabase
      .from('cliente_preactivacion_check')
      .upsert(
        { cliente_id: clienteId, step_id: stepId, completado_por: completadoPor },
        { onConflict: 'cliente_id,step_id', ignoreDuplicates: true },
      );
    if (error) {
      throw new Error(`Error tildando paso: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from('cliente_preactivacion_check')
      .delete()
      .match({ cliente_id: clienteId, step_id: stepId });
    if (error) {
      throw new Error(`Error destildando paso: ${error.message}`);
    }
  }
}

/** Mutación inmutable del map (devuelve uno nuevo con el toggle aplicado). */
export function applyToggle(
  checks: ChecksByCliente,
  clienteId: string,
  stepId: string,
  on: boolean,
): ChecksByCliente {
  const next = new Map(checks);
  const prevSet = next.get(clienteId);
  const nextSet = new Set(prevSet ?? []);
  if (on) nextSet.add(stepId);
  else nextSet.delete(stepId);
  if (nextSet.size === 0) next.delete(clienteId);
  else next.set(clienteId, nextSet);
  return next;
}

export function isChecked(
  checks: ChecksByCliente,
  clienteId: string,
  stepId: string,
): boolean {
  return checks.get(clienteId)?.has(stepId) ?? false;
}

export function progressPct(checks: ChecksByCliente, clienteId: string): number {
  if (TOTAL_STEPS === 0) return 0;
  const done = checks.get(clienteId)?.size ?? 0;
  return Math.round((done / TOTAL_STEPS) * 100);
}

export function completedCount(checks: ChecksByCliente, clienteId: string): number {
  return checks.get(clienteId)?.size ?? 0;
}
