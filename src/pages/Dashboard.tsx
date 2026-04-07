import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Clock, Calendar, Target, Play, Wrench, MessageCircle, Bot, Sparkles } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';
import type { RoadmapMeta } from '../lib/roadmapSeed';
import TaskDetailModal from '../components/TaskDetailModal';

function getTypeBadge(tipo?: string) {
  switch (tipo) {
    case 'VIDEO': return 'bg-[#D4A24E]/15 text-[#D4A24E] border-[#D4A24E]/25';
    case 'HERRAMIENTA': return 'bg-[#2DD4A0]/15 text-[#2DD4A0] border-[#2DD4A0]/25';
    case 'COACH': return 'bg-[#F5F0E1]/10 text-[#F5F0E1]/70 border-[#F5F0E1]/15';
    case 'AGENTE': return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
    default: return 'bg-[#F5F0E1]/5 text-[#F5F0E1]/50 border-[#F5F0E1]/10';
  }
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-panel p-5">
      <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-widest mb-2 font-semibold">{label}</p>
      <p className="text-2xl font-light text-[#F5F0E1] tracking-tight">{value}</p>
      <p className="text-xs text-[#F5F0E1]/50 mt-1">{sub}</p>
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
      <div className="relative overflow-hidden card-panel p-8 border border-[#D4A24E]/20 bg-gradient-to-br from-[#D4A24E]/[0.05] to-transparent">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A24E]/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <p className="text-2xl font-light text-[#F5F0E1] mb-2" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Buenos días, {nombreDisplay}.</p>
          <p className="text-sm text-[#F5F0E1]/60 max-w-lg mb-6 leading-relaxed">
            Estás en la <strong className="text-[#F5F0E1]/90">Semana {data.semanaActual} de 13</strong>. Tenés <strong className="text-[#D4A24E]">{data.tareasHoy.length} {data.tareasHoy.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}</strong> para avanzar con tu ADN.
          </p>
          <button onClick={() => setCurrentPage('roadmap')} className="text-[11px] font-bold text-[#D4A24E] hover:text-[#E2B865] transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-[#D4A24E]/10 px-4 py-2 rounded-lg border border-[#D4A24E]/20 w-max">
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
            <h2 className="text-[11px] font-bold text-[#F5F0E1] tracking-widest uppercase">Tu foco de hoy</h2>
            <button onClick={() => setCurrentPage('roadmap')} className="text-[10px] text-[#F5F0E1]/40 hover:text-[#D4A24E] uppercase font-bold tracking-wider transition-colors">
              Ir a tareas →
            </button>
          </div>

          <div className="space-y-3">
            {data.tareasHoy.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-[rgba(212,162,78,0.15)] rounded-xl bg-[#241A0C]/30">
                <CheckCircle2 className="w-8 h-8 text-[#2DD4A0]/50 mx-auto mb-3" />
                <p className="text-sm text-[#F5F0E1]/60">Todo al día. Estás libre.</p>
                <p className="text-xs text-[#F5F0E1]/30 mt-1">Revisá tu hoja de ruta para ver los próximos pilares.</p>
              </div>
            ) : data.tareasHoy.map((t, idx) => (
              <div
                key={idx}
                className="group flex items-start gap-4 p-4 rounded-xl bg-[#241A0C]/30 border border-[rgba(212,162,78,0.1)] hover:bg-[#241A0C]/60 hover:border-[rgba(212,162,78,0.25)] transition-all cursor-pointer"
                onClick={() => setSelectedTask(t)}
              >
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full border border-[#F5F0E1]/20 group-hover:border-[#D4A24E] transition-colors flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-transparent group-hover:bg-[#D4A24E] rounded-full" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F5F0E1]/90">{t.titulo}</p>
                  <p className="text-[10px] text-[#F5F0E1]/40 mt-1">{t.pilarTitulo}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wider ${getTypeBadge(t.tipo)}`}>
                      {t.tipo || `Pilar ${t.pilarNumero}`}
                    </span>
                    <span className="text-[10px] text-[#F5F0E1]/40 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {t.tiempo_estimado || '15–30 min'}
                    </span>
                    {(t.herramienta_id || t.agente_id) && (
                      <span className="text-[9px] text-[#D4A24E] font-bold uppercase tracking-wider">Ver herramienta →</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximo Hito (40%) */}
        <div className="lg:col-span-5 card-panel p-6 relative overflow-hidden flex flex-col justify-between border-[#D4A24E]/15 bg-gradient-to-br from-[#D4A24E]/[0.03] to-transparent">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4A24E]/10 blur-[50px] rounded-full" />

          {proximoHito ? (
            <>
              <div className="relative z-10">
                {/* Header with day counter */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[11px] font-bold text-[#D4A24E] tracking-widest uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4A24E] animate-pulse ring-4 ring-[#D4A24E]/20" /> Próximo hito
                  </h2>
                  <div className="flex items-center gap-1.5 bg-[#D4A24E]/10 px-3 py-1 rounded-full border border-[#D4A24E]/20">
                    <Sparkles className="w-3 h-3 text-[#D4A24E]" />
                    <span className="text-[10px] font-bold text-[#D4A24E]">Día {proximoHito.diaPrograma}/90</span>
                  </div>
                </div>

                {/* Pilar title */}
                <p className="text-xl font-medium text-[#F5F0E1] mb-1 line-clamp-2 leading-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{proximoHito.titulo}</p>
                <p className="text-xs text-[#F5F0E1]/40 mb-4">{proximoHito.subtitulo}</p>

                {/* Pending tasks mini-list */}
                {proximoHito.tareasRestantes.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {proximoHito.tareasRestantes.map((t, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-[#F5F0E1]/[0.03] border border-[#F5F0E1]/[0.06]">
                        {t.tipo === 'VIDEO' && <Play className="w-3 h-3 text-[#D4A24E] shrink-0" />}
                        {t.tipo === 'HERRAMIENTA' && <Wrench className="w-3 h-3 text-[#2DD4A0] shrink-0" />}
                        {t.tipo === 'COACH' && <MessageCircle className="w-3 h-3 text-[#F5F0E1]/60 shrink-0" />}
                        {t.tipo === 'AGENTE' && <Bot className="w-3 h-3 text-purple-400 shrink-0" />}
                        {!t.tipo && <Target className="w-3 h-3 text-[#F5F0E1]/40 shrink-0" />}
                        <span className="text-[11px] text-[#F5F0E1]/70 truncate">{t.titulo}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Motivational quote if available */}
                {proximoHito.hitoMensaje && (
                  <div className="px-3 py-2 rounded-lg border-l-2 border-[#D4A24E]/40 bg-[#D4A24E]/[0.04] mb-4">
                    <p className="text-[11px] text-[#F5F0E1]/50 italic leading-relaxed">{proximoHito.hitoMensaje}</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-[#F5F0E1]/50 font-bold uppercase tracking-wider">Progreso del pilar</span>
                  <span className="text-[10px] text-[#F5F0E1] bg-[#F5F0E1]/10 px-2 py-0.5 rounded-full">
                    {tareasRestantesHito === 0 ? 'Completado' : `${proximoHito.metasCompletadas}/${proximoHito.metasTotal}`}
                  </span>
                </div>
                <div className="h-2 bg-[#F5F0E1]/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4A24E] rounded-full transition-all duration-500" style={{ width: `${pctHito}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <Target className="w-10 h-10 text-[#2DD4A0]/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#2DD4A0]">Programa completado</p>
              <p className="text-xs text-[#F5F0E1]/40 mt-1 max-w-[180px]">Completaste todos los pilares del programa.</p>
            </div>
          )}
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
