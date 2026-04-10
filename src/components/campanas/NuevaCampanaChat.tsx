/**
 * NuevaCampanaChat.tsx — Wizard conversacional con KAI (6 fases)
 * Chat-based campaign creation flow
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Send, Loader2, ArrowLeft, CheckCircle2, Lock, User,
  Target, Users, PenTool, ImageIcon, Wrench, Sparkles,
} from 'lucide-react';
import { streamText } from '../../lib/aiProvider';
import { saveCampana } from '../../lib/campanasStorage';
import type { ProfileV2 } from '../../lib/supabase';
import type { KaiMessage, WizardPhase, Campana } from '../../lib/campanasTypes';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

const PHASES: { id: WizardPhase; label: string; numero: number }[] = [
  { id: 'cliente', label: 'Cliente', numero: 1 },
  { id: 'estrategia', label: 'Estrategia', numero: 2 },
  { id: 'audiencias', label: 'Audiencias', numero: 3 },
  { id: 'copies', label: 'Copies', numero: 4 },
  { id: 'creativos', label: 'Creativos', numero: 5 },
  { id: 'montaje', label: 'Montaje', numero: 6 },
];

const PHASE_ICONS: Record<WizardPhase, React.ComponentType<{ className?: string }>> = {
  cliente: User,
  estrategia: Target,
  audiencias: Users,
  copies: PenTool,
  creativos: ImageIcon,
  montaje: Wrench,
};

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  onComplete: (campana: Campana) => void;
  onCancel: () => void;
}

interface CampaignData {
  nombre: string;
  rubro: string;
  ubicacion: string;
  ticket: string;
  presupuesto: string;
  objetivo: string;
  estrategia: string;
  audiencias: string;
  copies: string;
  creativos: string;
  montaje: string;
}

export default function NuevaCampanaChat({ userId, perfil, onComplete, onCancel }: Props) {
  const [currentPhase, setCurrentPhase] = useState<WizardPhase>('cliente');
  const [completedPhases, setCompletedPhases] = useState<Set<WizardPhase>>(new Set());
  const [messages, setMessages] = useState<KaiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    nombre: '', rubro: perfil?.especialidad ?? '', ubicacion: '', ticket: '',
    presupuesto: '', objetivo: '', estrategia: '', audiencias: '', copies: '',
    creativos: '', montaje: '',
  });
  const [summaryTab, setSummaryTab] = useState<'resumen' | 'salida' | 'tips'>('resumen');
  const [aiOutput, setAiOutput] = useState('');
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase);

  // Initial message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: `Hola${perfil?.nombre ? ` ${perfil.nombre.split(' ')[0]}` : ''}! Soy **KAI**, tu asistente de campanas.\n\nVamos a crear tu campana paso a paso. Empecemos:\n\n**Cual es el nombre de tu cliente o campana?**\n\n_Ej: "Dra. Garcia — Captacion Mayo"_`,
        timestamp: new Date().toISOString(),
        phase: 'cliente',
      }]);
    }
  }, []);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const advancePhase = () => {
    setCompletedPhases((prev) => new Set([...prev, currentPhase]));
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setCurrentPhase(PHASES[nextIndex].id);
    }
  };

  const buildSystemPrompt = (): string => {
    const phaseInstructions: Record<WizardPhase, string> = {
      cliente: `FASE ACTUAL: Cliente (1/6)
Necesitas recopilar:
- Nombre del cliente o campana
- Especialidad / rubro
- Ciudad / pais
- Ticket promedio del servicio
- Presupuesto publicitario disponible
- Objetivo principal (trafico, retargeting, leads)

Pregunta UNA cosa a la vez. Cuando tengas toda la info, resume lo que entendiste y pregunta si es correcto.
Cuando el usuario confirme, responde con "FASE COMPLETADA" al final.`,

      estrategia: `FASE ACTUAL: Estrategia (2/6)
Con los datos del cliente, define LA MEJOR estrategia.

Datos recopilados:
${JSON.stringify(campaignData, null, 2)}

Analiza el ticket y presupuesto para recomendar:
- Ticket < $100: leads baratos, trafico frio
- Ticket $100-500: contenido + retargeting
- Ticket > $500: VSL + agenda o Done-For-You

Presenta tu estrategia recomendada con KPIs esperados.
Cuando el usuario apruebe, responde con "FASE COMPLETADA".`,

      audiencias: `FASE ACTUAL: Audiencias (3/6)
Define las audiencias para Meta Ads.

Estrategia definida: ${campaignData.estrategia}

Recomienda:
- Audiencias frias (intereses, comportamientos)
- Custom audiences (retargeting)
- Lookalikes
- Rango de edad, genero, ubicacion

Cuando el usuario apruebe, responde con "FASE COMPLETADA".`,

      copies: `FASE ACTUAL: Copies (4/6)
Genera los copies para la campana.

Datos completos: ${JSON.stringify(campaignData, null, 2)}

Genera 3 variantes de copy con:
- Hook (primera linea que frena el scroll)
- Desarrollo (2-3 parrafos)
- CTA

Cuando el usuario elija o apruebe, responde con "FASE COMPLETADA".`,

      creativos: `FASE ACTUAL: Creativos (5/6)
Define la direccion creativa.

Recomienda:
- Tipo de creativos (imagen, carrusel, video)
- Estilo visual
- Elementos clave
- Formatos

Cuando el usuario apruebe, responde con "FASE COMPLETADA".`,

      montaje: `FASE ACTUAL: Montaje (6/6)
Da las instrucciones finales de montaje en Meta Ads Manager.

Resume la campana completa con un checklist de configuracion.
Cuando el usuario confirme que esta listo, responde con "FASE COMPLETADA".`,
    };

    return `Eres KAI, un experto en Meta Ads para profesionales de la salud.
Tu rol es guiar al usuario en la creacion de una campana, fase por fase.

PROFESIONAL:
- Nombre: ${perfil?.nombre ?? 'Profesional'}
- Especialidad: ${perfil?.especialidad ?? 'salud'}
- Nicho: ${perfil?.nicho ?? 'no definido'}

${phaseInstructions[currentPhase]}

REGLAS:
- Pregunta UNA cosa a la vez
- Se conciso pero completo
- Usa markdown para formatear
- Tono profesional pero cercano
- Escribe en espanol`;
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: KaiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      phase: currentPhase,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      let fullResponse = '';
      const assistantId = `kai-${Date.now()}`;

      setMessages((prev) => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        phase: currentPhase,
      }]);

      for await (const chunk of streamText({
        systemInstruction: buildSystemPrompt(),
        messages: allMessages,
      })) {
        fullResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullResponse,
          };
          return updated;
        });
      }

      setAiOutput(fullResponse);

      // Check for phase completion
      if (fullResponse.includes('FASE COMPLETADA')) {
        advancePhase();
      }

      // Extract data from conversation
      if (currentPhase === 'cliente') {
        if (text.length > 3 && !campaignData.nombre) {
          setCampaignData((prev) => ({ ...prev, nombre: text }));
        }
      }
    } catch {
      toast.error('Error en la respuesta de KAI.');
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, currentPhase, campaignData, perfil]);

  const handleQuickOption = (text: string) => {
    setInput(text);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-xs text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
      </button>

      {/* Phase progress bar */}
      <div className="card-panel p-3 mb-4">
        <div className="flex">
          {PHASES.map((phase, i) => {
            const Icon = PHASE_ICONS[phase.id];
            const isDone = completedPhases.has(phase.id);
            const isActive = currentPhase === phase.id;
            const isLocked = !isDone && !isActive;

            return (
              <div
                key={phase.id}
                className={`flex-1 flex flex-col items-center py-2 px-1 cursor-pointer transition-all rounded-lg ${
                  i < PHASES.length - 1 ? 'border-r border-[rgba(245,166,35,0.1)]' : ''
                } ${isDone ? 'bg-[#22C55E]/5' : isActive ? 'bg-[#F5A623]/10' : 'opacity-35'}`}
                onClick={() => {
                  if (isDone || isActive) setCurrentPhase(phase.id);
                }}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 ${
                  isDone ? 'bg-[#22C55E]/20 text-[#22C55E]' :
                  isActive ? 'bg-[#F5A623]/20 text-[#F5A623]' :
                  'bg-[#FFFFFF]/5 text-[#FFFFFF]/20'
                }`}>
                  {isDone ? <CheckCircle2 className="w-3 h-3" /> :
                   isLocked ? <Lock className="w-2.5 h-2.5" /> :
                   <span className="text-[9px] font-bold">{phase.numero}</span>}
                </div>
                <span className={`text-[9px] font-semibold text-center ${
                  isDone ? 'text-[#22C55E]' :
                  isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/20'
                }`}>
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chat principal */}
        <div className="flex-1 card-panel flex flex-col min-h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-end gap-2'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F5A623] to-[#FFB94D] flex items-center justify-center text-xs font-bold text-[#0A0A0A] shrink-0">
                    K
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-br-sm'
                    : 'bg-[#1C1C1C] border border-[#FFFFFF]/5 rounded-bl-sm'
                }`}>
                  {msg.content ? (
                    <div className="prose prose-invert prose-sm max-w-none text-[#FFFFFF]/85 text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:text-[#FFFFFF] [&_p]:my-1.5 [&_em]:text-[#F5A623]/80">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={msgsEndRef} />
          </div>

          {/* Quick options for first phase */}
          {currentPhase === 'cliente' && messages.length <= 2 && !streaming && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {['Trafico al perfil', 'Retargeting por mensajes', 'Clientes potenciales (leads)'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleQuickOption(opt)}
                  className="px-3 py-2 rounded-xl text-xs border border-[#FFFFFF]/10 text-[#FFFFFF]/50 hover:border-[#F5A623]/30 hover:text-[#FFFFFF]/80 hover:bg-[#F5A623]/5 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[rgba(245,166,35,0.1)]">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20"
                placeholder="Escribi tu respuesta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={streaming}
              />
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="btn-primary px-4 disabled:opacity-30"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Panel derecho — Resumen / Salida IA / Tips */}
        <div className="lg:w-[300px] lg:min-w-[300px] card-panel flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[rgba(245,166,35,0.1)]">
            {(['resumen', 'salida', 'tips'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSummaryTab(tab)}
                className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase text-center transition-all border-b-2 ${
                  summaryTab === tab
                    ? 'text-[#F5A623] border-[#F5A623]'
                    : 'text-[#FFFFFF]/30 border-transparent hover:text-[#FFFFFF]/50'
                }`}
              >
                {tab === 'salida' ? 'Salida IA' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Tab: Resumen */}
            {summaryTab === 'resumen' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30 mb-2 flex items-center gap-2">
                  Campana actual <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
                </div>
                <div className="card-panel overflow-hidden">
                  <div className="bg-[#F5A623]/10 border-b border-[rgba(245,166,35,0.1)] px-3 py-2">
                    <span className="text-[10px] font-bold text-[#F5A623]">
                      {campaignData.objetivo || '— Sin tipo —'}
                    </span>
                  </div>
                  <div className="divide-y divide-[rgba(245,166,35,0.05)]">
                    {[
                      { label: 'Cliente', value: campaignData.nombre },
                      { label: 'Especialidad', value: campaignData.rubro },
                      { label: 'Pais', value: campaignData.ubicacion },
                      { label: 'Ticket', value: campaignData.ticket },
                      { label: 'Presupuesto', value: campaignData.presupuesto },
                      { label: 'Objetivo', value: campaignData.objetivo },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-start px-3 py-2">
                        <span className="text-[10px] font-semibold text-[#FFFFFF]/30">{row.label}</span>
                        <span className="text-[10px] text-[#FFFFFF]/60 text-right">{row.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/10">
                  <div className="text-[10px] font-bold text-[#F5A623] mb-1">Tip</div>
                  <div className="text-[10px] text-[#FFFFFF]/30 leading-relaxed" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                    Completa los datos del cliente para que KAI defina la estrategia correcta.
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Salida IA */}
            {summaryTab === 'salida' && (
              <div>
                {aiOutput ? (
                  <div className="card-panel overflow-hidden">
                    <div className="bg-[#F5A623]/10 border-b border-[rgba(245,166,35,0.1)] px-3 py-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#F5A623]">Ultima generacion</span>
                    </div>
                    <div className="p-3 text-[10px] text-[#FFFFFF]/70 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {aiOutput.slice(0, 500)}{aiOutput.length > 500 ? '...' : ''}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#FFFFFF]/20">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">La salida de IA aparecera aqui cuando KAI genere contenido.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Tips */}
            {summaryTab === 'tips' && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30 mb-2 flex items-center gap-2">
                  Guia de fases <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
                </div>
                {[
                  { n: 1, title: 'Cliente', tip: 'El ticket es lo mas importante. Define si conviene trafico frio, VSL o agenda directa.' },
                  { n: 2, title: 'Estrategia', tip: 'Con ticket <$100: leads baratos. Con ticket >$500: VSL + agenda o DFY.' },
                  { n: 3, title: 'Audiencias', tip: 'Para salud, los intereses de comportamiento superan a los demograficos puro.' },
                  { n: 4, title: 'Copies', tip: 'La primera linea para el scroll. Si no para el dedo, el resto no importa.' },
                  { n: 5, title: 'Creativos', tip: 'El creativo es el 80% del resultado. El copy es el 20%. No al reves.' },
                  { n: 6, title: 'Montaje', tip: 'No tocar nada en las primeras 48-72h. La fase de aprendizaje necesita tiempo.' },
                ].map((t) => (
                  <div key={t.n} className="p-3 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/10">
                    <div className="text-[10px] font-bold text-[#F5A623] mb-1">{t.n} - {t.title}</div>
                    <div className="text-[10px] text-[#FFFFFF]/30 leading-relaxed" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      {t.tip}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

