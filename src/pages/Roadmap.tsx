import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP, RoadmapPilar } from '../lib/roadmapSeed';

export default function Roadmap({ userId }: { userId?: string }) {
  const [data, setData] = useState<RoadmapPilar[]>(() => {
    try {
      const saved = localStorage.getItem('tcd_roadmap_v2');
      if (saved) return JSON.parse(saved);
    } catch { /* noop */ }
    return SEED_ROADMAP;
  });

  const [filter, setFilter] = useState<'todas' | 'esta_semana' | 'pendientes' | 'completadas'>('todas');

  useEffect(() => {
    async function loadData() {
      if (isSupabaseReady() && supabase && userId) {
        const { data: tu } = await supabase
          .from('tareas_usuario')
          .select('*, tarea:tareas_template(*)')
          .eq('user_id', userId);

        if (tu && tu.length > 0) {
          setData(prev => prev.map(pilar => ({
            ...pilar,
            semanas: pilar.semanas.map(sem => ({
              ...sem,
              tareas: sem.tareas.map(t => {
                const dbTask = tu.find(u => u.tarea?.titulo === t.titulo);
                if (dbTask) return { ...t, status: dbTask.estado };
                return t;
              })
            }))
          })));
        }
      }
    }
    loadData();
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('tcd_roadmap_v2', JSON.stringify(data));
  }, [data]);

  const togglePilar = (pilarId: number) => {
    setData(prev => prev.map(p => p.id === pilarId ? { ...p, expanded: !p.expanded } : p));
  };

  const toggleTask = (pilarId: number, semNum: number, taskId: string) => {
    setData(prev => prev.map(p => {
      if (p.id !== pilarId) return p;
      return {
        ...p,
        semanas: p.semanas.map(s => {
          if (s.numero !== semNum) return s;
          return {
            ...s,
            tareas: s.tareas.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, status: t.status === 'completada' ? 'pendiente' : 'completada' };
            })
          };
        })
      };
    }));
    // To-Do: Sync to supabase individually if needed.
  };

  function getCategoryColor(cat: string) {
    switch (cat) {
      case 'Oferta': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Sistema': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Contenido': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'Mentalidad': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  }

  let totalCount = 0;
  let completedCount = 0;
  data.forEach(p => p.semanas.forEach(s => s.tareas.forEach(t => {
    totalCount++;
    if (t.status === 'completada') completedCount++;
  })));
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="glass-panel p-6 rounded-2xl">
        <h1 className="text-2xl font-light text-white flex items-center gap-2">
          🗺️ Hoja de Ruta
        </h1>
        <p className="text-sm text-gray-400 mt-1">Programa: Implementación 90 días</p>
        
        <div className="mt-6 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            <span>Progreso global</span>
            <span>{progressPct}% — {completedCount} de {totalCount} tareas</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-2">
        {['todas', 'esta_semana', 'pendientes', 'completadas'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'}`}>
            {f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {data.map(pilar => {
          const pTotal = pilar.semanas.reduce((acc, s) => acc + s.tareas.length, 0);
          const pComp = pilar.semanas.reduce((acc, s) => acc + s.tareas.filter(t => t.status === 'completada').length, 0);
          const pPct = pTotal === 0 ? 0 : Math.round((pComp / pTotal) * 100);

          return (
            <div key={pilar.id} className="glass-panel overflow-hidden rounded-2xl">
              <button onClick={() => togglePilar(pilar.id)} className="w-full p-5 flex flex-col gap-4 hover:bg-white/[0.02] transition-colors text-left">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-white tracking-widest uppercase flex items-center gap-2">
                    <span className="text-xl">{pilar.emoji}</span> PILAR {pilar.id} — {pilar.titulo}
                  </h2>
                  {pilar.expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/50 rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium shrink-0 uppercase">{pPct}% · {pComp} de {pTotal} tareas</span>
                </div>
              </button>
              
              {pilar.expanded && (
                <div className="p-5 pt-0 border-t border-white/5 space-y-8 mt-4">
                  {pilar.semanas.map(sem => {
                    const visibleTasks = sem.tareas.filter(t => {
                      if (filter === 'pendientes') return t.status !== 'completada';
                      if (filter === 'completadas') return t.status === 'completada';
                      if (filter === 'esta_semana') return sem.numero === 6; // Hardcoded semana actual por ahora
                      return true;
                    });
                    if (visibleTasks.length === 0) return null;

                    return (
                      <div key={sem.numero} className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-l-2 border-indigo-500/30 pl-3">
                          SEMANA {sem.numero} — {sem.titulo}
                        </h3>
                        <div className="space-y-2">
                          {visibleTasks.map(t => (
                            <div key={t.id} onClick={() => toggleTask(pilar.id, sem.numero, t.id)}
                              className={`group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border ${t.status === 'completada' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}>
                              <div className="shrink-0 mt-0.5">
                                {t.status === 'completada' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${t.status === 'completada' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                  {t.titulo}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border tracking-wide ${getCategoryColor(t.categoria)}`}>
                                    {t.categoria}
                                  </span>
                                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3" /> {t.tiempo_estimado}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
