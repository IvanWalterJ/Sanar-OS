import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Clock, Calendar, Target, Play, Wrench, MessageCircle, Bot, Sparkles } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';
import type { RoadmapMeta } from '../lib/roadmapSeed';
import TaskDetailModal from '../components/TaskDetailModal';

function getTypeBadge(tipo?: string) {
  switch (tipo) {
    case 'VIDEO': return 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/25';
    case 'HERRAMIENTA': return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25';
    case 'COACH': return 'bg-[#FFFFFF]/10 text-[#FFFFFF]/70 border-[#FFFFFF]/15';
    case 'AGENTE': return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
    default: return 'bg-[#FFFFFF]/5 text-[#FFFFFF]/50 border-[#FFFFFF]/10';
  }
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-panel p-5">
      <p className="text-[10px] text-[#FFFFFF]/40 uppercase tracking-widest mb-2 font-semibold">{label}</p>
      <p className="text-2xl font-light text-[#FFFFFF] tracking-tight">{value}</p>
      <p className="text-xs text-[#FFFFFF]/50 mt-1">{sub}</p>
    </div>
  );
}

interface TareaHoy extends RoadmapMeta {
  pilarNumero: number;
  pilarTitulo: string;
}

interface ProximoHito {
  titulo: string;
  subtitulo: string;
  pilarNumero: number;
  metasTotal: number;
  metasCompletadas: number;
  hitoMensaje?: string;
  tareasRestantes: { titulo: string; tipo: string }[];
  diaPrograma: number;
}

export default function Dashboard({ setCurrentPage, userId }: { setCurrentPage: (page: string) => void, userId?: string }) {
  const [data, setData] = useState({
    profile: { nombre: '', fecha_inicio: new Date().toISOString() },
    semanaActual: 1,
    totalTareas: 0,
    completadas: 0,
    pilaresCompletados: 0,
    tareasHoy: [] as TareaHoy[],
    racha: 0,
  });
  const [proximoHito, setProximoHito] = useState<ProximoHito | null>(null);
  const [selectedTask, setSelectedTask] = useState<TareaHoy | null>(null);

  useEffect(() => {
    async function loadData() {
      const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
      const dInicio = p.fecha_inicio ? new Date(p.fecha_inicio) : new Date();
      const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
      const semActual = Math.max(1, Math.min(13, Math.floor(diff / 7) + 1));

      let completadasSet: Set<string>;
      try {
        const saved = localStorage.getItem('tcd_hoja_ruta_v2');
        completadasSet = saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        completadasSet = new Set();
      }

      let tot = 0;
      let comp = 0;
      let pilaresComp = 0;
      const tareasHoy: TareaHoy[] = [];

      for (const pil of SEED_ROADMAP_V2) {
        const metasPilar = pil.metas ?? [];
        const completadasPilar = metasPilar.filter((m) => completadasSet.has(`${pil.numero}-${m.codigo}`)).length;
        tot += metasPilar.length;
        comp += completadasPilar;
        if (completadasPilar >= metasPilar.length && metasPilar.length > 0) pilaresComp++;

        if (tareasHoy.length < 3) {
          for (const meta of metasPilar) {
            if (!completadasSet.has(`${pil.numero}-${meta.codigo}`) && tareasHoy.length < 3) {
              tareasHoy.push({ ...meta, pilarNumero: pil.numero, pilarTitulo: pil.titulo });
            }
          }
        }
      }

      const diaPrograma = Math.max(1, diff + 1);

      let hito: ProximoHito | null = null;
      for (const pil of SEED_ROADMAP_V2) {
        const metasPilar = pil.metas ?? [];
        const completadasPilar = metasPilar.filter((m) => completadasSet.has(`${pil.numero}-${m.codigo}`)).length;
        if (completadasPilar < metasPilar.length) {
          const pendientes = metasPilar
            .filter((m) => !completadasSet.has(`${pil.numero}-${m.codigo}`))
            .slice(0, 3)
            .map((m) => ({ titulo: m.titulo, tipo: m.tipo || '' }));
          hito = {
            titulo: pil.titulo,
            subtitulo: pil.subtitulo,
            pilarNumero: pil.numero,
            metasTotal: metasPilar.length,
            metasCompletadas: completadasPilar,
            hitoMensaje: (pil as any).hito_mensaje,
            tareasRestantes: pendientes,
            diaPrograma,
          };
          break;
        }
      }

      const diary = JSON.parse(localStorage.getItem('tcd_diario_v2') || '{}');
      const rachaLocal = Array.isArray(diary.entries) ? diary.entries.length : 0;

      setData({
        profile: { nombre: p.nombre || '', fecha_inicio: p.fecha_inicio || new Date().toISOString() },
        semanaActual: semActual,
        totalTareas: tot,
        completadas: comp,
        pilaresCompletados: pilaresComp,
        tareasHoy,
        racha: rachaLocal,
      });
      setProximoHito(hito);

      if (isSupabaseReady() && supabase && userId) {
        const { data: hrRows } = await supabase
          .from('hoja_de_ruta')
          .select('pilar_numero, meta_codigo, completada')
          .eq('usuario_id', userId);

        if (hrRows && hrRows.length > 0) {
          const sbSet = new Set<string>(
            hrRows.filter((r: any) => r.completada).map((r: any) => `${r.pilar_numero}-${r.meta_codigo}`)
          );

          let sTot = 0, sComp = 0, sPilaresComp = 0;
          const sTareasHoy: TareaHoy[] = [];
          let sHito: ProximoHito | null = null;

          for (const pil of SEED_ROADMAP_V2) {
            const metasPilar = pil.metas ?? [];
            const completadasPilar = metasPilar.filter((m) => sbSet.has(`${pil.numero}-${m.codigo}`)).length;
            sTot += metasPilar.length;
            sComp += completadasPilar;
            if (completadasPilar >= metasPilar.length && metasPilar.length > 0) sPilaresComp++;

            if (sTareasHoy.length < 3) {
              for (const meta of metasPilar) {
                if (!sbSet.has(`${pil.numero}-${meta.codigo}`) && sTareasHoy.length < 3) {
                  sTareasHoy.push({ ...meta, pilarNumero: pil.numero, pilarTitulo: pil.titulo });
                }
              }
            }
          }

          for (const pil of SEED_ROADMAP_V2) {
            const metasPilar = pil.metas ?? [];
            const completadasPilar = metasPilar.filter((m) => sbSet.has(`${pil.numero}-${m.codigo}`)).length;
            if (completadasPilar < metasPilar.length) {
              const pendientes = metasPilar
                .filter((m) => !sbSet.has(`${pil.numero}-${m.codigo}`))
                .slice(0, 3)
                .map((m) => ({ titulo: m.titulo, tipo: m.tipo || '' }));
              sHito = {
                titulo: pil.titulo,
                subtitulo: pil.subtitulo,
                pilarNumero: pil.numero,
                metasTotal: metasPilar.length,
                metasCompletadas: completadasPilar,
                hitoMensaje: (pil as any).hito_mensaje,
                tareasRestantes: pendientes,
                diaPrograma: Math.max(1, diff + 1),
              };
              break;
            }
          }

          setData(prev => ({ ...prev, totalTareas: sTot, completadas: sComp, pilaresCompletados: sPilaresComp, tareasHoy: sTareasHoy }));
          setProximoHito(sHito);
        }

        const { data: qd } = await supabase.from('diario_entradas').select('id').eq('user_id', userId);
        if (qd) setData(prev => ({ ...prev, racha: qd.length }));
      }
    }
    loadData();
  }, [userId]);

  const pctTareas = data.totalTareas > 0 ? Math.round((data.completadas / data.totalTareas) * 100) : 0;
  const pctHito = proximoHito && proximoHito.metasTotal > 0
    ? Math.round((proximoHito.metasCompletadas / proximoHito.metasTotal) * 100)
    : 0;
  const tareasRestantesHito = proximoHito ? proximoHito.metasTotal - proximoHito.metasCompletadas : 0;

  const nombreDisplay = data.profile.nombre || 'bienvenida';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* ZONA A — Header contextual */}
      <div className="relative overflow-hidden card-panel p-8 border border-[#F5A623]/20 bg-gradient-to-br from-[#F5A623]/[0.05] to-transparent">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5A623]/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <p className="text-2xl font-light text-[#FFFFFF] mb-2" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Buenos días, {nombreDisplay}.</p>
          <p className="text-sm text-[#FFFFFF]/60 max-w-lg mb-6 leading-relaxed">
            Estás en la <strong className="text-[#FFFFFF]/90">Semana {data.semanaActual} de 13</strong>. Tenés <strong className="text-[#F5A623]">{data.tareasHoy.length} {data.tareasHoy.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}</strong> para avanzar con tu ADN.
          </p>
          <button onClick={() => setCurrentPage('roadmap')} className="text-[11px] font-bold text-[#F5A623] hover:text-[#FFB94D] transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-[#F5A623]/10 px-4 py-2 rounded-lg border border-[#F5A623]/20 w-max">
            Ver hoja de ruta <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ZONA B — 4 tarjetas de métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Semana actual" value={`${data.semanaActual}/13`} sub="Del programa" />
        <MetricCard label="Pilares completados" value={`${data.pilaresCompletados}/${SEED_ROADMAP_V2.length}`} sub="Desbloqueados" />
        <MetricCard label="Tareas completadas" value={`${data.completadas}/${data.totalTareas}`} sub={`${pctTareas}% del total`} />
        <MetricCard label="Días de diario" value={`${data.racha}`} sub={data.racha > 0 ? `${data.racha} entradas` : 'Sin entradas aún'} />
      </div>

      {/* ZONA C — Dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Foco de Hoy (60%) */}
        <div className="lg:col-span-7 card-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[11px] font-bold text-[#FFFFFF] tracking-widest uppercase">Tu foco de hoy</h2>
            <button onClick={() => setCurrentPage('roadmap')} className="text-[10px] text-[#FFFFFF]/40 hover:text-[#F5A623] uppercase font-bold tracking-wider transition-colors">
              Ir a tareas →
            </button>
          </div>

          <div className="space-y-3">
            {data.tareasHoy.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-[rgba(245,166,35,0.15)] rounded-xl bg-[#1C1C1C]/30">
                <CheckCircle2 className="w-8 h-8 text-[#22C55E]/50 mx-auto mb-3" />
                <p className="text-sm text-[#FFFFFF]/60">Todo al día. Estás libre.</p>
                <p className="text-xs text-[#FFFFFF]/30 mt-1">Revisá tu hoja de ruta para ver los próximos pilares.</p>
              </div>
            ) : data.tareasHoy.map((t, idx) => (
              <div
                key={idx}
                className="group flex items-start gap-4 p-4 rounded-xl bg-[#1C1C1C]/30 border border-[rgba(245,166,35,0.1)] hover:bg-[#1C1C1C]/60 hover:border-[rgba(245,166,35,0.25)] transition-all cursor-pointer"
                onClick={() => setSelectedTask(t)}
              >
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full border border-[#FFFFFF]/20 group-hover:border-[#F5A623] transition-colors flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-transparent group-hover:bg-[#F5A623] rounded-full" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#FFFFFF]/90">{t.titulo}</p>
                  <p className="text-[10px] text-[#FFFFFF]/40 mt-1">{t.pilarTitulo}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wider ${getTypeBadge(t.tipo)}`}>
                      {t.tipo || `Pilar ${t.pilarNumero}`}
                    </span>
                    <span className="text-[10px] text-[#FFFFFF]/40 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {t.tiempo_estimado || '15–30 min'}
                    </span>
                    {(t.herramienta_id || t.agente_id) && (
                      <span className="text-[9px] text-[#F5A623] font-bold uppercase tracking-wider">Ver herramienta →</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inspiración del Día */}
        <div className="lg:col-span-5 card-panel p-6 relative overflow-hidden flex flex-col justify-between border-[#F5A623]/15 bg-gradient-to-br from-[#F5A623]/[0.05] to-transparent">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#F5A623]/10 blur-[50px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#22C55E]/5 blur-[40px] rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[11px] font-bold text-[#F5A623] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] ring-4 ring-[#F5A623]/20" /> Inspiración del día
              </h2>
              <div className="flex items-center gap-1.5 bg-[#F5A623]/10 px-3 py-1 rounded-full border border-[#F5A623]/20">
                <Sparkles className="w-3 h-3 text-[#F5A623]" />
                <span className="text-[10px] font-bold text-[#F5A623]">Día {proximoHito?.diaPrograma ?? 1}/90</span>
              </div>
            </div>

            {(() => {
              const QUOTES = [
                { text: "El éxito no se mide por lo que lográs, sino por los obstáculos que superás.", author: "Booker T. Washington" },
                { text: "La mejor manera de predecir el futuro es creándolo.", author: "Peter Drucker" },
                { text: "No esperes las condiciones perfectas. Empezá con lo que tenés.", author: "Arthur Ashe" },
                { text: "Tu consultorio es tu empresa. Tratalo como tal y los resultados van a cambiar.", author: "Método CLÍNICA" },
                { text: "El profesional que domina su negocio, libera tiempo para su vocación.", author: "Método CLÍNICA" },
                { text: "Cada paciente que llega es el resultado de un sistema, no de la suerte.", author: "Método CLÍNICA" },
                { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
                { text: "No se trata de trabajar más horas, sino de construir mejores sistemas.", author: "Método CLÍNICA" },
                { text: "Lo que no se mide, no se mejora. Lo que no se mejora, se deteriora.", author: "William Thomson" },
                { text: "El precio es lo que pagás. El valor es lo que recibís.", author: "Warren Buffett" },
                { text: "Un sistema sin ventas es un hobby. Un profesional sin sistema está atrapado.", author: "Método CLÍNICA" },
                { text: "El liderazgo es la capacidad de traducir visión en realidad.", author: "Warren Bennis" },
                { text: "Automatizar lo repetitivo te libera para lo que realmente importa: tus pacientes.", author: "Método CLÍNICA" },
                { text: "La clave no es priorizar tu agenda, sino agendar tus prioridades.", author: "Stephen Covey" },
                { text: "Tu historia personal es tu mayor activo de marketing. Contala.", author: "Método CLÍNICA" },
                { text: "Hacé lo que tenés que hacer hasta que puedas hacer lo que querés hacer.", author: "Oprah Winfrey" },
                { text: "El emprendedor siempre busca el cambio, responde a él y lo explota como una oportunidad.", author: "Peter Drucker" },
                { text: "Si tu oferta no es irresistible, el problema no es el mercado. Es la oferta.", author: "Método CLÍNICA" },
                { text: "La simplicidad es la máxima sofisticación.", author: "Leonardo da Vinci" },
                { text: "Tu legado profesional se construye una decisión a la vez.", author: "Método CLÍNICA" },
                { text: "Primero te ignoran, después se ríen de vos, después pelean con vos, y entonces ganás.", author: "Mahatma Gandhi" },
                { text: "La confianza en uno mismo es el primer secreto del éxito.", author: "Ralph Waldo Emerson" },
                { text: "Un paciente bien atendido es la mejor estrategia de captación.", author: "Método CLÍNICA" },
                { text: "La innovación distingue al líder del seguidor.", author: "Steve Jobs" },
                { text: "No necesitás más pacientes. Necesitás un mejor sistema para los que ya tenés.", author: "Método CLÍNICA" },
                { text: "Invertir en vos mismo es la mejor inversión que jamás harás.", author: "Warren Buffett" },
                { text: "El secreto de avanzar es empezar.", author: "Mark Twain" },
                { text: "Cada día que construís tu sistema es un día menos de depender de la suerte.", author: "Método CLÍNICA" },
                { text: "El que tiene un porqué para vivir puede soportar casi cualquier cómo.", author: "Friedrich Nietzsche" },
                { text: "Tu clínica digital no es un gasto. Es la infraestructura de tu libertad.", author: "Método CLÍNICA" },
              ];
              const TIPS = [
                "Completá tu diario hoy — 5 minutos que transforman tu semana.",
                "Revisá tus métricas semanales para saber qué ajustar.",
                "Definí tu oferta irresistible antes de invertir en publicidad.",
                "Tu avatar ideal determina toda tu comunicación. ¿Ya lo tenés claro?",
                "El seguimiento post-consulta es donde se ganan las recomendaciones.",
                "Medí tu tasa de cierre: ¿cuántos leads se convierten en pacientes?",
                "Un embudo simple y funcional vale más que uno complejo sin resultados.",
                "Escribí tu historia en 3 formatos: 300, 150 y 50 palabras.",
                "Tu propósito es tu filtro de decisiones. Todo lo demás es ruido.",
                "Cada tarea completada es un ladrillo de tu clínica digital.",
              ];
              const dayIndex = (proximoHito?.diaPrograma ?? 1) - 1;
              const quote = QUOTES[dayIndex % QUOTES.length];
              const tip = TIPS[dayIndex % TIPS.length];
              return (
                <>
                  <div className="mb-6">
                    <div className="text-4xl text-[#F5A623]/20 mb-2 leading-none" style={{ fontFamily: 'Georgia, serif' }}>"</div>
                    <p className="text-[15px] text-white/90 leading-relaxed italic mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      {quote.text}
                    </p>
                    <p className="text-xs text-white/40 font-medium">— {quote.author}</p>
                  </div>

                  <div className="px-3 py-3 rounded-xl bg-[#22C55E]/[0.06] border border-[#22C55E]/15">
                    <p className="text-[10px] text-[#22C55E] font-bold uppercase tracking-widest mb-1">Tip del día</p>
                    <p className="text-[12px] text-white/70 leading-relaxed">{tip}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Day progress mini-bar */}
          <div className="relative z-10 mt-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Progreso general</span>
              <span className="text-[10px] text-white bg-white/10 px-2 py-0.5 rounded-full">{pctTareas}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F5A623] to-[#FFB94D] rounded-full transition-all duration-500" style={{ width: `${pctTareas}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          tarea={selectedTask}
          onClose={() => setSelectedTask(null)}
          onNavigate={(page) => { setSelectedTask(null); setCurrentPage(page); }}
        />
      )}
    </div>
  );
}
