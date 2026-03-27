import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Plus, X, Lock, CheckCircle2, Clock } from 'lucide-react';
import { supabase, isSupabaseReady, type MetricaSemana } from '../lib/supabase';
import { SEED_ROADMAP_V2 as SEED_ROADMAP } from '../lib/roadmapSeed';

interface LocalMetric {
  name: string;
  semana?: string;
  visitas: number;
  leads: number;
  ventas: number;
}

const INITIAL_METRICS: LocalMetric[] = [
  { name: 'Sem 1', visitas: 400, leads: 24, ventas: 2 },
  { name: 'Sem 2', visitas: 600, leads: 35, ventas: 4 },
  { name: 'Sem 3', visitas: 800, leads: 45, ventas: 5 },
  { name: 'Sem 4', visitas: 1200, leads: 86, ventas: 12 },
];

function getISOWeek(): string {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function loadMetricsLocal(): LocalMetric[] {
  try {
    const saved = localStorage.getItem('tcd_metrics');
    return saved ? JSON.parse(saved) : INITIAL_METRICS;
  } catch { return INITIAL_METRICS; }
}

function saveMetricsLocal(data: LocalMetric[]) {
  localStorage.setItem('tcd_metrics', JSON.stringify(data));
}

function fromSupabase(rows: MetricaSemana[]): LocalMetric[] {
  return rows.map((m, i) => ({
    name: `Sem ${i + 1}`,
    semana: m.semana,
    visitas: m.conversaciones,
    leads: m.leads,
    ventas: m.ventas,
  }));
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border-white/5 bg-white/[0.01]">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">{label}</p>
      <p className="text-3xl font-light text-white tracking-tight">{value}</p>
      <p className="text-xs text-emerald-400 mt-1">{sub}</p>
    </div>
  );
}

const HITOS = [
  { id: 1, title: 'Identidad y propósito definidos', sem: 1 },
  { id: 2, title: 'Oferta con precio y promesa', sem: 2 },
  { id: 3, title: 'WhatsApp Business + agenda', sem: 3 },
  { id: 4, title: 'CRM activo con pipeline', sem: 4 },
  { id: 5, title: 'Primera campaña de anuncios activa', sem: 6 },
  { id: 6, title: 'Primeros $5.000 USD generados', sem: 8 },
  { id: 7, title: 'Sistema automatizado funcionando', sem: 10 },
  { id: 8, title: '$10.000 USD/mes → Graduación', sem: 12 },
];

function TabProgreso({ userId }: { userId?: string }) {
  const [progData, setProgData] = useState({
     semanaActual: 1,
     totTareas: 90,
     compTareas: 0,
     diasDiario: 0,
     hitos: 0
  });

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    const dInicio = p.fecha_inicio ? new Date(p.fecha_inicio) : new Date();
    const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
    const semActual = Math.max(1, Math.min(12, Math.floor(diff / 7) + 1));

    let tot = 0, comp = 0;
    const rm = JSON.parse(localStorage.getItem('tcd_roadmap_v2') || JSON.stringify(SEED_ROADMAP));
    rm.forEach((pil: any) => pil.semanas.forEach((s: any) => s.tareas.forEach((t: any) => {
      tot++;
      if (t.status === 'completada') comp++;
    })));

    const diary = JSON.parse(localStorage.getItem('tcd_diary') || '{}');
    const diasD = diary.entries ? diary.entries.length : 0;
    const hitos = Math.max(0, semActual > 3 ? 1 : 0); 
    
    setProgData({ semanaActual: semActual, totTareas: tot, compTareas: comp, diasDiario: diasD, hitos });
  }, []);

  const chartData = Array.from({length: 12}).map((_, i) => ({
    semana: `S${i+1}`,
    esperado: Math.round(((i+1)/12)*progData.totTareas),
    real: i+1 <= progData.semanaActual ? Math.round(((i+1)/progData.semanaActual)*progData.compTareas) : null
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel p-6 rounded-2xl bg-indigo-500/[0.02] border-indigo-500/10">
         <h2 className="text-xl font-medium text-white mb-2 flex items-center gap-2">📊 Tu progreso en el Programa Implementación 90 días</h2>
         <p className="text-sm text-gray-400">Semana {progData.semanaActual} de 12 · En tiempo · Próximo check-in: lunes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <MetricCard label="Tareas completadas" value={progData.compTareas.toString()} sub={`${progData.compTareas}/${progData.totTareas} del total`} />
         <MetricCard label="Días con diario" value={progData.diasDiario.toString()} sub={`${progData.diasDiario}/84 totales`} />
         <MetricCard label="Hitos alcanzados" value={progData.hitos.toString()} sub={`${progData.hitos}/${HITOS.length} en proceso`} />
         <MetricCard label="Sesiones 1-1" value={`2`} sub="de 3 usadas" />
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-6">Velocidad de Avance (Tareas)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
             <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
               <XAxis dataKey="semana" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
               <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
               <RechartsTooltip contentStyle={{ backgroundColor: '#1A1A1C', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
               <Line type="monotone" dataKey="esperado" stroke="#6B7280" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Ritmo Esperado" />
               <Line type="monotone" dataKey="real" stroke="#6366F1" strokeWidth={3} dot={{r: 4, fill: '#6366F1', strokeWidth: 0}} name="Progreso Real" />
             </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl">
         <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-10">Los 8 Hitos del Programa</h3>
         <div className="relative border-l-2 border-white/10 ml-4 space-y-10">
            {HITOS.map((h, i) => {
              const isComp = h.id <= progData.hitos;
              const isNext = h.id === progData.hitos + 1;
              const isLock = h.id > progData.hitos + 1;

              return (
                <div key={h.id} className="relative pl-8 group">
                   <div className={`absolute -left-[1.15rem] w-9 h-9 rounded-full flex items-center justify-center border-[4px] border-[#0A0A0B] ${isComp ? 'bg-emerald-500' : isNext ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 border-white/10'}`}>
                      {isComp && <CheckCircle2 className="w-4 h-4 text-white" />}
                      {isNext && <Clock className="w-4 h-4 text-white" />}
                      {isLock && <Lock className="w-3.5 h-3.5 text-gray-500" />}
                   </div>
                   
                   <div className="pt-1">
                     <div className="flex items-center gap-3">
                       <h4 className={`text-[15px] font-medium ${isComp ? 'text-gray-400 line-through' : isNext ? 'text-white' : 'text-gray-500'}`}>Hito {h.id} — {h.title}</h4>
                       {isNext && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest animate-pulse border border-indigo-500/30">Próximo</span>}
                     </div>
                     <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">Semana objetivo: {h.sem}</p>
                     
                     {isNext && (
                       <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-200 leading-relaxed max-w-lg">
                         <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] mr-2">Falta:</span> 
                         Tareas de automatización y configuración de campaña según Hoja de Ruta.
                       </div>
                     )}
                   </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
}

function TabNegocio({ userId }: { userId?: string }) {
  const [data, setData] = useState<LocalMetric[]>(loadMetricsLocal);
  const [showForm, setShowForm] = useState(false);
  const [newMetrics, setNewMetrics] = useState({ visitas: '', leads: '', ventas: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;
    supabase.from('metricas').select('*').eq('user_id', userId).order('semana')
      .then(({ data: rows }) => {
        if (rows && rows.length > 0) {
          const mapped = fromSupabase(rows as MetricaSemana[]);
          setData(mapped);
          saveMetricsLocal(mapped);
        }
      });
  }, [userId]);

  useEffect(() => {
    saveMetricsLocal(data);
  }, [data]);

  const handleAddMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetrics.visitas || !newMetrics.leads || !newMetrics.ventas) return;

    setSaving(true);
    const semana = getISOWeek();
    const newEntry: LocalMetric = {
      name: `Sem ${data.length + 1}`,
      semana,
      visitas: parseInt(newMetrics.visitas),
      leads: parseInt(newMetrics.leads),
      ventas: parseInt(newMetrics.ventas),
    };

    if (isSupabaseReady() && supabase && userId) {
      await supabase.from('metricas').upsert(
          { user_id: userId, semana, conversaciones: newEntry.visitas, leads: newEntry.leads, ventas: newEntry.ventas },
          { onConflict: 'user_id,semana' }
      );
    }

    setData(prev => {
      const existing = prev.findIndex(m => m.semana === semana);
      if (existing >= 0) return prev.map((m, i) => i === existing ? newEntry : m);
      return [...prev, newEntry];
    });

    setNewMetrics({ visitas: '', leads: '', ventas: '' });
    setShowForm(false);
    setSaving(false);
  };

  const currentWeek = data[data.length - 1] ?? { visitas: 0, leads: 0, ventas: 0 };
  const prevWeek = data[data.length - 2] ?? { visitas: 1, leads: 1, ventas: 1 };

  const calcTrend = (current: number, prev: number) => {
    if (prev === 0) return '';
    const diff = ((current - prev) / prev) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
           <h2 className="text-xl font-medium text-white mb-2">📈 Mi Negocio (Embudo de Ventas)</h2>
           <p className="text-sm text-gray-400">Rendimiento del sistema de captación</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Cargar Semana
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-2xl border-blue-500/30 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Cargar Métricas: {data.length + 1}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleAddMetrics} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Visitas Landing</label>
              <input type="number" value={newMetrics.visitas} onChange={e => setNewMetrics({ ...newMetrics, visitas: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500/50" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Leads Captados</label>
              <input type="number" value={newMetrics.leads} onChange={e => setNewMetrics({ ...newMetrics, leads: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500/50" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ventas Cerradas</label>
              <input type="number" value={newMetrics.ventas} onChange={e => setNewMetrics({ ...newMetrics, ventas: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500/50" required />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Visitas Landing', value: currentWeek.visitas.toLocaleString(), trend: calcTrend(currentWeek.visitas, prevWeek.visitas), color: 'text-blue-400' },
          { label: 'Leads Captados', value: currentWeek.leads.toLocaleString(), trend: calcTrend(currentWeek.leads, prevWeek.leads), color: 'text-purple-400' },
          { label: 'Conversión a Lead', value: currentWeek.visitas > 0 ? `${((currentWeek.leads / currentWeek.visitas) * 100).toFixed(1)}%` : '—', trend: '', color: 'text-pink-400' },
          { label: 'Ventas Cerradas', value: currentWeek.ventas.toLocaleString(), trend: calcTrend(currentWeek.ventas, prevWeek.ventas), color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-light text-white tracking-tight">{stat.value}</h3>
              {stat.trend && <span className={`text-[11px] font-bold ${stat.color}`}>{stat.trend}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-semibold text-gray-200 tracking-widest uppercase">Evolución del Embudo</h3>
          <div className="flex gap-4 text-xs font-medium text-gray-400">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Visitas</div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Leads</div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="visitas" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitas)" />
              <Area type="monotone" dataKey="leads" stroke="#A855F7" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function Metrics({ userId }: { userId?: string }) {
  const [tab, setTab] = useState<'progreso' | 'negocio'>('progreso');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex gap-2">
        <button onClick={() => setTab('progreso')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === 'progreso' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10 hover:text-gray-300'}`}>
          Mi Progreso en el Programa
        </button>
        <button onClick={() => setTab('negocio')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === 'negocio' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10 hover:text-gray-300'}`}>
          Mi Negocio
        </button>
      </div>

      {tab === 'progreso' ? <TabProgreso userId={userId} /> : <TabNegocio userId={userId} />}
    </div>
  );
}
