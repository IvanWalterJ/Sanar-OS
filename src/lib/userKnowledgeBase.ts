/**
 * userKnowledgeBase.ts
 * Construye la base de conocimiento del usuario a partir de los outputs
 * aprobados en cada tarea de la Hoja de Ruta.
 *
 * No requiere RAG — el total de texto cabe en el context window de Gemini (1M tokens).
 * Inyección directa al system prompt del Coach y los Agentes.
 */

import { supabase, isSupabaseReady } from './supabase';
import { SEED_ROADMAP_V2 } from './roadmapSeed';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  pilarNumero: number;
  pilarTitulo: string;
  metaCodigo: string;
  metaTitulo: string;
  herramientaId?: string;
  texto: string;
  aprobadoEn?: string;
}

// ─── Mapa herramienta_id → meta_codigo (para el fallback de localStorage) ────

function buildHerramientaToMetaMap(): Map<string, { pilarNumero: number; metaCodigo: string }> {
  const map = new Map<string, { pilarNumero: number; metaCodigo: string }>();
  for (const pilar of SEED_ROADMAP_V2) {
    for (const meta of pilar.metas) {
      if (meta.herramienta_id) {
        map.set(meta.herramienta_id, { pilarNumero: pilar.numero, metaCodigo: meta.codigo });
      }
    }
  }
  return map;
}

// ─── Fuente 1: Supabase hoja_de_ruta.output_generado ─────────────────────────

async function fromHojaDeRuta(userId: string): Promise<KnowledgeEntry[]> {
  if (!isSupabaseReady() || !supabase) return [];

  const { data, error } = await supabase
    .from('hoja_de_ruta')
    .select('pilar_numero, meta_codigo, output_generado')
    .eq('usuario_id', userId)
    .eq('completada', true)
    .not('output_generado', 'is', null);

  if (error || !data) return [];

  const entries: KnowledgeEntry[] = [];
  for (const row of data) {
    const pilar = SEED_ROADMAP_V2.find((p) => p.numero === row.pilar_numero);
    const meta = pilar?.metas.find((m) => m.codigo === row.meta_codigo);
    if (!pilar || !meta) continue;

    const output = row.output_generado as Record<string, unknown>;
    const texto = typeof output.texto === 'string' ? output.texto : '';
    if (!texto) continue;

    entries.push({
      pilarNumero: pilar.numero,
      pilarTitulo: pilar.titulo,
      metaCodigo: meta.codigo,
      metaTitulo: meta.titulo,
      herramientaId: meta.herramienta_id,
      texto,
      aprobadoEn: typeof output.aprobado_en === 'string' ? output.aprobado_en : undefined,
    });
  }

  return entries;
}

// ─── Fuente 2: Supabase herramientas_outputs (outputs guardados sin vincular) ─

async function fromHerramientasOutputs(userId: string): Promise<KnowledgeEntry[]> {
  if (!isSupabaseReady() || !supabase) return [];

  const { data, error } = await supabase
    .from('herramientas_outputs')
    .select('herramienta_id, output')
    .eq('usuario_id', userId);

  if (error || !data) return [];

  const hMap = buildHerramientaToMetaMap();
  const entries: KnowledgeEntry[] = [];

  for (const row of data) {
    const ref = hMap.get(row.herramienta_id);
    if (!ref) continue;

    const pilar = SEED_ROADMAP_V2.find((p) => p.numero === ref.pilarNumero);
    const meta = pilar?.metas.find((m) => m.codigo === ref.metaCodigo);
    if (!pilar || !meta) continue;

    const output = row.output as Record<string, unknown>;
    const texto = typeof output.texto === 'string' ? output.texto : '';
    if (!texto) continue;

    entries.push({
      pilarNumero: pilar.numero,
      pilarTitulo: pilar.titulo,
      metaCodigo: meta.codigo,
      metaTitulo: meta.titulo,
      herramientaId: row.herramienta_id,
      texto,
    });
  }

  return entries;
}

// ─── Fuente 3: localStorage tcd_herramienta_* (fallback offline) ──────────────

function fromLocalStorage(): KnowledgeEntry[] {
  const hMap = buildHerramientaToMetaMap();
  const entries: KnowledgeEntry[] = [];

  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('tcd_herramienta_'));
    for (const key of keys) {
      const herramientaId = key.replace('tcd_herramienta_', '');
      const ref = hMap.get(herramientaId);
      if (!ref) continue;

      const pilar = SEED_ROADMAP_V2.find((p) => p.numero === ref.pilarNumero);
      const meta = pilar?.metas.find((m) => m.codigo === ref.metaCodigo);
      if (!pilar || !meta) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const texto = typeof parsed.texto === 'string' ? parsed.texto : '';
      if (!texto) continue;

      entries.push({
        pilarNumero: pilar.numero,
        pilarTitulo: pilar.titulo,
        metaCodigo: meta.codigo,
        metaTitulo: meta.titulo,
        herramientaId,
        texto,
      });
    }
  } catch { /* noop */ }

  return entries;
}

// ─── Deduplicar por meta_codigo (prioridad: hoja_de_ruta > herramientas_outputs > localStorage) ──

function deduplicar(all: KnowledgeEntry[]): KnowledgeEntry[] {
  const seen = new Map<string, KnowledgeEntry>();
  for (const entry of all) {
    const key = `${entry.pilarNumero}-${entry.metaCodigo}`;
    if (!seen.has(key)) seen.set(key, entry);
  }
  // Ordenar por pilar + meta
  return [...seen.values()].sort((a, b) =>
    a.pilarNumero !== b.pilarNumero
      ? a.pilarNumero - b.pilarNumero
      : a.metaCodigo.localeCompare(b.metaCodigo),
  );
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Construye la base de conocimiento del usuario como texto formateado
 * listo para inyectar en el system prompt del Coach o los Agentes.
 *
 * Si no hay outputs guardados, devuelve string vacío.
 */
export async function getUserKnowledgeBase(userId?: string): Promise<string> {
  let all: KnowledgeEntry[] = [];

  if (userId) {
    const [fromHR, fromHO] = await Promise.all([
      fromHojaDeRuta(userId),
      fromHerramientasOutputs(userId),
    ]);
    all = [...fromHR, ...fromHO, ...fromLocalStorage()];
  } else {
    all = fromLocalStorage();
  }

  const entries = deduplicar(all);
  if (entries.length === 0) return '';

  // Agrupar por pilar
  const byPilar = new Map<number, KnowledgeEntry[]>();
  for (const e of entries) {
    if (!byPilar.has(e.pilarNumero)) byPilar.set(e.pilarNumero, []);
    byPilar.get(e.pilarNumero)!.push(e);
  }

  const sections: string[] = [
    '=== BASE DE CONOCIMIENTO DEL PROFESIONAL ===',
    'Documentos generados con herramientas IA en cada tarea completada.',
    'Usá esta información para personalizar absolutamente todo lo que respondés.',
    '',
  ];

  for (const [pilarNum, pilarEntries] of [...byPilar.entries()].sort((a, b) => a[0] - b[0])) {
    const pilarTitulo = pilarEntries[0].pilarTitulo;
    sections.push(`## Pilar ${pilarNum} — ${pilarTitulo}`);
    for (const entry of pilarEntries) {
      sections.push(`### ${entry.metaCodigo}: ${entry.metaTitulo}`);
      sections.push(entry.texto.trim());
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Versión síncrona — solo lee localStorage.
 * Útil para componentes que no pueden usar async en el render inicial.
 */
export function getUserKnowledgeBaseSync(): string {
  const entries = deduplicar(fromLocalStorage());
  if (entries.length === 0) return '';

  const sections: string[] = [
    '=== BASE DE CONOCIMIENTO DEL PROFESIONAL ===',
    '',
  ];

  for (const entry of entries) {
    sections.push(`### ${entry.metaCodigo}: ${entry.metaTitulo}`);
    sections.push(entry.texto.trim());
    sections.push('');
  }

  return sections.join('\n');
}
