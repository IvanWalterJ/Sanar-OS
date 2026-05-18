import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { streamText } from '../lib/aiProvider';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import {
  AttachButton,
  AttachmentsPreviewStrip,
} from '../components/ChatAttachmentsBar';
import {
  attachmentsToContext,
  buildAttachmentsFromDataTransfer,
  type ChatAttachment,
} from '../lib/chatAttachments';
import {
  buildCoachSystemPrompt,
  detectarContextoConversacion,
  loadCoachExtraContext,
} from '../lib/coachPrompt';
import {
  getUserKnowledgeBase,
  getUserKnowledgeBaseSync,
} from '../lib/userKnowledgeBase';
import {
  supabase,
  isSupabaseReady,
  agentSkillProgressRepo,
  type PilarId,
} from '../lib/supabase';
import {
  loadCoachState,
  saveCoachMessages,
  rotateSummaryIfNeeded,
  resetCoach,
  type CoachConversationMessage,
} from '../lib/coachConversation';
import {
  getCoachQuickReplies,
  type CoachQuickReplyContext,
} from '../lib/coachQuickReplies';
import { AGENTES, NIVEL_NOMBRE } from '../lib/agents';

type Message = CoachConversationMessage;

function buildInitialMessage(): Message {
  const profile = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
  const dInicio = profile.fecha_inicio ? new Date(profile.fecha_inicio) : new Date();
  const diff = Math.floor((Date.now() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
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

function getPilarActivo(perfil: Record<string, unknown> | null): PilarId | null {
  if (!perfil) return null;
  const num = perfil.pilar_actual;
  if (typeof num !== 'number') return null;
  // Mapeo aproximado: 1→P1, 2→P2,... 9→P9A (asumimos current goes 0-11)
  if (num <= 0) return 'P0';
  if (num >= 1 && num <= 8) return `P${num}` as PilarId;
  if (num === 9) return 'P9A';
  if (num === 10) return 'P9B';
  if (num === 11) return 'P9C';
  if (num === 12) return 'P10';
  if (num === 13) return 'P11';
  return null;
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.floor((Date.now() - t) / 86400000);
}

export default function Coach({ userId }: { userId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const knowledgeBaseRef = useRef<string>(getUserKnowledgeBaseSync());
  const supabaseProfileRef = useRef<Record<string, unknown> | null>(null);

  // Estado del Coach IA · sumario + last_summary_at_msg_count viven en DB
  const summaryRef = useRef<string | null>(null);
  const lastSummaryAtRef = useRef<number>(0);
  const nivelesEntrenadoresRef = useRef<Record<string, number>>({});
  const alcanzoNivel4Ref = useRef<boolean>(false);

  // ─── Carga inicial: state · perfil · niveles entrenadores ──────────────────
  useEffect(() => {
    let cancelado = false;
    async function init() {
      setCargandoEstado(true);
      try {
        if (userId) {
          const state = await loadCoachState(userId);
          if (cancelado) return;
          summaryRef.current = state.summary;
          lastSummaryAtRef.current = state.lastSummaryAtMsgCount;
          setMessages(state.messages.length > 0 ? state.messages : [buildInitialMessage()]);

          const skillRows = await agentSkillProgressRepo.loadAll(userId);
          if (cancelado) return;
          const nivByAgentId: Record<string, number> = {};
          let nivel4Alcanzado = false;
          for (const r of skillRows) {
            nivByAgentId[r.agent_id] = r.current_level;
            const last = r.last_practice_at ? new Date(r.last_practice_at).getTime() : 0;
            const sieteDias = Date.now() - 7 * 86400000;
            if (r.current_level === 4 && last > sieteDias) {
              nivel4Alcanzado = true;
            }
          }
          nivelesEntrenadoresRef.current = nivByAgentId;
          alcanzoNivel4Ref.current = nivel4Alcanzado;
        } else {
          // Sin userId · fallback localStorage (modo demo · offline).
          const raw = localStorage.getItem('tcd_coach_messages_v2');
          const arr = raw ? (JSON.parse(raw) as Message[]) : [];
          setMessages(arr.length > 0 ? arr : [buildInitialMessage()]);
        }
      } catch {
        setMessages([buildInitialMessage()]);
      } finally {
        if (!cancelado) setCargandoEstado(false);
      }
    }
    init();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  // ─── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Knowledge base ────────────────────────────────────────────────────────
  useEffect(() => {
    getUserKnowledgeBase(userId).then((kb) => {
      knowledgeBaseRef.current = kb;
    });
  }, [userId]);

  // ─── Perfil fresco desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isSupabaseReady() || !supabase) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) supabaseProfileRef.current = data as Record<string, unknown>;
      });
  }, [userId]);

  // ─── Quick replies dinámicos (recalcular cuando cambia el perfil o niveles)
  const quickReplies = useMemo(() => {
    const perfil = supabaseProfileRef.current ?? {};
    const lastDiaryRaw = localStorage.getItem('tcd_diary_weekly');
    let diasSinEntrar = 0;
    try {
      const arr = lastDiaryRaw ? JSON.parse(lastDiaryRaw) : [];
      diasSinEntrar = arr[0]?.fecha ? daysSince(arr[0].fecha) : 999;
    } catch {
      /* noop */
    }
    const lastMetricsAt =
      (perfil as { ultima_metrica_at?: string }).ultima_metrica_at ?? null;
    const ctx: CoachQuickReplyContext = {
      pilarActivo: getPilarActivo(perfil),
      diasAtraso:
        typeof (perfil as { dias_atraso?: number }).dias_atraso === 'number'
          ? ((perfil as { dias_atraso?: number }).dias_atraso ?? 0)
          : 0,
      diasSinEntrar,
      alcanzoNivel4EstaSemana: alcanzoNivel4Ref.current,
      diasSinMetricas: daysSince(lastMetricsAt),
    };
    return getCoachQuickReplies(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, cargandoEstado]);

  const resetConversation = useCallback(async () => {
    const fresh = [buildInitialMessage()];
    setMessages(fresh);
    summaryRef.current = null;
    lastSummaryAtRef.current = 0;
    if (userId) {
      try {
        await resetCoach(userId);
        await saveCoachMessages(userId, fresh);
      } catch {
        /* silencioso */
      }
    } else {
      localStorage.setItem('tcd_coach_messages_v2', JSON.stringify(fresh));
    }
  }, [userId]);

  const persist = useCallback(
    async (msgs: Message[]) => {
      if (userId) {
        try {
          await saveCoachMessages(userId, msgs);
        } catch {
          /* silencioso */
        }
      } else {
        localStorage.setItem('tcd_coach_messages_v2', JSON.stringify(msgs));
      }
    },
    [userId],
  );

  const intentarRotarSummary = useCallback(
    async (msgsAhora: Message[]) => {
      if (!userId) return;
      const result = await rotateSummaryIfNeeded(userId, {
        messages: msgsAhora,
        summary: summaryRef.current,
        lastSummaryAtMsgCount: lastSummaryAtRef.current,
      });
      if (result) {
        summaryRef.current = result.summary;
        lastSummaryAtRef.current = result.msgCount;
      }
    },
    [userId],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const hasAttachments = attachments.length > 0;
      if ((!text.trim() && !hasAttachments) || isTyping) return;

      const sentAttachments = attachments;
      setAttachments([]);
      setInput('');

      // Texto visible para el usuario · etiquetas inline con los archivos adjuntos
      const visibleText = hasAttachments
        ? `${text.trim() || '(adjuntos para analizar)'}\n\n${sentAttachments
            .map((a) =>
              a.kind === 'image' ? `📎 ${a.fileName} (imagen)` : `📎 ${a.fileName}`,
            )
            .join('\n')}`
        : text;

      const conUsuario: Message[] = [
        ...messages,
        { role: 'user', content: visibleText },
      ];
      setMessages(conUsuario);
      setIsTyping(true);

      try {
        // Contexto enriquecido con descripciones de imagenes + texto de archivos
        const attachmentsCtx = hasAttachments
          ? await attachmentsToContext(sentAttachments)
          : '';
        const promptText = `${attachmentsCtx}${text.trim() || 'Por favor, analiza los archivos/imagenes adjuntas.'}`;

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        // Para el provider mandamos el promptText enriquecido en el ultimo turno
        const aiMessages = [
          ...messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: promptText },
        ];

        const extraCtx = detectarContextoConversacion(text);
        const coachExtra = loadCoachExtraContext();
        const localPerfil = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
        const perfil = { ...localPerfil, ...(supabaseProfileRef.current ?? {}) };

        // Texto resumido de niveles por entrenador · para el system prompt
        const nivelesTexto = AGENTES.map((a) => {
          const lvl = nivelesEntrenadoresRef.current[a.id] ?? 1;
          return `${a.titulo.split(' ·')[0]}: Nivel ${lvl} (${NIVEL_NOMBRE[lvl as 1 | 2 | 3 | 4]})`;
        }).join(' · ');

        const systemPrompt = buildCoachSystemPrompt({
          perfil,
          ...extraCtx,
          ...coachExtra,
          baseDeConocimiento: knowledgeBaseRef.current || undefined,
          coachHistorySummary: summaryRef.current ?? undefined,
          nivelesEntrenadoresTexto: nivelesTexto,
        });

        let fullResponse = '';
        for await (const chunk of streamText({
          systemInstruction: systemPrompt,
          messages: aiMessages,
        })) {
          fullResponse += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: fullResponse };
            return next;
          });
        }

        const finales: Message[] = [
          ...conUsuario,
          { role: 'assistant', content: fullResponse },
        ];
        await persist(finales);
        await intentarRotarSummary(finales);
      } catch {
        toast.error('Error de conexión con el Coach IA. Intentá de nuevo.');
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: 'Hubo un error de red. ¿Podrías repetirme eso?',
          };
          return next;
        });
      } finally {
        setIsTyping(false);
      }
    },
    [attachments, isTyping, messages, persist, intentarRotarSummary],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLInputElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      // Solo interceptamos si hay archivos · si es texto puro dejamos paste por defecto
      let hasFile = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          hasFile = true;
          break;
        }
      }
      if (!hasFile) return;
      e.preventDefault();
      setUploadingAttachment(true);
      try {
        const nuevos = await buildAttachmentsFromDataTransfer(
          e.clipboardData,
          (msg) => toast.error(msg),
        );
        if (nuevos.length > 0) {
          setAttachments((prev) => [...prev, ...nuevos]);
          toast.success(
            nuevos.length === 1
              ? 'Captura adjuntada'
              : `${nuevos.length} adjuntos agregados`,
          );
        }
      } finally {
        setUploadingAttachment(false);
      }
    },
    [],
  );

  const avatarUrl = localStorage.getItem('tcd_avatar') || '';
  const profile = (() => {
    try {
      return JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    } catch {
      return {};
    }
  })();
  const userInitial = (profile.nombre || 'U').charAt(0).toUpperCase();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col card-panel rounded-2xl overflow-hidden animate-in fade-in duration-500 border border-[#F5A623]/10">
      <div className="p-5 border-b border-[rgba(245,166,35,0.15)] bg-[#F5A623]/[0.03] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623]/20 flex items-center justify-center border border-[#F5A623]/30">
            <Bot className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-widest uppercase mb-0.5">
              Coach IA
            </h2>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#22C55E]" /> Clon de Javo · conoce todo tu ADN
            </p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          title="Reiniciar conversación"
          className="w-8 h-8 rounded-lg hover:bg-[#F5A623]/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
                msg.role === 'assistant'
                  ? 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30'
                  : 'bg-white/5 text-white/60 border-white/10'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{userInitial}</span>
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-5 ${
                msg.role === 'user'
                  ? 'bg-[#F5A623] text-[#0A0A0A] rounded-tr-sm shadow-lg'
                  : 'card-panel bg-[#1C1C1C] text-white/90 rounded-tl-sm border border-[rgba(245,166,35,0.15)]'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              ) : (
                <div className="text-[13px] leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-li:my-1 prose-a:text-[#F5A623]">
                  {msg.content ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : (
                    <span className="flex gap-1.5 items-center py-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[rgba(245,166,35,0.15)] bg-black/20">
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {quickReplies.map((qr) => (
              <button
                key={qr.id}
                onClick={() => handleSend(qr.label)}
                disabled={isTyping}
                className="px-3 py-1.5 rounded-full border border-[rgba(245,166,35,0.2)] bg-[#F5A623]/5 hover:bg-[#F5A623]/10 text-xs text-white/70 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="text-[11px]">{qr.icon}</span>
                {qr.label}
              </button>
            ))}
          </div>
        )}

        <AttachmentsPreviewStrip
          attachments={attachments}
          onChange={setAttachments}
          uploading={uploadingAttachment}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="relative flex items-center gap-2"
        >
          <AttachButton
            attachments={attachments}
            onChange={setAttachments}
            onUploadingChange={setUploadingAttachment}
            onError={(msg) => toast.error(msg)}
            disabled={isTyping || cargandoEstado}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            disabled={isTyping || cargandoEstado}
            placeholder={
              isTyping
                ? 'Tu coach está conectando ideas...'
                : 'Mencioná tu duda · bloqueo · pegá una captura (Ctrl+V)...'
            }
            className="flex-1 bg-white/5 border border-[rgba(245,166,35,0.2)] rounded-xl py-3.5 pl-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all disabled:opacity-50 shadow-inner"
          />
          <button
            type="submit"
            disabled={
              (!input.trim() && attachments.length === 0) ||
              isTyping ||
              cargandoEstado ||
              uploadingAttachment
            }
            className="absolute right-2 w-9 h-9 rounded-lg bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 flex items-center justify-center text-[#0A0A0A] transition-colors"
          >
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
