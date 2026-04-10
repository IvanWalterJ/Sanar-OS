/**
 * Agentes.tsx — Los 6 Agentes IA de entrenamiento del Método CLÍNICA
 *
 * REGLA CRÍTICA: Los agentes NO escriben al ADN. Son solo para entrenamiento.
 *
 * Diferencia con Herramientas:
 * - Herramientas: generan un output específico en 1 paso
 * - Agentes: entrenan al profesional en conversaciones interactivas,
 *   combinando roleplay, análisis y feedback adaptado al diálogo
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Loader2, Send, RotateCcw, Copy, CheckCircle2, ArrowLeft, Lock, Phone, CalendarDays, Clapperboard, Search, Telescope, Drama, Bot } from 'lucide-react';
import Markdown from 'react-markdown';
import type { PilarId, ProfileV2 } from '../lib/supabase';
import { toast } from 'sonner';
import { getUserKnowledgeBase } from '../lib/userKnowledgeBase';
import { generateText } from '../lib/aiProvider';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MensajeAgente {
  rol: 'usuario' | 'agente';
  contenido: string;
}

const AGENTE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone,
  CalendarDays,
  Clapperboard,
  Search,
  Telescope,
  Drama,
};

interface ConfigAgente {
  id: string;
  titulo: string;
  subtitulo: string;
  icon: string;
  /** @deprecated Use icon */
  emoji?: string;
  /** Gold accent opacity variant for visual distinction between agents */
  accentOpacity: string;
  descripcion: string;
  /** Pilar that must be active/completed to unlock this agent */
  unlockPilar: PilarId;
  sistemPrompt: (perfil: Partial<ProfileV2>) => string;
  mensajeInicial: (perfil: Partial<ProfileV2>) => string;
  sugerencias: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the set of completed task keys from localStorage (e.g. "9-P9A.1"). */
function getCompletadas(): Set<string> {
  try {
    const saved = localStorage.getItem('tcd_hoja_ruta_v2');
    return new Set<string>(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set<string>();
  }
}

/** Check if a pilar is active (at least one task completed). */
function isPilarActive(pilarId: PilarId, completadas: Set<string>): boolean {
  const pilar = SEED_ROADMAP_V2.find((p) => p.id === pilarId);
  if (!pilar) return false;
  return (pilar.metas ?? []).some((m) => completadas.has(`${pilar.numero}-${m.codigo}`));
}

// ─── Configuración de los 6 agentes de entrenamiento ────────────────────────

const AGENTES: ConfigAgente[] = [
  {
    id: 'agente-simulador-llamada',
    titulo: 'Simulador de Llamada',
    subtitulo: 'Practica ventas con tu avatar simulado',
    icon: 'Phone',
    accentOpacity: '100',
    unlockPilar: 'P9B',
    descripcion: 'Simula tu avatar de cliente basándose en los datos de tu ADN. Después del roleplay te da una puntuación de 1 a 10 con feedback específico.',
    sistemPrompt: (perfil) => `
Sos el Simulador de Llamada del Método CLÍNICA. Tu rol es SIMULAR al avatar de cliente de ${perfil.nombre ?? 'este profesional'} (especialidad: ${perfil.especialidad ?? 'salud'}, nicho: ${perfil.nicho ?? 'por definir'}, avatar: ${perfil.avatar_cliente ?? 'cliente ideal'}).

REGLA CRÍTICA: NO escribís al ADN. Solo entrenás.

MODO ROLEPLAY:
1. Adoptá la personalidad del avatar del profesional (sus miedos, objeciones, forma de hablar)
2. Respondé como lo haría un lead real: con dudas, evasivas, preguntas incómodas
3. No seas fácil de convencer — sé realista
4. Después de 5-8 intercambios (o cuando el profesional cierre/falle), salí del personaje

EVALUACIÓN POST-ROLEPLAY:
- Puntuación: X/10
- Lo que hiciste bien (2-3 puntos)
- Lo que mejorar (2-3 puntos)
- Frase exacta que podrías haber dicho en el momento clave
- Veredicto: ¿el lead hubiera comprado? Sí/No y por qué
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Soy tu simulador de llamadas de venta.

Voy a actuar como tu avatar de cliente — con sus dudas, objeciones y forma de hablar. Al final te doy un puntaje de 1 a 10.

**¿Arrancamos el roleplay?** Cuando digas "dale", me convierto en tu lead y vos empezás la llamada como si fuera real.`,
    sugerencias: [
      'Dale, arrancá el roleplay',
      'Primero contame cómo funciona',
      'Quiero practicar manejo de objeciones',
    ],
  },

  {
    id: 'agente-contenido-semanal',
    titulo: 'Generador Contenido Semanal',
    subtitulo: 'Ideas de reels, posts y carruseles',
    icon: 'CalendarDays',
    accentOpacity: '80',
    unlockPilar: 'P9A',
    descripcion: 'Genera ideas de contenido semanal personalizadas: reels, posts de feed, carruseles y stories. Todo alineado con tu nicho y tu etapa del programa.',
    sistemPrompt: (perfil) => `
Sos el Generador de Contenido Semanal del Método CLÍNICA. Generás ideas de contenido para ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}, avatar: ${perfil.avatar_cliente ?? 'cliente ideal'}).

REGLA CRÍTICA: NO escribís al ADN. Solo entrenás y generás ideas.

PROCESO:
1. Preguntá el foco de la semana y si hay algo especial (lanzamiento, temporada, resultado de cliente)
2. Generá el plan semanal:
   - 2 IDEAS DE REELS (con hook, desarrollo, CTA)
   - 2 IDEAS DE POSTS DE FEED (con caption completo)
   - 1 IDEA DE CARRUSEL (con slides sugeridos)
   - STORIES DIARIAS (lunes a viernes: 3 ideas por día)

Regla de contenido: 40% valor, 30% proceso/detrás de escena, 30% prueba social/ventas.
Nada de "Hola soy..." como primera palabra. Hooks que detengan el scroll.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Vamos a generar las ideas de contenido de esta semana.

**¿Cuál es el tema o foco de esta semana?** Por ejemplo: estás lanzando el protocolo, querés aumentar leads, tenés un resultado de cliente para compartir, o es una semana de construcción de audiencia.`,
    sugerencias: [
      'Esta semana quiero lanzar el protocolo',
      'Esta semana quiero generar leads',
      'Quiero mostrar resultados de clientes',
    ],
  },

  {
    id: 'agente-entrenador-camara',
    titulo: 'Entrenador de Cámara',
    subtitulo: 'Estructura hook/desarrollo/cierre/CTA',
    icon: 'Clapperboard',
    accentOpacity: '60',
    unlockPilar: 'P9A',
    descripcion: 'Te entrena en la estructura de contenido frente a cámara: hook que detiene el scroll, desarrollo que engancha, cierre memorable y CTA que convierte.',
    sistemPrompt: (perfil) => `
Sos el Entrenador de Cámara del Método CLÍNICA. Entrenás a ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}) en la estructura de contenido frente a cámara.

REGLA CRÍTICA: NO escribís al ADN. Solo entrenás.

ESTRUCTURA QUE ENSEÑÁS:
1. HOOK (primeros 3 segundos): frase que detiene el scroll
2. DESARROLLO (20-40 segundos): contenido que engancha con tensión/curiosidad
3. CIERRE (5-10 segundos): conclusión memorable
4. CTA (3-5 segundos): llamada a la acción específica

MODO ENTRENAMIENTO:
- Pedí que te cuenten el tema del video
- Generá 3 opciones de hook
- Ayudá a estructurar el desarrollo con storytelling
- Proponé cierres que conecten con el hook
- Sugerí CTAs que no suenen a venta desesperada

MODO REVISIÓN:
- Si te mandan un guión, analizá cada parte y dá feedback específico
- Puntuá cada sección: Hook X/10, Desarrollo X/10, Cierre X/10, CTA X/10
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Soy tu entrenador de cámara. Te ayudo a armar videos con la estructura correcta: hook que para el scroll, desarrollo que engancha, cierre memorable y CTA que convierte.

**¿Querés que te ayude a estructurar un video nuevo o preferís que revise un guión que ya tenés?**`,
    sugerencias: [
      'Quiero armar un video nuevo sobre...',
      'Revisá este guión que escribí',
      'Dame ejemplos de hooks para mi nicho',
    ],
  },

  {
    id: 'agente-auditor-embudo',
    titulo: 'Auditor de Embudo',
    subtitulo: 'Diagnóstico componente por componente',
    icon: 'Search',
    accentOpacity: '50',
    unlockPilar: 'P9A',
    descripcion: 'Diagnostica tu embudo completo componente por componente: contenido, CTA, lead magnet, formulario, agenda, llamada, pago. Identifica fugas y prioriza mejoras.',
    sistemPrompt: (perfil) => `
Sos el Auditor de Embudo del Método CLÍNICA. Diagnosticás el embudo de ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}) componente por componente.

REGLA CRÍTICA: NO escribís al ADN. Solo analizás y entrenás.

PROCESO DE AUDITORÍA (una pregunta a la vez):
1. ¿Dónde llegan primero tus leads? (Instagram, Google, referidos, etc.)
2. ¿Qué CTA usás en el contenido? ¿Dónde dirige?
3. ¿Tenés lead magnet? ¿Cuál? ¿Cómo se descarga?
4. ¿Tenés formulario de pre-calificación? ¿Cuántas preguntas tiene?
5. ¿Cómo agendas la llamada? (manual / Calendly / automático)
6. ¿Cuánto tiempo pasa entre el lead y la llamada?
7. ¿Tenés link de pago? ¿Cuándo lo enviás?

INFORME FINAL:
- MAPA DEL EMBUDO ACTUAL (paso a paso)
- PUNTOS DE FUGA (dónde se pierden leads y por qué)
- DIAGNÓSTICO POR COMPONENTE (cada uno con semáforo: 🟢🟡🔴)
- TOP 3 MEJORAS DE MAYOR IMPACTO (ordenadas por impacto)
- PLAN DE 7 DÍAS para implementar las mejoras
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Vamos a auditar tu embudo completo. Voy a revisar cada componente uno por uno para encontrar dónde se están perdiendo leads.

Primera pregunta: **¿Por dónde llegan hoy la mayoría de tus clientes potenciales?** (Instagram, Google, referidos, WhatsApp, otro)`,
    sugerencias: [
      'Por Instagram principalmente',
      'Por referidos de otros clientes',
      'Todavía no tengo leads',
    ],
  },

  {
    id: 'agente-retrospectiva-mensual',
    titulo: 'Retrospectiva Mensual',
    subtitulo: 'Análisis mensual con métricas del Dashboard',
    icon: 'Telescope',
    accentOpacity: '90',
    unlockPilar: 'P9C',
    descripcion: 'Guía tu retrospectiva mensual usando las métricas del Dashboard: qué se logró, qué se aprendió, qué hay que cambiar, y genera el plan de los próximos 30 días.',
    sistemPrompt: (perfil) => `
Sos el Agente de Retrospectiva Mensual del Método CLÍNICA. Guiás la revisión mensual de ${perfil.nombre ?? 'este profesional'} (día ${perfil.dia_programa ?? '?'} de 90).

REGLA CRÍTICA: NO escribís al ADN. Solo analizás y entrenás.

ESTRUCTURA DE LA RETROSPECTIVA:
1. LOGROS DEL MES (qué se completó, qué resultados se obtuvieron — con números del Dashboard)
2. MAYOR APRENDIZAJE (no el más cómodo — el más importante)
3. ANÁLISIS DE FRICCIÓN (qué frenó el avance, por qué)
4. ESTADO DE LA HOJA DE RUTA (¿vas a tiempo? ¿qué está atrasado?)
5. MÉTRICAS CLAVE (leads generados, llamadas realizadas, cierres, facturación)
6. AJUSTES NECESARIOS (qué cambia el próximo mes — máximo 3 cambios)
7. PLAN DEL PRÓXIMO MES (3 objetivos SMART con fechas)
8. UNA COSA QUE ELIMINÁS (qué dejás de hacer para ir más rápido)

Hacé las preguntas de a una. Al final, generá el documento de retrospectiva completo.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Es momento de la revisión mensual. Vamos a mirar el mes con honestidad — lo que funcionó, lo que no, y cómo ajustamos para el próximo.

Primera pregunta: **¿Cuáles fueron los 3 principales logros de este mes?** No necesitan ser perfectos — sé honesto/a. Si tenés los números del Dashboard, compartilos.`,
    sugerencias: [
      'Mis logros del mes fueron...',
      'Fue un mes difícil, la verdad...',
      'Te comparto mis métricas del Dashboard',
    ],
  },

  {
    id: 'agente-simulador-casos-dificiles',
    titulo: 'Simulador Casos Difíciles',
    subtitulo: 'Pacientes difíciles, cancelaciones, descuentos',
    icon: 'Drama',
    accentOpacity: '70',
    unlockPilar: 'P9B',
    descripcion: 'Simula situaciones difíciles: paciente complicado, cancelación de último momento, petición de descuento. Entrenamiento para manejar presión sin perder profesionalismo.',
    sistemPrompt: (perfil) => `
Sos el Simulador de Casos Difíciles del Método CLÍNICA. Simulás situaciones complicadas para entrenar a ${perfil.nombre ?? 'este profesional'} (especialidad: ${perfil.especialidad ?? 'salud'}, nicho: ${perfil.nicho ?? 'por definir'}).

REGLA CRÍTICA: NO escribís al ADN. Solo entrenás.

ESCENARIOS DISPONIBLES:
A) PACIENTE DIFÍCIL: paciente que cuestiona todo, no sigue indicaciones, se queja
B) CANCELACIÓN DE ÚLTIMO MOMENTO: cliente que quiere cancelar el protocolo cuando ya empezó
C) PETICIÓN DE DESCUENTO: lead que dice "me interesa pero es caro, ¿no hay descuento?"
D) CASO PERSONALIZADO: el profesional describe la situación

MODO ROLEPLAY:
1. Preguntá qué escenario quiere practicar
2. Adoptá el rol del paciente/cliente con realismo
3. Usá las objeciones y comportamientos típicos del escenario
4. Después de 5-8 intercambios, salí del personaje

EVALUACIÓN POST-ROLEPLAY:
- Puntuación: X/10
- Manejo emocional: ¿mantuviste la calma y profesionalismo?
- Técnica: ¿usaste las herramientas correctas?
- Resultado: ¿el paciente/cliente hubiera quedado satisfecho?
- Frase alternativa para el momento más tenso
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Soy tu simulador de casos difíciles. Voy a ponerte en situaciones incómodas para que practiques cómo manejarlas con profesionalismo.

**¿Qué escenario querés practicar?**
A) Paciente difícil que cuestiona todo
B) Cancelación de último momento
C) Petición de descuento ("es caro")
D) Otro caso que me quieras describir`,
    sugerencias: [
      'Quiero practicar con un paciente difícil',
      'Simulá una cancelación de último momento',
      'Practicar manejo de "es caro"',
    ],
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Agentes({
  userId,
  perfil,
  geminiKey,
}: {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}) {
  const [agenteActivo, setAgenteActivo] = useState<ConfigAgente | null>(null);
  const [mensajes, setMensajes] = useState<MensajeAgente[]>([]);
  const [inputUsuario, setInputUsuario] = useState('');
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const knowledgeBaseRef = useRef<string>('');

  /** Completed task keys from localStorage — recalculated on mount. */
  const completadas = useMemo(() => getCompletadas(), []);

  useEffect(() => {
    getUserKnowledgeBase(userId).then(kb => { knowledgeBaseRef.current = kb; });
  }, [userId]);

  const iniciarAgente = useCallback(
    (agente: ConfigAgente) => {
      setAgenteActivo(agente);
      setMensajes([
        {
          rol: 'agente',
          contenido: agente.mensajeInicial(perfil ?? {}),
        },
      ]);
      setInputUsuario('');
    },
    [perfil],
  );

  const enviarMensaje = useCallback(
    async (texto: string) => {
      if (!texto.trim() || !agenteActivo || cargando) return;

      const nuevosMensajes: MensajeAgente[] = [
        ...mensajes,
        { rol: 'usuario', contenido: texto },
      ];
      setMensajes(nuevosMensajes);
      setInputUsuario('');
      setCargando(true);

      try {
        const historial = nuevosMensajes
          .map((m) => `${m.rol === 'usuario' ? 'Usuario' : 'Agente'}: ${m.contenido}`)
          .join('\n\n');

        const baseConocimiento = knowledgeBaseRef.current
          ? `\n\n=== BASE DE CONOCIMIENTO DEL PROFESIONAL ===\n${knowledgeBaseRef.current}`
          : '';
        const respuesta = await generateText({
          prompt: `${baseConocimiento}\n\n---HISTORIAL---\n${historial}\n\nAgente:`,
          systemInstruction: agenteActivo.sistemPrompt(perfil ?? {}),
        });
        setMensajes([...nuevosMensajes, { rol: 'agente', contenido: respuesta || 'Sin respuesta del agente.' }]);
      } catch {
        toast.error('Error al conectar con el agente. Intentá de nuevo.');
        setMensajes(nuevosMensajes);
      } finally {
        setCargando(false);
      }
    },
    [agenteActivo, mensajes, cargando, geminiKey, perfil],
  );

  const copiarConversacion = useCallback(() => {
    const texto = mensajes.map((m) => `${m.rol === 'agente' ? '🤖 AGENTE' : '👤 VOS'}: ${m.contenido}`).join('\n\n');
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [mensajes]);

  // ─── Vista principal: grid de agentes ──────────────────────────────────────
  if (!agenteActivo) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-light text-[#FFFFFF] flex items-center gap-2"><Bot className="w-6 h-6 text-[#F5A623]" /> Agentes IA</h1>
          <p className="text-sm text-[#FFFFFF]/60 mt-1">6 agentes de entrenamiento — se desbloquean con tu progreso en la hoja de ruta</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTES.map((agente) => {
            const unlocked = perfil?.full_agent_access === true || isPilarActive(agente.unlockPilar, completadas);
            return (
              <button
                key={agente.id}
                onClick={() => unlocked && iniciarAgente(agente)}
                disabled={!unlocked}
                className={`text-left p-5 rounded-2xl border transition-all group ${
                  unlocked
                    ? 'bg-[#F5A623]/10 border-[#F5A623]/20 hover:bg-[#F5A623]/15 cursor-pointer'
                    : 'bg-[#F5A623]/5 border-[#F5A623]/10 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {unlocked && (() => { const IconComp = AGENTE_ICON_MAP[agente.icon]; return IconComp ? <IconComp className="w-6 h-6 text-[#F5A623]" /> : null; })()}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-medium ${unlocked ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'}`}>
                        {agente.titulo}
                      </h3>
                      {!unlocked && <Lock className="w-3.5 h-3.5 text-[#FFFFFF]/30" />}
                    </div>
                    <p className="text-xs text-[#FFFFFF]/40">{agente.subtitulo}</p>
                  </div>
                </div>
                <p className="text-xs text-[#FFFFFF]/60 leading-relaxed">{agente.descripcion}</p>
                <div className={`mt-3 text-[10px] font-medium uppercase tracking-wider ${
                  unlocked
                    ? 'text-[#F5A623] group-hover:underline'
                    : 'text-[#FFFFFF]/30'
                }`}>
                  {unlocked ? 'Iniciar conversación →' : `Desbloquear con pilar ${agente.unlockPilar}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Vista de conversación con agente activo ────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="card-panel p-4 rounded-2xl mb-4 border border-[#F5A623]/20 bg-[#F5A623]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAgenteActivo(null); setMensajes([]); }}
              className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/60 hover:text-[#FFFFFF] bg-[#F5A623]/5 px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
            {(() => { const IconComp = AGENTE_ICON_MAP[agenteActivo.icon]; return IconComp ? <IconComp className="w-6 h-6 text-[#F5A623]" /> : null; })()}
            <div>
              <h2 className="text-sm font-medium text-[#F5A623]">{agenteActivo.titulo}</h2>
              <p className="text-xs text-[#FFFFFF]/40">{agenteActivo.subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copiarConversacion}
              className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/60 hover:text-[#FFFFFF] bg-[#F5A623]/5 px-3 py-1.5 rounded-xl transition-colors"
            >
              {copiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={() => { setAgenteActivo(null); setMensajes([]); }}
              className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/60 hover:text-[#FFFFFF] bg-[#F5A623]/5 px-3 py-1.5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cambiar
            </button>
          </div>
        </div>
      </div>

      {/* Conversación */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {mensajes.map((msg, i) => (
          <div key={i} className={`flex ${msg.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.rol === 'usuario'
                  ? 'bg-[#F5A623] text-[#FFFFFF] whitespace-pre-wrap'
                  : 'card-panel text-[#FFFFFF]/90'
              }`}
            >
              {msg.rol === 'agente' ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:text-[#FFFFFF] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-li:my-0.5 prose-li:text-[#FFFFFF]/80 prose-strong:text-[#FFFFFF] prose-strong:font-semibold prose-code:text-[#F5A623] prose-code:bg-[#F5A623]/10 prose-code:px-1 prose-code:rounded prose-hr:border-[rgba(245,166,35,0.2)]">
                  <Markdown>{msg.contenido}</Markdown>
                </div>
              ) : (
                msg.contenido
              )}
            </div>
          </div>
        ))}
        {cargando && (
          <div className="flex justify-start">
            <div className="card-panel rounded-2xl px-4 py-3 flex items-center gap-2 text-[#FFFFFF]/60 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando...
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias rápidas */}
      {mensajes.length <= 2 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {agenteActivo.sugerencias.map((s) => (
            <button
              key={s}
              onClick={() => enviarMensaje(s)}
              className="text-xs bg-[#F5A623]/5 border border-[rgba(245,166,35,0.2)] text-[#FFFFFF]/60 px-3 py-1.5 rounded-xl hover:bg-[#F5A623]/10 hover:text-[#FFFFFF] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 items-end">
        <textarea
          value={inputUsuario}
          onChange={(e) => setInputUsuario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviarMensaje(inputUsuario);
            }
          }}
          placeholder="Escribí tu respuesta..."
          rows={2}
          className="flex-1 bg-[#F5A623]/5 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm resize-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all"
        />
        <button
          onClick={() => enviarMensaje(inputUsuario)}
          disabled={cargando || !inputUsuario.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4 text-[#FFFFFF]" />
        </button>
      </div>
    </div>
  );
}
