/**
 * MontajeView.tsx — Montaje paso a paso con checklist + chat KAI
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Wrench, Send, Loader2, CheckCircle2, Circle, Lock } from 'lucide-react';
import { streamText } from '../../lib/aiProvider';
import type { ProfileV2 } from '../../lib/supabase';
import type { MontajeStep, KaiMessage } from '../../lib/campanasTypes';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

const MONTAJE_STEPS: MontajeStep[] = [
  { id: 1, label: 'Crear Business Manager', description: 'Configurar cuenta publicitaria y permisos', status: 'active' },
  { id: 2, label: 'Instalar Pixel de Meta', description: 'Pixel en el sitio web o landing page', status: 'locked' },
  { id: 3, label: 'Crear Audiencias', description: 'Custom audiences y lookalikes', status: 'locked' },
  { id: 4, label: 'Configurar Campana', description: 'Objetivo, presupuesto, programacion', status: 'locked' },
  { id: 5, label: 'Configurar Conjunto de Anuncios', description: 'Audiencia, ubicaciones, placements', status: 'locked' },
  { id: 6, label: 'Configurar Anuncio', description: 'Creativos, copy, CTA, tracking', status: 'locked' },
  { id: 7, label: 'Automatizaciones', description: 'ManyChat, GHL, follow-ups', status: 'locked' },
  { id: 8, label: 'Verificacion Final', description: 'Checklist antes de publicar', status: 'locked' },
];

interface Props {
  perfil: Partial<ProfileV2>;
}

export default function MontajeView({ perfil }: Props) {
  const [steps, setSteps] = useState<MontajeStep[]>(MONTAJE_STEPS);
  const [messages, setMessages] = useState<KaiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const activeStep = steps.find((s) => s.status === 'active');

  // Initial KAI message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: `Hola! Soy **KAI**, tu asistente de montaje de campanas en Meta Ads.\n\nVamos a configurar tu campana paso a paso. Empezamos con el **paso 1: ${MONTAJE_STEPS[0].label}**.\n\nContame: ya tenes un Business Manager configurado o necesitas crear uno desde cero?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, []);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markStepDone = (stepId: number) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id === stepId) return { ...s, status: 'done' as const };
      if (s.id === stepId + 1) return { ...s, status: 'active' as const };
      return s;
    }));
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: KaiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const systemInstruction = `Eres KAI, un experto en configuracion de campanas en Meta Ads Manager para profesionales de la salud.

Tu rol es guiar al usuario paso a paso para configurar su campana.

PASO ACTUAL: ${activeStep?.id ?? 1} - ${activeStep?.label ?? 'Crear Business Manager'}
DESCRIPCION: ${activeStep?.description ?? ''}

PROFESIONAL:
- Nombre: ${perfil.nombre ?? 'Profesional'}
- Especialidad: ${perfil.especialidad ?? 'salud'}
- Nicho: ${perfil.nicho ?? 'no definido'}

INSTRUCCIONES:
- Responde de forma concisa y accionable
- Se ESPECIFICO con nombres de botones y menus en Meta Ads Manager
- Si el usuario completo el paso actual, indicalo claramente con "PASO COMPLETADO"
- Guia un paso a la vez, no te adelantes
- Tono profesional pero cercano
- Escribe en espanol`;

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
      }]);

      for await (const chunk of streamText({ systemInstruction, messages: allMessages })) {
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

      // Auto-advance step if KAI says it's complete
      if (fullResponse.includes('PASO COMPLETADO') && activeStep) {
        markStepDone(activeStep.id);
      }
    } catch {
      toast.error('Error en la respuesta de KAI.');
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, activeStep, perfil]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Configuracion guiada
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          Montaje{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            paso a paso
          </span>
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Checklist izquierda */}
        <div className="lg:w-[300px] lg:min-w-[300px] card-panel p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
              Pasos
            </span>
            <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
          </div>

          <div className="space-y-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  step.status === 'active' ? 'bg-[#F5A623]/10 border border-[#F5A623]/20' :
                  step.status === 'done' ? 'bg-[#22C55E]/5' : 'opacity-40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  step.status === 'done' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
                  step.status === 'active' ? 'bg-[#F5A623]/20 text-[#F5A623]' :
                  'bg-[#FFFFFF]/5 text-[#FFFFFF]/20'
                }`}>
                  {step.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   step.status === 'active' ? <span className="text-[10px] font-bold">{step.id}</span> :
                   <Lock className="w-3 h-3" />}
                </div>
                <div>
                  <div className={`text-xs font-semibold ${
                    step.status === 'done' ? 'text-[#22C55E]' :
                    step.status === 'active' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[#FFFFFF]/25 mt-0.5 leading-relaxed">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#F5A623]/5 border border-dashed border-[#F5A623]/15">
            <div className="text-[10px] font-bold text-[#F5A623] mb-1">Tip</div>
            <div className="text-[10px] text-[#FFFFFF]/30 leading-relaxed">
              No tocar nada en las primeras 48-72h despues de publicar. La fase de aprendizaje necesita tiempo.
            </div>
          </div>
        </div>

        {/* Chat derecha */}
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
                    <div className="prose prose-invert prose-sm max-w-none text-[#FFFFFF]/85 text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:text-[#FFFFFF] [&_p]:my-1.5">
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
      </div>
    </div>
  );
}
