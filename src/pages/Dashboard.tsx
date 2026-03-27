import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP_V2 as SEED_ROADMAP } from '../lib/roadmapSeed';

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
      <p className="text-xs text-emerald-400 mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard({ setCurrentPage, userId }: { setCurrentPage: (page: string) => void, userId?: string }) {
  const [data, setData] = useState({
    profile: { nombre: 'Fundadora', fecha_inicio: new Date().toISOString() },
    semanaActual: 1,
    totalTareas: 90,
    completadas: 0,
    tareasHoy: [] as any[],
    hitosCompletados: 0,
    racha: 0
  });

  useEffect(() => {
    async function loadData() {
      // 1. Load Local
      const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
      const dInicio = p.fecha_inicio ? new Date(p.fecha_inicio) : new Date();
      const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
      const semActual = Math.max(1, Math.min(12, Math.floor(diff / 7) + 1));
      
      let tot = 0;
      let comp = 0;
      let hoy: any[] = [];
      const rm = JSON.parse(localStorage.getItem('tcd_roadmap_v2') || JSON.stringify(SEED_ROADMAP));
      
      rm.forEach((pil: any) => pil.semanas.forEach((s: any) => s.tareas.forEach((t: any) => {
        tot++;
        if (t.status === 'completada') comp++;
        else if (s.numero <= semActual && hoy.length < 3) hoy.push(t);
      })));

      const diary = JSON.parse(localStorage.getItem('tcd_diary') || '{}');
      const rachaLocal = diary.entries ? diary.entries.length : 0; // Aproximado

      setData({
        profile: { nombre: p.nombre || 'Fundadora', fecha_inicio: p.fecha_inicio || new Date().toISOString() },
        semanaActual: semActual,
        totalTareas: tot,
        completadas: comp,
        tareasHoy: hoy,
        hitosCompletados: Math.max(0, semActual > 3 ? 1 : 0), // Mock dinámico
        racha: rachaLocal
      });

      // 2. Fetch from Supabase
      if (isSupabaseReady() && supabase && userId) {
        // Tareas
        const { data: tu } = await supabase.from('tareas_usuario').select('*, tarea:tareas_template(*)').eq('user_id', userId);
        if (tu && tu.length > 0) {
          let sTot = 0, sComp = 0;
          let sHoy: any[] = [];
          rm.forEach((pil: any) => pil.semanas.forEach((s: any) => s.tareas.forEach((t: any) => {
            sTot++;
            const dbT = tu.find((u: any) => u.tarea?.titulo === t.titulo);
            const status = dbT ? dbT.estado : t.status;
            if (status === 'completada') sComp++;
            else if (s.numero <= semActual && sHoy.length < 3) sHoy.push({ ...t, status });
          })));
          
          setData(prev => ({ ...prev, totalTareas: sTot, completadas: sComp, tareasHoy: sHoy }));
        }
        
        // Diario Racha
        const { data: qd } = await supabase.from('diario_entradas').select('id').eq('user_id', userId);
        if (qd) setData(prev => ({ ...prev, racha: qd.length }));
      }
    }
    loadData();
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* ZONA A — Header contextual */}
      <div className="relative overflow-hidden glass-panel p-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <p className="text-2xl font-light text-white mb-2">Buenos días, {data.profile.nombre}. 🌿</p>
          <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">
            Estás en la <strong className="text-gray-200">Semana {data.semanaActual} de 12</strong>. Hoy tenés <strong className="text-indigo-400">{data.tareasHoy.length} tareas pendientes</strong> orientadas a tu objetivo.
          </p>
          <button onClick={() => setCurrentPage('roadmap')} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 w-max">
            Ver hoja de ruta <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ZONA B — 4 tarjetas de métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Semanas completadas" value={`${data.semanaActual}/12`} sub="En tiempo ✅" />
        <MetricCard label="Hitos alcanzados" value={`${data.hitosCompletados}/8`} sub="+1 esta semana" />
        <MetricCard label="Tareas completadas" value={`${data.completadas}/${data.totalTareas || 90}`} sub={`${Math.round((data.completadas/Math.max(1, data.totalTareas))*100)}% del total`} />
        <MetricCard label="Racha de diario" value={`${data.racha} días`} sub="🔥 récord" />
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
                 <p className="text-sm text-gray-400">Todo al día. Estás libre.</p>
               </div>
            ) : data.tareasHoy.map((t, idx) => (
              <div key={idx} className="group flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer" onClick={() => setCurrentPage('roadmap')}>
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-indigo-500 transition-colors flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-transparent group-hover:bg-indigo-500 rounded-full" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{t.titulo}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wider ${getCategoryColor(t.categoria)}`}>
                      {t.categoria || 'Generica'}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {t.tiempo_estimado || '15 min'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximo Hito (40%) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.02] to-transparent">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full" />
          
          <div>
            <h2 className="text-[11px] font-bold text-indigo-400 tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ring-4 ring-indigo-500/20" /> Próximo hito
            </h2>
            <p className="text-xl font-medium text-white mb-3 line-clamp-2 leading-tight">Sistema automatizado funcionando</p>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Semana 8 (en {Math.max(1, 8 - data.semanaActual)} semanas)
            </p>
          </div>

          <div className="mt-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Progreso del hito</span>
              <span className="text-[10px] text-white bg-white/10 px-2 py-0.5 rounded-full">Faltan 3 tareas</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
