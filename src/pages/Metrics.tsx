import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Plus, X, Lock, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase, isSupabaseReady, type MetricaSemanaV2 } from '../lib/supabase';
import { SEED_ROADMAP_V2 as SEED_ROADMAP } from '../lib/roadmapSeed';
import {
  calcularFunnelKPIs,
  diagnosticarEmbudo,
  formatPct,
  formatCurrency,
  formatNumber,
  nivelColor,
  nivelBgColor,
  EMPTY_METRICAS,
  type FunnelKPIs,
  type Diagnostico,
} from '../lib/funnelCalcs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getISOWeek(): string {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function loadMetricsLocal(): MetricaSemanaV2[] {
  try {
    const saved = localStorage.getItem('tcd_metrics_v2');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch { return []; }
}

function saveMetricsLocal(data: MetricaSemanaV2[]) {
  localStorage.setItem('tcd_metrics_v2', JSON.stringify(data));
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`card-panel p-4 rounded-2xl ${highlight ? 'border-[#F5A623]/30' : 'border-[rgba(245,166,35,0.1)]'}`}>
      <p className="text-[10px] text-[#FFFFFF]/40 uppercase tracking-widest mb-1.5 font-semibold">{label}</p>
      <p className={`text-2xl font-light tracking-tight ${highlight ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>{value}</p>
      {sub && <p className="text-xs text-[#FFFFFF]/40 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Diagnostic Card ─────────────────────────────────────────────────────────

function DiagnosticoCard({ d }: { d: Diagnostico }) {
  return (
    <div className={`rounded-xl p-4 border ${nivelBgColor(d.nivel)}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-bold uppercase tracking-wider ${nivelColor(d.nivel)}`}>
          {d.etapa}
        </p>
        <span className={`text-xs font-mono ${nivelColor(d.nivel)}`}>
          {d.valor !== null ? (d.etapa.includes('Costo') ? `$${d.valor.toFixed(0)}` : `${d.valor.toFixed(1)}%`) : '—'}
        </span>
      </div>
      <p className="text-sm text-[#FFFFFF]/80 leading-relaxed">{d.mensaje}</p>
    </div>
  );
}

// ─── 9-field Funnel Form ─────────────────────────────────────────────────────

const FUNNEL_FIELDS: { key: keyof MetricaSemanaV2; label: string; placeholder: string; prefix?: string }[] = [
  { key: 'gasto_ads', label: 'Gasto en Ads ($)', placeholder: '0', prefix: '$' },
  { key: 'mensajes_recibidos', label: 'Mensajes recibidos', placeholder: '0' },
  { key: 'formularios_completados', label: 'Formularios completados', placeholder: '0' },
  { key: 'agendados', label: 'Agendados', placeholder: '0' },
  { key: 'shows', label: 'Shows (se presentaron)', placeholder: '0' },
  { key: 'llamadas_tomadas', label: 'Llamadas tomadas', placeholder: '0' },
  { key: 'ventas_cerradas', label: 'Ventas cerradas', placeholder: '0' },
  { key: 'ingresos_cobrados', label: 'Ingresos cobrados ($)', placeholder: '0', prefix: '$' },
  { key: 'horas_trabajadas_semana', label: 'Horas trabajadas esta semana', placeholder: '0' },
];

// ─── Tab: Mi Progreso ────────────────────────────────────────────────────────

function TabProgreso({ userId }: { userId?: string }) {
  const [progData, setProgData] = useState({
    semanaActual: 1,
    totTareas: 90,
    compTareas: 0,
    diasDiario: 0,
    hitos: 0,
  });

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    const dInicio = p.fecha_inicio ? new Date(p.fecha_inicio) : new Date();
    const diff = Math.floor((new Date().getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
    const semActual = Math.max(1, Math.min(13, Math.floor(diff / 7) + 1));

    let tot = 0, comp = 0, hitosComp = 0;
    try {
      const saved = localStorage.getItem('tcd_hoja_ruta_v2');
      const completadasSet = new Set<string>(saved ? JSON.parse(saved) : []);
      for (const pil of SEED_ROADMAP) {
        const metasPilar = pil.metas ?? [];
        const compPilar = metasPilar.filter((m) => completadasSet.has(`${pil.numero}-${m.codigo}`)).length;
        tot += metasPilar.length;
        comp += compPilar;
        if (compPilar >= metasPilar.length && metasPilar.length > 0) hitosComp++;
      }
    } catch { /* noop */ }

    const diary = JSON.parse(localStorage.getItem('tcd_diario_v2') || '{}');
    const diasD = Array.isArray(diary.entries) ? diary.entries.length : 0;

    setProgData({ semanaActual: semActual, totTareas: tot, compTareas: comp, diasDiario: diasD, hitos: hitosComp });
  }, []);

  const chartData = Array.from({ length: 13 }).map((_, i) => ({
    semana: `S${i + 1}`,
    esperado: Math.round(((i + 1) / 13) * progData.totTareas),
    real: i + 1 <= progData.semanaActual ? Math.round(((i + 1) / progData.semanaActual) * progData.compTareas) : null,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="card-panel p-6 rounded-2xl bg-[#F5A623]/[0.03] border-[#F5A623]/10">
        <h2 className="text-xl font-medium text-[#FFFFFF] mb-2" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          Tu progreso en el Programa
        </h2>
        <p className="text-sm text-[#FFFFFF]/60">Semana {progData.semanaActual} de 13 · 90 días · ADN del Negocio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Tareas completadas" value={progData.compTareas.toString()} sub={`${progData.compTareas}/${progData.totTareas} del total`} />
        <KPICard label="Días con diario" value={progData.diasDiario.toString()} sub={`${progData.diasDiario}/90 totales`} />
        <KPICard label="Pilares completados" value={progData.hitos.toString()} sub={`${progData.hitos}/14 pilares`} />
        <KPICard label="Semana actual" value={progData.semanaActual.toString()} sub="de 13 semanas" highlight />
      </div>

      <div className="card-panel p-6 rounded-2xl">
        <h3 className="text-xs font-bold text-[#FFFFFF]/60 tracking-widest uppercase mb-6">Velocidad de Avance (Tareas)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,166,35,0.08)" vertical={false} />
              <XAxis dataKey="semana" stroke="rgba(245,166,35,0.2)" tick={{ fontSize: 11, fill: 'rgba(240,234,216,0.5)' }} />
              <YAxis stroke="rgba(245,166,35,0.2)" tick={{ fontSize: 11, fill: 'rgba(240,234,216,0.5)' }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1C1C1C', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="esperado" stroke="#6B7280" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Ritmo Esperado" />
              <Line type="monotone" dataKey="real" stroke="#F5A623" strokeWidth={3} dot={{ r: 4, fill: '#F5A623', strokeWidth: 0 }} name="Progreso Real" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Mi Embudo ──────────────────────────────────────────────────────────

function TabEmbudo({ userId }: { userId?: string }) {
  const [data, setData] = useState<MetricaSemanaV2[]>(loadMetricsLocal);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;
    supabase.from('metricas_v2').select('*').eq('user_id', userId).order('semana')
      .then(({ data: rows }) => {
        if (rows && rows.length > 0) {
          setData(rows as MetricaSemanaV2[]);
          saveMetricsLocal(rows as MetricaSemanaV2[]);
        }
      });
  }, [userId]);

  useEffect(() => {
    saveMetricsLocal(data);
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const semana = getISOWeek();

    const entry: MetricaSemanaV2 = {
      user_id: userId || '',
      semana,
      gasto_ads: parseFloat(formValues.gasto_ads || '0'),
      mensajes_recibidos: parseInt(formValues.mensajes_recibidos || '0'),
      formularios_completados: parseInt(formValues.formularios_completados || '0'),
      agendados: parseInt(formValues.agendados || '0'),
      shows: parseInt(formValues.shows || '0'),
      llamadas_tomadas: parseInt(formValues.llamadas_tomadas || '0'),
      ventas_cerradas: parseInt(formValues.ventas_cerradas || '0'),
      ingresos_cobrados: parseFloat(formValues.ingresos_cobrados || '0'),
      horas_trabajadas_semana: parseFloat(formValues.horas_trabajadas_semana || '0'),
    };

    if (isSupabaseReady() && supabase && userId) {
      await supabase.from('metricas_v2').upsert(
        { ...entry, user_id: userId },
        { onConflict: 'user_id,semana' },
      );
    }

    setData(prev => {
      const existing = prev.findIndex(m => m.semana === semana);
      if (existing >= 0) return prev.map((m, i) => i === existing ? entry : m);
      return [...prev, entry];
    });

    setFormValues({});
    setShowForm(false);
    setSaving(false);
  };

  // Current week metrics & KPIs
  const currentWeek: MetricaSemanaV2 = data[data.length - 1] ?? EMPTY_METRICAS;
  const kpis = calcularFunnelKPIs(currentWeek);
  const diagnosticos = diagnosticarEmbudo(kpis);

  // Chart data
  const chartData = data.map((m, i) => {
    const k = calcularFunnelKPIs(m);
    return {
      name: `S${i + 1}`,
      mensajes: m.mensajes_recibidos,
      agendados: m.agendados,
      ventas: m.ventas_cerradas,
      ingresos: m.ingresos_cobrados,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header + Add button */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-medium text-[#FFFFFF] mb-2" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            Mi Embudo de Ventas
          </h2>
          <p className="text-sm text-[#FFFFFF]/60">9 métricas semanales · 8 KPIs automáticos · Diagnóstico en tiempo real</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Cargar Semana
        </button>
      </div>

      {/* ── 9-field form ── */}
      {showForm && (
        <div className="card-panel p-6 rounded-2xl border-[#F5A623]/30 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium text-[#FFFFFF]">Cargar métricas de la semana</h3>
            <button onClick={() => setShowForm(false)} className="text-[#FFFFFF]/60 hover:text-[#FFFFFF]"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FUNNEL_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">{f.label}</label>
                  <div className="relative">
                    {f.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFFFFF]/30 text-sm">{f.prefix}</span>
                    )}
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formValues[f.key] || ''}
                      onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={`w-full input-field ${f.prefix ? 'pl-7' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar métricas de la semana'}
            </button>
          </form>
        </div>
      )}

      {data.length === 0 ? (
        <div className="card-panel p-12 rounded-2xl border border-dashed border-[rgba(245,166,35,0.2)] text-center">
          <TrendingUp className="w-12 h-12 text-[#F5A623]/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-[#FFFFFF]/80 mb-2">Todavía no hay métricas registradas</p>
          <p className="text-xs text-[#FFFFFF]/40 max-w-sm mx-auto">
            Cargá los datos de tu primera semana para ver los KPIs de tu embudo y el diagnóstico automático.
          </p>
        </div>
      ) : (
        <>
          {/* ── 8 KPIs grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Costo por mensaje"
              value={kpis.costo_por_mensaje !== null ? `$${kpis.costo_por_mensaje.toFixed(2)}` : '—'}
              sub="gasto / mensajes"
            />
            <KPICard
              label="DM → Formulario"
              value={formatPct(kpis.pct_dm_formulario !== null ? kpis.pct_dm_formulario * 100 : null)}
              sub="formularios / mensajes"
            />
            <KPICard
              label="Formulario → Agenda"
              value={formatPct(kpis.pct_formulario_agenda !== null ? kpis.pct_formulario_agenda * 100 : null)}
              sub="agendados / formularios"
            />
            <KPICard
              label="Tasa de Show"
              value={formatPct(kpis.pct_show !== null ? kpis.pct_show * 100 : null)}
              sub="shows / agendados"
            />
            <KPICard
              label="Tasa de Cierre"
              value={formatPct(kpis.tasa_cierre !== null ? kpis.tasa_cierre * 100 : null)}
              sub="ventas / llamadas"
              highlight
            />
            <KPICard
              label="Costo por Venta"
              value={kpis.cpv !== null ? formatCurrency(kpis.cpv) : '—'}
              sub="gasto / ventas"
            />
            <KPICard
              label="Pesos por Hora Real"
              value={kpis.phr !== null ? formatCurrency(kpis.phr) : '—'}
              sub="ingresos / horas mensuales"
              highlight
            />
            <KPICard
              label="Proyección Mensual"
              value={kpis.proyeccion_mensual !== null ? formatCurrency(kpis.proyeccion_mensual) : '—'}
              sub="ventas × 4.33 × ticket"
              highlight
            />
          </div>

          {/* ── 6 Diagnósticos ── */}
          {diagnosticos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#FFFFFF]/60 tracking-widest uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Diagnóstico del Embudo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnosticos.map((d, i) => (
                  <DiagnosticoCard key={i} d={d} />
                ))}
              </div>
            </div>
          )}

          {/* ── Evolution chart ── */}
          {chartData.length > 1 && (
            <div className="card-panel p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-[#FFFFFF]/60 tracking-widest uppercase">Evolución del Embudo</h3>
                <div className="flex gap-4 text-xs font-medium text-[#FFFFFF]/60">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" /> Mensajes</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#FFB94D]" /> Agendados</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Ventas</div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMensajes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} /><stop offset="95%" stopColor="#F5A623" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorAgendados" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFB94D" stopOpacity={0.3} /><stop offset="95%" stopColor="#FFB94D" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,166,35,0.08)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(245,166,35,0.2)" tick={{ fill: 'rgba(240,234,216,0.5)', fontSize: 11 }} />
                    <YAxis stroke="rgba(245,166,35,0.2)" tick={{ fill: 'rgba(240,234,216,0.5)', fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1C1C1C', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '8px', color: '#FFFFFF' }} />
                    <Area type="monotone" dataKey="mensajes" stroke="#F5A623" strokeWidth={2} fillOpacity={1} fill="url(#colorMensajes)" />
                    <Area type="monotone" dataKey="agendados" stroke="#FFB94D" strokeWidth={2} fillOpacity={1} fill="url(#colorAgendados)" />
                    <Area type="monotone" dataKey="ventas" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Metrics({ userId }: { userId?: string }) {
  const [tab, setTab] = useState<'progreso' | 'embudo'>('progreso');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('progreso')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'progreso'
              ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30'
              : 'bg-[#F5A623]/5 text-[#FFFFFF]/40 border border-transparent hover:bg-[#F5A623]/10 hover:text-[#FFFFFF]/80'
          }`}
        >
          Mi Progreso
        </button>
        <button
          onClick={() => setTab('embudo')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'embudo'
              ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30'
              : 'bg-[#F5A623]/5 text-[#FFFFFF]/40 border border-transparent hover:bg-[#F5A623]/10 hover:text-[#FFFFFF]/80'
          }`}
        >
          Mi Embudo
        </button>
      </div>

      {tab === 'progreso' ? <TabProgreso userId={userId} /> : <TabEmbudo userId={userId} />}
    </div>
  );
}
