import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { buildCoachSystemPrompt, detectarContextoConversacion, loadCoachExtraContext } from '../lib/coachPrompt';
import { getUserKnowledgeBase, getUserKnowledgeBaseSync } from '../lib/userKnowledgeBase';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const SUGGESTIONS = [
  "¿En qué me enfoco hoy?",
  "Estoy trabado con mi próxima tarea",
  "Revisemos mi oferta/promesa",
  "¿Cómo acelero mis citas?"
];


function buildInitialMessage(): Message {
  const profile = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
  const dInicio = profile.fecha_inicio ? new Date(profile.fecha_inicio) : new Date();
  const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
  const semanaActual = Math.max(1, Math.min(13, Math.floor(diff / 7) + 1));
  const nombre = profile.nombre || 'Fundadora';

  const diary = JSON.parse(localStorage.getItem('tcd_diary_weekly') || '[]');
  const last = diary.length > 0 ? diary[0].respuestas : null;

  let msg = `Hola ${nombre}. Empezamos la **Semana ${semanaActual}**.\n\n`;

  if (last && last.cuello) {
    msg += `Noté en tu último check-in que tu foco es _"${last.foco}"_, pero estás frenada por: _"${last.cuello}"_.\n\n`;
  }
  msg += `¿Qué acción atómica vamos a tomar ahora mismo para destrabar esto y avanzar?`;

  return { role: 'assistant', content: msg };
}

function loadCoachMessages(): Message[] {
  try {
    const saved = localStorage.getItem('tcd_coach_messages_v2');
    return saved ? JSON.parse(saved) : [buildInitialMessage()];
  } catch { return [buildInitialMessage()]; }
}

export default function Coach({ userId }: { userId?: string }) {
  const [messages, setMessages] = useState<Message[]>(loadCoachMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const knowledgeBaseRef = useRef<string>(getUserKnowledgeBaseSync());

  useEffect(() => {
    if (!isTyping) {
      localStorage.setItem('tcd_coach_messages_v2', JSON.stringify(messages));
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    getUserKnowledgeBase(userId).then(kb => { knowledgeBaseRef.current = kb; });
  }, [userId]);

  const resetConversation = () => {
    const fresh = [buildInitialMessage()];
    setMessages(fresh);
    localStorage.setItem('tcd_coach_messages_v2', JSON.stringify(fresh));
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const contents = newMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const extraCtx = detectarContextoConversacion(text);
      const coachExtra = loadCoachExtraContext();
      const perfil = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
      const systemPrompt = buildCoachSystemPrompt({ perfil, ...extraCtx, ...coachExtra, baseDeConocimiento: knowledgeBaseRef.current || undefined });

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction: systemPrompt }
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
      toast.error('Error de conexión con el Coach IA. Intentá de nuevo.');
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: "Hubo un error de red. ¿Podrías repetirme eso?" };
        return newMsgs;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const avatarUrl = localStorage.getItem('tcd_avatar') || '';
  const profile = (() => { try { return JSON.parse(localStorage.getItem('tcd_profile') || '{}'); } catch { return {}; } })();
  const userInitial = (profile.nombre || 'U').charAt(0).toUpperCase();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col card-panel rounded-2xl overflow-hidden animate-in fade-in duration-500 border border-[#D4A24E]/10">
      <div className="p-5 border-b border-[rgba(212,162,78,0.15)] bg-[#D4A24E]/[0.03] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#D4A24E]/20 flex items-center justify-center border border-[#D4A24E]/30">
            <Bot className="w-5 h-5 text-[#D4A24E]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F5F0E1] tracking-widest uppercase mb-0.5">Coach IA</h2>
            <p className="text-[10px] text-[#F5F0E1]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#2DD4A0]" /> Conoce tu ADN completo
            </p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          title="Reiniciar conversación"
          className="w-8 h-8 rounded-lg hover:bg-[#D4A24E]/10 flex items-center justify-center text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
              msg.role === 'assistant'
                ? 'bg-[#D4A24E]/20 text-[#D4A24E] border-[#D4A24E]/30'
                : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 border-[#F5F0E1]/10'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4" />
                : (avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-[#F5F0E1]">{userInitial}</span>
                  )
              }
            </div>

            <div className={`max-w-[85%] rounded-2xl p-5 ${
              msg.role === 'user'
                ? 'bg-[#D4A24E] text-[#0A0804] rounded-tr-sm shadow-lg'
                : 'card-panel bg-[#1A1410] text-[#F5F0E1]/90 rounded-tl-sm border border-[rgba(212,162,78,0.15)]'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-[13px] leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-li:my-1 prose-a:text-[#D4A24E]">
                  {msg.content ? <Markdown>{msg.content}</Markdown> : (
                    <span className="flex gap-1.5 items-center py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A24E] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A24E] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A24E] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[rgba(212,162,78,0.15)] bg-black/20">
        {messages.length < 5 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                disabled={isTyping}
                className="px-3 py-1.5 rounded-full border border-[rgba(212,162,78,0.2)] bg-[#D4A24E]/5 hover:bg-[#D4A24E]/10 text-xs text-[#F5F0E1]/70 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-[#D4A24E]" /> {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? "Tu coach está conectando ideas..." : "Mencioná tu duda técnica o bloqueo..."}
            className="w-full bg-[#F5F0E1]/5 border border-[rgba(212,162,78,0.2)] rounded-xl py-3.5 pl-4 pr-12 text-sm text-[#F5F0E1] placeholder-[#F5F0E1]/30 focus:outline-none focus:border-[#D4A24E]/50 focus:ring-1 focus:ring-[#D4A24E]/50 transition-all disabled:opacity-50 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-9 h-9 rounded-lg bg-[#D4A24E] hover:bg-[#E2B865] disabled:opacity-50 flex items-center justify-center text-[#0A0804] transition-colors"
          >
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
