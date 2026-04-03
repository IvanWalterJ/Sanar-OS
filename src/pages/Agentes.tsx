/**
 * Agentes.tsx — Los 6 Agentes IA especializados del Método CLÍNICA
 *
 * Diferencia con Herramientas:
 * - Herramientas: generan un output específico en 1 paso
 * - Agentes: hacen el trabajo complejo de extremo a extremo en una conversación,
 *   combinando múltiples herramientas y adaptándose al diálogo
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, Send, RotateCcw, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import Markdown from 'react-markdown';
import type { ProfileV2 } from '../lib/supabase';
import { toast } from 'sonner';
import { getUserKnowledgeBase } from '../lib/userKnowledgeBase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MensajeAgente {
  rol: 'usuario' | 'agente';
  contenido: string;
}

interface ConfigAgente {
  id: string;
  titulo: string;
  subtitulo: string;
  emoji: string;
  color: string;
  descripcion: string;
  sistemPrompt: (perfil: Partial<ProfileV2>) => string;
  mensajeInicial: (perfil: Partial<ProfileV2>) => string;
  sugerencias: string[];
}

// ─── Configuración de los 6 agentes ──────────────────────────────────────────

const AGENTES: ConfigAgente[] = [
  {
    id: 'agente-historia',
    titulo: 'Agente de Historia de Origen',
    subtitulo: 'Genera las 3 versiones de tu historia',
    emoji: '📖',
    color: 'violet',
    descripcion: 'Te hace las preguntas clave y genera las 3 versiones de tu historia de origen (300/150/50 palabras) listas para usar en tu landing, bio y conversaciones.',
    sistemPrompt: (perfil) => `
Sos el Agente de Historia de Origen del Método CLÍNICA. Tu objetivo es extraer la historia de transformación de ${perfil.nombre ?? 'este profesional'} (especialidad: ${perfil.especialidad ?? 'salud'}) a través de una conversación, y luego generar las 3 versiones de su historia en formato A→B→C (Infierno → Brecha → Cielo).

PROCESO:
1. Primero, hacé 3-4 preguntas para entender la historia (de dónde vino, qué cambió, dónde está hoy)
2. Luego pedí confirmación de que captaste bien
3. Finalmente, generá las 3 versiones con los delimitadores:
   ---VERSIÓN LARGA (300 palabras)---
   ---VERSIÓN MEDIA (150 palabras)---
   ---VERSIÓN CORTA (50 palabras)---

Tono: cálido, curioso, no terapéutico. La historia debe sonar como el profesional, no como una plantilla de marketing.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Voy a ayudarte a escribir tu Historia de Origen en 3 versiones. Esta historia es la que va en tu landing page, tu bio y tus conversaciones de venta — es fundamental que suene auténtica.

Empecemos: **¿Cuándo y cómo decidiste empezar a ver pacientes de forma privada o a lanzar tu práctica independiente?** ¿Qué estaba pasando en tu vida en ese momento?`,
    sugerencias: [
      'Contame más sobre esa etapa',
      '¿Y cómo llegaste a donde estás hoy?',
      'Generá las 3 versiones ahora',
    ],
  },

  {
    id: 'agente-oferta',
    titulo: 'Agente de Oferta Completa',
    subtitulo: 'Diseña tu protocolo de principio a fin',
    emoji: '💼',
    color: 'blue',
    descripcion: 'Trabaja con vos para definir el nombre, estructura, precio, bonos, garantía y presentación completa de tu protocolo principal.',
    sistemPrompt: (perfil) => `
Sos el Agente de Oferta Completa del Método CLÍNICA. Ayudás a ${perfil.nombre ?? 'este profesional'} (${perfil.especialidad ?? 'salud'}, nicho: ${perfil.nicho ?? 'por definir'}) a construir su oferta irresistible.

PROCESO:
1. Preguntá por el resultado principal que el protocolo promete
2. Definí la estructura (sesiones, duración, formato)
3. Calculá el precio basado en valor (no en costo)
4. Diseñá los bonos que amplifican el valor percibido
5. Creá la garantía que elimina el riesgo
6. Generá el nombre del protocolo
7. Producí el pitch de 2 minutos y el copy de 1 párrafo para la landing

Sé específico. Hacé una pregunta a la vez. Cuando tengas toda la información, generá el documento de oferta completo.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Vamos a construir tu oferta completa paso a paso. Al final de esta conversación vas a tener el protocolo con nombre, estructura, precio justificado, bonos, garantía y el copy listo para usar.

Primera pregunta: **¿Cuál es el resultado específico que logran tus clientes en el tiempo que dura tu protocolo?** No el proceso — el resultado. Lo más concreto posible.`,
    sugerencias: [
      'El resultado es que [describilo]...',
      '¿Cuánto debería cobrar?',
      'Generá el documento de oferta completo',
    ],
  },

  {
    id: 'agente-contenido',
    titulo: 'Agente de Contenido Semanal',
    subtitulo: 'Plan de 7 días listo para publicar',
    emoji: '📅',
    color: 'pink',
    descripcion: 'Genera el plan de contenido completo de la semana: stories diarias, idea de Reel, captions y hashtags. Todo personalizado para tu nicho y etapa del programa.',
    sistemPrompt: (perfil) => `
Sos el Agente de Contenido Semanal. Creás el plan de contenido de 7 días para ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}, avatar: ${perfil.avatar_cliente ?? 'profesional de la salud emprendedor'}).

PROCESO:
1. Preguntá cuál es el tema/foco de la semana y si hay algo importante (lanzamiento, temporada, etc.)
2. Generá el plan completo con:
   - LUNES a DOMINGO: 3 stories + acción del día
   - 1 DÍA de Reel (el de mayor energía de la semana)
   - 1 post de feed de valor
   - Hashtags curados para el nicho

Regla de contenido: 40% valor, 30% proceso/detrás de escena, 30% prueba social/ventas.
Nada de "Hola soy..." como primera palabra. Nada de captions con listas de puntos sin contexto.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Vamos a armar el plan de contenido de esta semana.

**¿Cuál es el tema o foco de esta semana?** Por ejemplo: estás lanzando el protocolo, querés aumentar leads, tenés un resultado de cliente para compartir, o es una semana de construcción de audiencia.`,
    sugerencias: [
      'Esta semana quiero lanzar el protocolo',
      'Esta semana quiero generar leads',
      'Quiero mostrar resultados de clientes',
    ],
  },

  {
    id: 'agente-embudo',
    titulo: 'Agente de Embudo',
    subtitulo: 'Revisa y conecta todos los componentes',
    emoji: '🔄',
    color: 'cyan',
    descripcion: 'Audita tu embudo completo: contenido → CTA → lead magnet → formulario → agenda → llamada → pago. Identifica qué falta, qué está roto y qué mejora primero.',
    sistemPrompt: (perfil) => `
Sos el Agente de Embudo del Método CLÍNICA. Auditás el embudo de ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}) y generás un plan de acción específico.

PROCESO DE AUDITORÍA (hacé una pregunta a la vez):
1. ¿Dónde llegan primero tus leads? (Instagram, Google, referidos, etc.)
2. ¿Qué CTA usás en el contenido? ¿Dónde dirige?
3. ¿Tenés lead magnet? ¿Cuál? ¿Cómo se descarga?
4. ¿Tenés formulario de pre-calificación? ¿Cuántas preguntas tiene?
5. ¿Cómo agendas la llamada? (manual / Calendly / automático)
6. ¿Cuánto tiempo pasa entre el lead y la llamada?
7. ¿Tenés link de pago? ¿Cuándo lo enviás?

Al final de la auditoría, generá:
- MAPA DEL EMBUDO ACTUAL (paso a paso)
- PUNTOS DE FUGA (dónde se pierden leads)
- TOP 3 MEJORAS DE MAYOR IMPACTO (ordenadas por impacto)
- PLAN DE 7 DÍAS para implementar las mejoras
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Vamos a auditar tu embudo completo. Voy a hacerte preguntas una a una para entender cómo llegan tus clientes, qué pasa en cada paso y dónde se están perdiendo leads.

Primera pregunta: **¿Por dónde llegan hoy la mayoría de tus clientes potenciales?** (Instagram, Google, referidos, WhatsApp, otro)`,
    sugerencias: [
      'Por Instagram principalmente',
      'Por referidos de otros clientes',
      'Todavía no tengo leads',
    ],
  },

  {
    id: 'agente-venta',
    titulo: 'Agente de Llamada de Venta',
    subtitulo: 'Prepara y practica tu cierre',
    emoji: '📞',
    color: 'orange',
    descripcion: 'Te prepara para una llamada de venta específica: genera el guión personalizado, anticipa las objeciones de ese lead y te entrena en el cierre.',
    sistemPrompt: (perfil) => `
Sos el Agente de Llamada de Venta del Método CLÍNICA. Preparás a ${perfil.nombre ?? 'este profesional'} (nicho: ${perfil.nicho ?? 'salud'}, precio del protocolo: ${perfil.posicionamiento ?? 'a definir'}) para una llamada de venta específica.

MODO 1 — PREPARACIÓN:
Si el profesional tiene una llamada próxima, preguntá:
- ¿Cuándo es la llamada?
- ¿Qué sabe del lead? (por dónde llegó, qué preguntó, qué perfil tiene)
- ¿Cuál es el mayor miedo del profesional para esta llamada?

Luego generá: guión específico + top 3 objeciones probables para ESE lead + cierres alternativos.

MODO 2 — ROLE PLAY:
Si el profesional quiere practicar, jugá el rol del lead con objeciones reales. Después del role play, dá feedback específico: qué funcionó, qué cambiarías, cuál fue el momento de mayor impacto.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Estoy acá para prepararte para tu llamada de venta.

**¿Tenés una llamada específica próximamente que querés preparar?** Si es así, contame todo lo que sabés de ese lead. Si preferís primero practicar con un role play, también podemos hacer eso.`,
    sugerencias: [
      'Tengo una llamada mañana con...',
      'Quiero practicar con un role play',
      '¿Cómo manejo la objeción "es caro"?',
    ],
  },

  {
    id: 'agente-retrospectiva',
    titulo: 'Agente de Retrospectiva',
    subtitulo: 'Análisis mensual completo',
    emoji: '🔭',
    color: 'rose',
    descripcion: 'Guía la retrospectiva mensual completa: qué se logró, qué se aprendió, qué hay que cambiar, y genera el plan de los próximos 30 días.',
    sistemPrompt: (perfil) => `
Sos el Agente de Retrospectiva del Método CLÍNICA. Guiás la revisión mensual de ${perfil.nombre ?? 'este profesional'} (día ${perfil.dia_programa ?? '?'} de 90).

ESTRUCTURA DE LA RETROSPECTIVA:
1. LOGROS DEL MES (qué se completó, qué resultados se obtuvieron — con números)
2. MAYOR APRENDIZAJE (no el más cómodo — el más importante)
3. ANÁLISIS DE FRICCIÓN (qué frenó el avance, por qué)
4. ESTADO DE LA HOJA DE RUTA (¿vas a tiempo? ¿qué está atrasado?)
5. AJUSTES NECESARIOS (qué cambia el próximo mes — máximo 3 cambios)
6. PLAN DEL PRÓXIMO MES (3 objetivos SMART con fechas)
7. UNA COSA QUE ELIMINÁS (qué dejás de hacer para ir más rápido)

Hacé las preguntas de a una. Al final, generá el documento de retrospectiva completo.
    `.trim(),
    mensajeInicial: (perfil) =>
      `Hola ${perfil.nombre?.split(' ')[0] ?? ''}! Es momento de la revisión mensual. Vamos a mirar el mes con honestidad — lo que funcionó, lo que no, y cómo ajustamos para el próximo.

Primera pregunta: **¿Cuáles fueron los 3 principales logros de este mes?** No necesitan ser perfectos — sé honesto/a. Contame también los números si los tenés.`,
    sugerencias: [
      'Mis logros del mes fueron...',
      'Fue un mes difícil, la verdad...',
      '¿Por dónde empezamos?',
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
        if (!geminiKey) {
          setMensajes([
            ...nuevosMensajes,
            { rol: 'agente', contenido: 'Configurá la GEMINI_API_KEY para activar los agentes IA.' },
          ]);
          return;
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const historial = nuevosMensajes
          .map((m) => `${m.rol === 'usuario' ? 'Usuario' : 'Agente'}: ${m.contenido}`)
          .join('\n\n');

        const baseConocimiento = knowledgeBaseRef.current
          ? `\n\n=== BASE DE CONOCIMIENTO DEL PROFESIONAL ===\n${knowledgeBaseRef.current}`
          : '';
        const resultado = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${agenteActivo.sistemPrompt(perfil ?? {})}${baseConocimiento}\n\n---HISTORIAL---\n${historial}\n\nAgente:`,
        });

        const respuesta = resultado.text ?? 'Sin respuesta del agente.';
        setMensajes([...nuevosMensajes, { rol: 'agente', contenido: respuesta }]);
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
          <h1 className="text-2xl font-light text-white flex items-center gap-2">🤖 Agentes IA</h1>
          <p className="text-sm text-gray-400 mt-1">6 agentes especializados que trabajan de extremo a extremo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTES.map((agente) => (
            <button
              key={agente.id}
              onClick={() => iniciarAgente(agente)}
              className={`text-left p-5 rounded-2xl border bg-${agente.color}-500/10 border-${agente.color}-500/25 hover:bg-${agente.color}-500/15 transition-all group`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{agente.emoji}</span>
                <div>
                  <h3 className={`text-sm font-medium text-${agente.color}-300`}>{agente.titulo}</h3>
                  <p className="text-xs text-gray-500">{agente.subtitulo}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{agente.descripcion}</p>
              <div className={`mt-3 text-[10px] text-${agente.color}-400 font-medium uppercase tracking-wider group-hover:underline`}>
                Iniciar conversación →
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Vista de conversación con agente activo ────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className={`glass-panel p-4 rounded-2xl mb-4 border border-${agenteActivo.color}-500/25 bg-${agenteActivo.color}-500/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAgenteActivo(null); setMensajes([]); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
            <span className="text-2xl">{agenteActivo.emoji}</span>
            <div>
              <h2 className={`text-sm font-medium text-${agenteActivo.color}-300`}>{agenteActivo.titulo}</h2>
              <p className="text-xs text-gray-500">{agenteActivo.subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copiarConversacion}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl transition-colors"
            >
              {copiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={() => { setAgenteActivo(null); setMensajes([]); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl transition-colors"
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
                  ? 'bg-indigo-600 text-white whitespace-pre-wrap'
                  : 'glass-panel text-gray-200'
              }`}
            >
              {msg.rol === 'agente' ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-li:my-0.5 prose-li:text-gray-300 prose-strong:text-white prose-strong:font-semibold prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1 prose-code:rounded prose-hr:border-white/10">
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
            <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
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
              className="text-xs bg-white/5 border border-white/10 text-gray-400 px-3 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
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
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
        <button
          onClick={() => enviarMensaje(inputUsuario)}
          disabled={cargando || !inputUsuario.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
