import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

function buildSystemPrompt(): string {
  // Read user context from localStorage
  let nombre = 'Profesional';
  let especialidad = '';
  let fechaInicio = '';
  let plan = 'DWY';

  try {
    const profile = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    nombre = profile.nombre || nombre;
    especialidad = profile.especialidad || '';
    fechaInicio = profile.fecha_inicio || '';
    plan = profile.plan || 'DWY';
  } catch { /* noop */ }

  // Calculate program day
  let programDay = 1;
  if (fechaInicio) {
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diffMs = hoy.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    programDay = Math.max(1, Math.min(90, diffDays + 1));
  }

  // Find active roadmap task
  let tareaActiva = '';
  try {
    const roadmap = JSON.parse(localStorage.getItem('tcd_roadmap') || '{}');
    const fases = roadmap.fases || [];
    for (const fase of fases) {
      const active = fase.tareas?.find((t: { status: string; titulo: string }) => t.status === 'activa');
      if (active) { tareaActiva = active.titulo; break; }
    }
    if (!tareaActiva) {
      for (const fase of fases) {
        const pending = fase.tareas?.find((t: { status: string; titulo: string }) => t.status === 'pendiente');
        if (pending) { tareaActiva = pending.titulo; break; }
      }
    }
  } catch { /* noop */ }

  // Last 3 diary entries
  let diarioResumen = '';
  try {
    const diarioData = JSON.parse(localStorage.getItem('tcd_diary') || '{}');
    const entries: Array<{ fecha: string; respuestas: { q1: string; q2: string; q3: number; q4: string; q5: string } }> = (diarioData.entries || []).slice(-3);
    if (entries.length > 0) {
      diarioResumen = entries.map(e =>
        `[${e.fecha}] Hizo: "${e.respuestas?.q1}" · Bloqueó: "${e.respuestas?.q2}" · Energía: ${e.respuestas?.q3}/10`
      ).join('\n');
    }
  } catch { /* noop */ }

  // Current metrics
  let metricasResumen = '';
  try {
    const metricas: Array<{ name: string; leads: number; ventas: number }> = JSON.parse(localStorage.getItem('tcd_metrics') || '[]');
    if (metricas.length > 0) {
      const last = metricas[metricas.length - 1];
      metricasResumen = `Semana ${metricas.length}: ${last.leads} leads, ${last.ventas} ventas cerradas.`;
    }
  } catch { /* noop */ }

  return `Eres el Coach IA de Tu Clínica Digital, un asistente experto para profesionales de la salud que están construyendo su clínica digital en 90 días.

DATOS DEL USUARIO:
- Nombre: ${nombre}${especialidad ? ` (${especialidad})` : ''}
- Día del programa: ${programDay} de 90
- Plan: ${plan}
- Tarea activa en la Hoja de Ruta: ${tareaActiva || 'Sin tarea activa aún'}
${diarioResumen ? `\nÚLTIMAS ENTRADAS DEL DIARIO:\n${diarioResumen}` : ''}
${metricasResumen ? `\nMÉTRICAS ACTUALES:\n${metricasResumen}` : ''}

INSTRUCCIONES:
- Respondé SIEMPRE con el contexto de ${nombre} y su día ${programDay} del programa.
- Si la persona tiene entradas en el diario o tareas activas, hacé referencia a ellas directamente.
- No des consejos genéricos. Sabés exactamente dónde está esta persona.
- Sos directo, estratégico y con tono de coach premium.
- No das consejos médicos, solo de negocios y marketing digital en salud.
- Cuando ${nombre} tenga bloqueos (visibles en el diario), ayudala a resolverlos HOY.
- Máximo 3-4 párrafos por respuesta. Concreto y accionable.
- Respondé en español (Argentina/Latinoamérica).`;
}

function buildInitialMessage(): Message {
  let nombre = 'Profesional';
  let programDay = 1;
  let tareaActiva = '';

  try {
    const profile = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    nombre = profile.nombre || nombre;
    if (profile.fecha_inicio) {
      const inicio = new Date(profile.fecha_inicio);
      const hoy = new Date();
      programDay = Math.max(1, Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  } catch { /* noop */ }

  try {
    const roadmap = JSON.parse(localStorage.getItem('tcd_roadmap') || '{}');
    for (const fase of (roadmap.fases || [])) {
      const active = fase.tareas?.find((t: { status: string; titulo: string }) => t.status === 'activa');
      if (active) { tareaActiva = active.titulo; break; }
    }
  } catch { /* noop */ }

  const greeting = tareaActiva
    ? `Hola ${nombre}. Estás en el Día ${programDay} de 90. Tu tarea activa es "${tareaActiva}". ¿En qué te ayudo?`
    : `Hola ${nombre}. Estás en el Día ${programDay} de 90 de Tu Clínica Digital. Soy tu Coach IA. ¿En qué te ayudo hoy?`;

  return { role: 'assistant', content: greeting };
}

function loadCoachMessages(): Message[] {
  try {
    const saved = localStorage.getItem('tcd_coach_messages');
    return saved ? JSON.parse(saved) : [buildInitialMessage()];
  } catch { return [buildInitialMessage()]; }
}

export default function Coach() {
  const [messages, setMessages] = useState<Message[]>(loadCoachMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTyping) {
      localStorage.setItem('tcd_coach_messages', JSON.stringify(messages));
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const resetConversation = () => {
    const fresh = [buildInitialMessage()];
    setMessages(fresh);
    localStorage.setItem('tcd_coach_messages', JSON.stringify(fresh));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const contents = newMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: buildSystemPrompt(),
        }
      });

      let fullResponse = '';
      for await (const chunk of streamResponse) {
        fullResponse += chunk.text;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: fullResponse };
          return newMsgs;
        });
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      toast.error('Error de conexión con el Coach IA. Intentá de nuevo.');
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: "Hubo un error de conexión. Por favor, intentá de nuevo." };
        return newMsgs;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Coach IA</h2>
            <p className="text-xs text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sabe en qué día del programa estás y qué tenés pendiente
            </p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          title="Nueva conversación"
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-gray-300'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                  {msg.content ? <Markdown>{msg.content}</Markdown> : (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10 bg-white/5">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? "El coach está escribiendo..." : "Preguntale a tu Coach IA..."}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
          >
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
