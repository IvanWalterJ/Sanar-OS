import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, X } from 'lucide-react';

const INITIAL_METRICS = [
  { name: 'Sem 1', visitas: 400, leads: 24, ventas: 2 },
  { name: 'Sem 2', visitas: 600, leads: 35, ventas: 4 },
  { name: 'Sem 3', visitas: 800, leads: 45, ventas: 5 },
  { name: 'Sem 4', visitas: 1200, leads: 86, ventas: 12 },
];

function loadMetrics() {
  try {
    const saved = localStorage.getItem('tcd_metrics');
    return saved ? JSON.parse(saved) : INITIAL_METRICS;
  } catch { return INITIAL_METRICS; }
}

export default function Metrics() {
  const [data, setData] = useState(loadMetrics);

  const [showForm, setShowForm] = useState(false);
  const [newMetrics, setNewMetrics] = useState({ visitas: '', leads: '', ventas: '' });

  useEffect(() => {
    localStorage.setItem('tcd_metrics', JSON.stringify(data));
  }, [data]);

  const handleAddMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetrics.visitas || !newMetrics.leads || !newMetrics.ventas) return;

    const newEntry = {
      name: `Sem ${data.length + 1}`,
      visitas: parseInt(newMetrics.visitas),
      leads: parseInt(newMetrics.leads),
      ventas: parseInt(newMetrics.ventas),
    };

    setData([...data, newEntry]);
    setNewMetrics({ visitas: '', leads: '', ventas: '' });
    setShowForm(false);
  };

  const currentWeek = data[data.length - 1];
  const prevWeek = data[data.length - 2] || { visitas: 1, leads: 1, ventas: 1 }; // Evitar división por cero

  const calcTrend = (current: number, prev: number) => {
    const diff = ((current - prev) / prev) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Métricas</h1>
          <p className="text-gray-400">Semana {data.length} · Progreso del programa</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Cargar Semana
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-2xl border-blue-500/30 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Cargar Métricas: Semana {data.length + 1}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddMetrics} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Visitas Landing</label>
              <input 
                type="number" 
                value={newMetrics.visitas}
                onChange={(e) => setNewMetrics({...newMetrics, visitas: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                placeholder="Ej: 1500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Leads Captados</label>
              <input 
                type="number" 
                value={newMetrics.leads}
                onChange={(e) => setNewMetrics({...newMetrics, leads: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                placeholder="Ej: 120"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ventas Cerradas</label>
              <input 
                type="number" 
                value={newMetrics.ventas}
                onChange={(e) => setNewMetrics({...newMetrics, ventas: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                placeholder="Ej: 15"
                required
              />
            </div>
            <button type="submit" className="w-full py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors">
              Guardar
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Visitas Landing', value: currentWeek.visitas.toLocaleString(), trend: calcTrend(currentWeek.visitas, prevWeek.visitas), color: 'text-blue-400' },
          { label: 'Leads Captados', value: currentWeek.leads.toLocaleString(), trend: calcTrend(currentWeek.leads, prevWeek.leads), color: 'text-purple-400' },
          { label: 'Conversión (Visita a Lead)', value: `${((currentWeek.leads / currentWeek.visitas) * 100).toFixed(1)}%`, trend: '', color: 'text-pink-400' },
          { label: 'Ventas Cerradas', value: currentWeek.ventas.toLocaleString(), trend: calcTrend(currentWeek.ventas, prevWeek.ventas), color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-light text-white">{stat.value}</h3>
              {stat.trend && <span className={`text-sm font-medium ${stat.color}`}>{stat.trend}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-medium text-gray-200">Evolución del Embudo</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Visitas</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> Leads</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Ventas</div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="visitas" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitas)" />
              <Area type="monotone" dataKey="leads" stroke="#A855F7" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent">
        <h3 className="text-sm font-medium text-purple-400 mb-2">Diagnóstico IA de la Semana</h3>
        <p className="text-gray-300 text-sm leading-relaxed">
          Tus visitas a la landing aumentaron un {calcTrend(currentWeek.visitas, prevWeek.visitas)}, pero la conversión a leads está en {((currentWeek.leads / currentWeek.visitas) * 100).toFixed(1)}%. 
          <strong className="text-white font-medium"> Cuello de botella:</strong> La promesa en el hero section no está resonando con el nuevo tráfico.
          <br/><br/>
          <strong className="text-purple-300">Acción recomendada:</strong> Usá el Generador de Oferta para crear una variante "Ambiciosa" y testeala esta semana.
        </p>
      </div>
    </div>
  );
}
