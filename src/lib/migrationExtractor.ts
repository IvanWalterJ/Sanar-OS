import type { ExtractedProfile } from './migrationTypes';
import { generateText } from './aiProvider';

const SYSTEM_PROMPT = `Eres un asistente experto en extraer información de negocio de textos en español.
Dado un texto sobre un profesional de la salud o bienestar, extrae los campos disponibles y devuelve SOLO un objeto JSON válido, sin markdown ni comentarios.
Omite campos que no encuentres en el texto — nunca inventes información.

Campos disponibles (todos opcionales):
- historia_300: historia del negocio/profesional en ~300 palabras
- historia_150: versión corta en ~150 palabras
- historia_50: versión muy corta en ~50 palabras
- proposito: propósito de vida o misión del profesional
- legado: legado que quiere dejar al mundo
- matriz_a: dolores actuales de sus pacientes/clientes (qué sufren hoy)
- matriz_b: obstáculos que impiden que avancen solos (por qué no pueden sin ayuda)
- matriz_c: visión positiva del resultado o transformación que ofrece
- metodo_nombre: nombre de su método o programa propio
- metodo_pasos: pasos del método, separados por saltos de línea
- oferta_high: descripción del programa o servicio premium
- oferta_mid: descripción del programa o servicio estándar
- oferta_low: descripción del programa o servicio de entrada
- lead_magnet: descripción del lead magnet o recurso gratuito
- identidad_colores: paleta de colores de marca
- identidad_tipografia: tipografías o fuentes de marca
- identidad_logo: descripción del logo o identidad visual
- identidad_tono: tono y voz de comunicación de la marca
- nicho: nicho de mercado específico
- posicionamiento: propuesta de valor única
- por_que_oficial: el "por qué" profundo y personal del profesional`;

// La IA a veces devuelve arrays u objetos donde el schema espera string
// (ej. `metodo_pasos: ["paso 1", "paso 2"]`). Sin esta coerción, cualquier
// `.trim()` posterior crashea con `TypeError: <var>.trim is not a function`
// y tira la UI a pantalla negra.
function coerceToString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceToString(item))
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join('\n');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeExtracted(raw: unknown): ExtractedProfile {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const str = coerceToString(value);
    if (str && str.trim()) out[key] = str.trim();
  }
  return out as ExtractedProfile;
}

export async function extractFromText(texto: string): Promise<ExtractedProfile> {
  // Usa el wrapper con fallback: intenta Claude (Vercel serverless) y
  // si falla (ej. dev local sin `vercel dev`) cae a Gemini vía VITE_GEMINI_API_KEY.
  const text = await generateText({
    systemInstruction: SYSTEM_PROMPT,
    prompt: `Extrae la información de negocio de este texto y devuelve SOLO JSON:\n\n${texto}`,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('La IA devolvió JSON malformado');
  }

  return normalizeExtracted(parsed);
}
