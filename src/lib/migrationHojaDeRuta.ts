import { SEED_ROADMAP_V3 } from './roadmapSeed';
import type { ExtractedProfile } from './migrationTypes';

export interface HojaDeRutaSeedRow {
  pilar_numero: number;
  meta_codigo: string;
  completada: boolean;
  es_estrella: boolean;
  output_generado: { texto: string; migrated: true } | null;
  fecha_completada: string | null;
}

// Mapea cada `adn_field` del seed a uno o más campos de ExtractedProfile.
// Campos sin entrada acá quedan sin output (solo se marca completada para progreso).
type AdnMapping = keyof ExtractedProfile | (keyof ExtractedProfile)[];

const ADN_FIELD_TO_EXTRACTED: Record<string, AdnMapping> = {
  historia_300: 'historia_300',
  proposito: 'proposito',
  legado: 'legado',
  matriz_a: 'matriz_a',
  metodo_nombre: ['metodo_nombre', 'metodo_pasos'],
  oferta_mid: 'oferta_mid',
  oferta_high: ['oferta_high', 'oferta_low', 'lead_magnet'],
  adn_nicho: ['nicho', 'posicionamiento'],
  adn_identidad_sistema: [
    'identidad_colores',
    'identidad_tipografia',
    'identidad_logo',
    'identidad_tono',
  ],
};

function formatLabel(key: keyof ExtractedProfile): string {
  return key.toUpperCase().replace(/_/g, ' ');
}

function buildOutputForMeta(
  adnField: string,
  extracted: ExtractedProfile,
): string | null {
  // Caso especial: historia combina 3 versiones con los delimitadores que
  // ManualNegocio.tsx parsea (regex "--- HISTORIA 300 PALABRAS ---" etc.)
  if (adnField === 'historia_300') {
    const h300 = extracted.historia_300?.trim();
    const h150 = extracted.historia_150?.trim();
    const h50 = extracted.historia_50?.trim();
    if (!h300 && !h150 && !h50) return null;
    const parts: string[] = [];
    if (h300) parts.push(`--- HISTORIA 300 PALABRAS ---\n${h300}`);
    if (h150) parts.push(`--- HISTORIA 150 PALABRAS ---\n${h150}`);
    if (h50) parts.push(`--- HISTORIA 50 PALABRAS ---\n${h50}`);
    return parts.join('\n\n');
  }

  const mapping = ADN_FIELD_TO_EXTRACTED[adnField];
  if (!mapping) return null;

  if (typeof mapping === 'string') {
    const v = extracted[mapping]?.trim();
    return v ? v : null;
  }

  const parts: string[] = [];
  for (const k of mapping) {
    const v = extracted[k]?.trim();
    if (v) parts.push(`${formatLabel(k)}:\n${v}`);
  }
  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * Construye las filas de `hoja_de_ruta` a insertar cuando se migra un cliente.
 * Marca como completadas todas las metas de pilares ANTERIORES al pilar actual
 * (usando `numero_orden` para progreso secuencial real), inyectando los outputs
 * ADN extraídos por la IA en las metas que tienen `adn_field`.
 */
export function buildHojaDeRutaFromExtracted(
  pilarActualOrden: number,
  extracted: ExtractedProfile,
): HojaDeRutaSeedRow[] {
  const rows: HojaDeRutaSeedRow[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const pilar of SEED_ROADMAP_V3) {
    if (pilar.numero_orden >= pilarActualOrden) continue;
    for (const meta of pilar.metas) {
      const texto = meta.adn_field ? buildOutputForMeta(meta.adn_field, extracted) : null;
      rows.push({
        pilar_numero: pilar.numero,
        meta_codigo: meta.codigo,
        completada: true,
        es_estrella: meta.es_estrella,
        output_generado: texto ? { texto, migrated: true } : null,
        fecha_completada: today,
      });
    }
  }

  return rows;
}

/** Options para el selector de pilar en el MigrationWizard. */
export interface PilarOption {
  value: string;       // stringified numero_orden
  label: string;       // "P3 — Legado"
  numero: number;      // para guardar en profile.pilar_actual (backcompat)
  numero_orden: number;
}

export function getPilarOptions(): PilarOption[] {
  return SEED_ROADMAP_V3.map(p => ({
    value: String(p.numero_orden),
    label: `${p.id} — ${p.titulo}`,
    numero: p.numero,
    numero_orden: p.numero_orden,
  }));
}
