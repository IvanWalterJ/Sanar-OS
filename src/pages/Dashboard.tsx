import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Clock, Calendar, Target } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';
import type { RoadmapMeta } from '../lib/roadmapSeed';
import TaskDetailModal from '../components/TaskDetailModal';

function getCategoryColor(cat: string) {
  if (!cat) return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  switch (cat.toLowerCase()) {
    case 'oferta': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'sistema': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'contenido': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    case 'mentalidad': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 bg-white/[0.01]">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">{label}</p>
      <p className="text-2xl font-light text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

interface TareaHoy extends RoadmapMeta {
  pilarNumero: number;
  pilarTitulo: string;
}

interface ProximoHito {
  titulo: string;
  pilarNumero: number;
  metasTotal: number;
  metasCompletadas: number;
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
      // 1. Load profile from localStorage
      const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
      const dInicio = p.fecha_inicio ? new Date(p.fecha_inicio) : new Date();
      const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
      const semActual = Math.max(1, Math.min(12, Math.floor(diff / 7) + 1));

      // 2. Load completadas from localStorage (same key as Roadmap.tsx)
      let completadasSet: Set<string>;
      try {
        const saved = localStorage.getItem('tcd_hoja_ruta_v2');
        completadasSet = saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        completadasSet = new Set();
      }

      // 3. Calculate totals iterating pil.metas (correct structure)
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

        // Show up to 3 pending tasks from unlocked pilars (pilar 0 is always unlocked)
        if (tareasHoy.length < 3) {
          for (const meta of metasPilar) {
            if (!completadasSet.has(`${pil.numero}-${meta.codigo}`) && tareasHoy.length < 3) {
              tareasHoy.push({ ...meta, pilarNumero: pil.numero, pilarTitulo: pil.titulo });
            }
          }
        }
      }

      // 4. Calculate "Próximo Hito" — first pilar not fully completed
      let hito: ProximoHito | null = null;
      for (const pil of SEED_ROADMAP_V2) {
        const metasPilar = pil.metas ?? [];
        const completadasPilar = metasPilar.filter((m) => completadasSet.has(`${pil.numero}-${m.codigo}`)).length;
        if (completadasPilar < metasPilar.length) {
          hito = {
            titulo: pil.titulo,
            pilarNumero: pil.numero,
            metasTotal: metasPilar.length,
            metasCompletadas: completadasPilar,
          };
          break;
        }
      }

      // 5. Diary streak from localStorage
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

      // 6. Fetch from Supabase if available
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
              sHito = { titulo: pil.titulo, pilarNumero: pil.numero, metasTotal: metasPilar.length, metasCompletadas: completadasPilar };
              break;
            }
          }

          setData(prev => ({ ...prev, totalTareas: sTot, completadas: sComp, pilaresCompletados: sPilaresComp, tareasHoy: sTareasHoy }));
          setProximoHito(sHito);
        }

        // Diary streak from Supabase
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
      <div className="relative overflow-hidden glass-panel p-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <p className="text-2xl font-light text-white mb-2">Buenos días, {nombreDisplay}. 🌿</p>
          <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">
            Estás en la <strong className="text-gray-200">Semana {data.semanaActual} de 12</strong>. Hoy tenés <strong className="text-indigo-400">{data.tareasHoy.length} {data.tareasHoy.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}</strong> orientadas a tu objetivo.
          </p>
          <button onClick={() => setCurrentPage('roadmap')} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 w-max">
            Ver hoja de ruta <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ZONA B — 4 tarjetas de métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Semana actual" value={`${data.semanaActual}/12`} sub="Del programa" />
        <MetricCard label="Pilares completados" value={`${data.pilaresCompletados}/${SEED_ROADMAP_V2.length}`} sub="Desbloqueados" />
        <MetricCard label="Tareas completadas" value={`${data.completadas}/${data.totalTareas}`} sub={`${pctTareas}% del total`} />
        <MetricCard label="Días de diario" value={`${data.racha}`} sub={data.racha > 0 ? `${data.racha} entradas` : 'Sin entradas aún'} />
      </div>

      {/* ZONA C — Dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Foco de Hoy (60%) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[11px] font-bold text-white tracking-widest uppercase">Tu foco de hoy</h2>
            <button onClick={() => setCurrentPage('roadmap')} className="text-[10px] text-gray-500 hover:text-indigo-400 uppercase font-bold tracking-wider transition-colors">
              Ir a tareas →
            </button>
          </div>

          <div className="space-y-3">
            {data.tareasHoy.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-3" />
                <p className="text-sm text-gray-400">¡Todo al día! Estás libre.</p>
                <p className="text-xs text-gray-600 mt-1">Revisá tu hoja de ruta para ver los próximos pilares.</p>
              </div>
            ) : data.tareasHoy.map((t, idx) => (
              <div
                key={idx}
                className="group flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer"
                onClick={() => setSelectedTask(t)}
              >
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-indigo-500 transition-colors flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-transparent group-hover:bg-indigo-500 rounded-full" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{t.titulo}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{t.pilarTitulo}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wider ${getCategoryColor('')}`}>
                      Pilar {t.pilarNumero}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {t.tiempo_estimado || '15–30 min'}
                    </span>
                    {(t.herramienta_id || t.agente_id) && (
                      <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Ver herramienta →</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximo Hito (40%) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.02] to-transparent">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full" />

          {proximoHito ? (
            <>
              <div>
                <h2 className="text-[11px] font-bold text-indigo-400 tracking-widest uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ring-4 ring-indigo-500/20" /> Próximo hito
                </h2>
                <p className="text-xl font-medium text-white mb-3 line-clamp-2 leading-tight">{proximoHito.titulo}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Pilar {proximoHito.pilarNumero}
                </p>
              </div>

              <div className="mt-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Progreso del hito</span>
                  <span className="text-[10px] text-white bg-white/10 px-2 py-0.5 rounded-full">
                    {tareasRestantesHito === 0 ? 'Completado' : `Faltan ${tareasRestantesHito} ${tareasRestantesHito === 1 ? 'tarea' : 'tareas'}`}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pctHito}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <Target className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-emerald-400">¡Programa completado!</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[180px]">Completaste todos los pilares del programa.</p>
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
