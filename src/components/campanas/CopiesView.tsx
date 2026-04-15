/**
 * CopiesView.tsx — Modulo de generacion de copies para Meta Ads
 * Split layout: form izquierda + output streaming derecha
 */
import React, { useState, useCallback } from 'react';
import { PenTool, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { streamText } from '../../lib/aiProvider';
import { adnContext } from '../../lib/campanasPrompts';
import type { ProfileV2 } from '../../lib/supabase';
import type { AnguloCreativo, TipoCreativo } from '../../lib/campanasTypes';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

const TIPOS: { value: TipoCreativo; label: string }[] = [
  { value: 'imagen_single', label: 'Imagen unica' },
  { value: 'carrusel', label: 'Carrusel' },
];

const TONOS: { value: AnguloCreativo; label: string }[] = [
  { value: 'contraintuitivo', label: 'Contraintuitivo' },
  { value: 'emocional', label: 'Empatico' },
  { value: 'autoridad', label: 'Autoridad' },
  { value: 'dolor', label: 'Urgencia' },
  { value: 'deseo', label: 'Prueba social' },
  { value: 'directo', label: 'Directo' },
  { value: 'curiosidad', label: 'Curiosidad' },
];

const VARIANTES = ['3 variantes', '5 variantes', '10 variantes'];

interface Props {
  perfil: Partial<ProfileV2>;
}

export default function CopiesView({ perfil }: Props) {
  const [rubro, setRubro] = useState(perfil.especialidad ?? '');
  const [pais, setPais] = useState('');
  const [producto, setProducto] = useState('');
  const [tipo, setTipo] = useState<TipoCreativo>('imagen_single');
  const [tono, setTono] = useState<AnguloCreativo>('contraintuitivo');
  const [variantes, setVariantes] = useState('3 variantes');
  const [output, setOutput] = useState('');
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const handleGenerar = useCallback(async () => {
    if (!rubro.trim()) {
      toast.error('Completa el rubro / especialidad.');
      return;
    }
    setGenerando(true);
    setOutput('');

    const cantVariantes = parseInt(variantes) || 3;
    const adnBlock = perfil.adn_avatar ? `\n\n${adnContext(perfil)}` : '';
    const oferta = producto || perfil.oferta_high || perfil.oferta_mid || 'Consulta gratuita';

    const baseContext = `Eres un copywriter de elite especializado en Meta Ads para profesionales de la salud.
${adnBlock}

RUBRO / ESPECIALIDAD: ${rubro}
PAIS / CIUDAD: ${pais || 'Argentina'}
OFERTA: ${oferta}
TONO / ANGULO: ${tono}`;

    const carruselPrompt = `${baseContext}

TIPO DE ANUNCIO: Carrusel de Meta Ads (Instagram/Facebook)

Tu tarea: armar UN SOLO carrusel bien trabajado (NO variantes). Vos decidis cuantos slides necesita el carrusel para contar la historia completa, con un MAXIMO ABSOLUTO de 10 slides. Usa la cantidad minima necesaria — si la idea cierra en 6, usa 6.

ESTRUCTURA DEL CARRUSEL:
- Slide 1: HOOK que frena el scroll (puede ser una afirmacion contraintuitiva, una pregunta, un dato impactante)
- Slides intermedios: desarrollo del argumento. Una idea por slide. Sin relleno.
- Slide final (ULTIMO): CTA con PALABRA CLAVE para activar automatizacion en ManyChat. Ejemplo: "Comenta la palabra GUIA y te mando el recurso por DM". La palabra clave debe ser corta, en mayusculas y memorable.

FORMATO DE RESPUESTA (Markdown — respeta esta estructura EXACTA):

## Carrusel — ${tono.toUpperCase()}
**Cantidad de slides:** [N] (entre 4 y 10)

---

### SLIDE 1 — Hook
- **H1:** [titulo principal, 4-7 palabras, dominante]
- **H2:** [subtitulo de apoyo, 6-10 palabras]
- **H3 (opcional):** [detalle terciario si suma]
- **Copy del slide (texto sobre la imagen):** [lo que se va a leer en el diseño]
- **Notas visuales:** [breve indicacion de tono visual o elemento clave]

---

### SLIDE 2 — [titulo de la idea]
[mismos campos: H1, H2, H3 si suma, Copy del slide, Notas visuales]

---

[... repetir hasta el slide final]

---

### SLIDE [N] — CTA + Palabra clave ManyChat
- **H1:** [CTA principal corto y accionable]
- **H2:** [refuerzo del beneficio inmediato]
- **H3 (opcional):** [recordatorio de escasez o urgencia si aplica]
- **Copy del slide:** [llamada explicita: "Comenta la palabra X y te mando Y por DM"]
- **PALABRA CLAVE MANYCHAT:** \`[PALABRA]\` (en mayusculas, una sola palabra, facil de tipear)
- **Mensaje de respuesta automatica sugerido:** [1-2 lineas que ManyChat enviara cuando detecte la palabra clave]

---

## Texto principal del posteo (caption del carrusel)
[2-3 parrafos, maximo 220 palabras. Hook + desarrollo + CTA repitiendo la palabra clave del ultimo slide. Maximo 3 emojis estrategicos.]

REGLAS:
- Usa el LENGUAJE EXACTO del avatar si esta disponible
- Tono profesional pero cercano, en espanol
- NO uses jerga medica compleja
- Cada slide debe poder leerse SOLO en 2 segundos
- La palabra clave del slide final DEBE coincidir con la del caption`;

    const imagenPrompt = `${baseContext}

TIPO DE ANUNCIO: Imagen unica para Meta Ads (Instagram/Facebook)
CANTIDAD DE VARIANTES: ${cantVariantes}

Genera ${cantVariantes} variantes de copy. Cada variante incluye TANTO el copy que va dentro de la imagen (con jerarquia tipografica) COMO el texto principal del posteo.

FORMATO DE RESPUESTA (Markdown — respeta esta estructura EXACTA por cada variante):

## Variante 1 — [enfoque corto, 3-5 palabras]

### Copy en la imagen
- **H1:** [titulo principal, 3-6 palabras, dominante visual]
- **H2:** [subtitulo de apoyo, 5-8 palabras]
- **H3 (opcional):** [detalle terciario si suma]
- **CTA en la imagen:** [boton, 2-4 palabras, accionable]

### Texto principal del posteo
[2-4 parrafos, maximo 300 palabras. Hook + desarrollo + CTA. Maximo 3-4 emojis estrategicos.]

### Datos para Meta Ads
- **Titulo (headline):** [max 40 caracteres]
- **Descripcion:** [max 90 caracteres]
- **Boton CTA:** [Mas informacion / Reservar / Enviar mensaje / etc.]

---

[Repetir para cada variante separando con ---]

REGLAS:
- Cada variante debe tener un enfoque DIFERENTE entre si (no repetir hooks)
- Usa el LENGUAJE EXACTO del avatar si esta disponible
- El H1 de la imagen debe frenar el scroll en 1-2 segundos
- Tono profesional pero accesible, en espanol
- NO uses jerga medica compleja`;

    const prompt = tipo === 'carrusel' ? carruselPrompt : imagenPrompt;

    try {
      let textoCompleto = '';
      for await (const chunk of streamText({ prompt })) {
        textoCompleto += chunk;
        setOutput(textoCompleto);
      }
    } catch {
      toast.error('Error al generar copies. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  }, [rubro, pais, producto, tipo, tono, variantes]);

  const handleCopiar = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopiado(true);
    toast.success('Copies copiados al portapapeles.');
    setTimeout(() => setCopiado(false), 2000);
  }, [output]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Modulo directo
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          Generar{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            copies
          </span>
        </h2>
        <p className="text-xs text-[#FFFFFF]/40 mt-1">
          Sin pasar por el flujo completo. Completas los datos y los copies salen listos.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Form izquierdo */}
        <div className="lg:w-[380px] lg:min-w-[380px] card-panel p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Rubro / especialidad
            </label>
            <input
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20"
              placeholder="Ej: Psicologa especializada en burnout"
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Pais / ciudad
            </label>
            <input
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20"
              placeholder="Ej: Buenos Aires, Argentina"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Que se ofrece?
            </label>
            <textarea
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all resize-none placeholder-[#FFFFFF]/20"
              rows={3}
              placeholder="Ej: Auditoria gratuita de 45 min. Sin costo. 5 cupos por semana."
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
            />
          </div>

          {/* Tipo chips */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Tipo de anuncio
            </label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    tipo === t.value
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]'
                      : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tono chips */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Tono
            </label>
            <div className="flex flex-wrap gap-2">
              {TONOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTono(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    tono === t.value
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]'
                      : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variantes chips — solo para imagen unica */}
          {tipo === 'imagen_single' ? (
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
                Variantes
              </label>
              <div className="flex flex-wrap gap-2">
                {VARIANTES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariantes(v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      variantes === v
                        ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]'
                        : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(245,166,35,0.2)] bg-[#F5A623]/5 p-3">
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#F5A623] mb-1">
                Carrusel unico
              </p>
              <p className="text-xs text-[#FFFFFF]/60 leading-relaxed">
                Generamos un solo carrusel bien trabajado (hasta 10 slides). El ultimo slide
                incluye una palabra clave para activar la automatizacion en ManyChat.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerar}
            disabled={generando || !rubro.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {generando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            ) : (
              <><PenTool className="w-4 h-4" /> Generar copies</>
            )}
          </button>
        </div>

        {/* Output derecho */}
        <div className="flex-1 card-panel flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(245,166,35,0.1)]">
            <div className="flex items-center gap-2">
              {generando && <div className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />}
              <span className="text-xs font-bold tracking-wider uppercase text-[#F5A623]">
                {generando ? 'Generando...' : 'Copies'}
              </span>
            </div>
            {output && (
              <button
                onClick={handleCopiar}
                className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/50 hover:text-[#FFFFFF] bg-[#FFFFFF]/5 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar todo'}
              </button>
            )}
          </div>

          <div className="flex-1 p-4">
            {output ? (
              <div className="prose prose-invert prose-sm max-w-none text-[#FFFFFF]/85 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-[#FFFFFF] [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-1 [&_p]:my-2 [&_hr]:border-[rgba(245,166,35,0.2)]">
                <Markdown>{output}</Markdown>
              </div>
            ) : !generando ? (
              <div className="flex flex-col items-center justify-center h-full text-[#FFFFFF]/20 gap-3">
                <PenTool className="w-10 h-10" />
                <p className="text-sm text-center">
                  Completa el formulario y<br />genera los copies.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[#FFFFFF]/40">
                <Loader2 className="w-4 h-4 animate-spin" /> Generando copies...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
