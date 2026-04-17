import type { ExtractedProfile } from './migrationTypes';

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

export async function extractFromText(texto: string): Promise<ExtractedProfile> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: SYSTEM_PROMPT,
      prompt: `Extrae la información de negocio de este texto y devuelve SOLO JSON:\n\n${texto}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de IA: ${response.status}`);
  }

  const { text } = await response.json();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');

  return JSON.parse(jsonMatch[0]) as ExtractedProfile;
}
