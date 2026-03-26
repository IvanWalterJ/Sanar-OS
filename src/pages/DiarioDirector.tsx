import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2, Calendar, Flame, History, Check } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { toast } from 'sonner';

interface DiaryEntry {
  id: string;
  fecha: string;
  respuestas: {
    estado: string;
    victoria: string;
    aprendizaje: string;
    foco: string;
    cuello: string;
    metrica: string;
  };
}

const ESTADOS = [
  { id: 'imparable', emoji: '🔥', label: 'Imparable' },
  { id: 'bien', emoji: '👍', label: 'Bien' },
  { id: 'remando', emoji: '😐', label: 'Remando' },
  { id: 'bloqueado', emoji: '🆘', label: 'Bloqueado' },
];

const METRICAS = ['Leads', 'Llamadas', 'Ventas', 'Entrega', 'Otro'];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function calcStreak(entries: DiaryEntry[]): number {
  return entries.length; // Simply counting total check-ins for the streak
}

export default function DiarioDirector({ userId }: { userId?: string }) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [respuestas, setRespuestas] = useState({
    estado: 'bien',
    victoria: '',
    aprendizaje: '',
    foco: '',
    cuello: '',
    metrica: 'Leads'
  });

  const todayStr = getTodayStr();
  const todayEntry = entries.find(e => e.fecha === todayStr);
  const streak = calcStreak(entries);

  useEffect(() => {
    // 1. Initial local load
    try {
      const saved = localStorage.getItem('tcd_diary_weekly');
      if (saved) setEntries(JSON.parse(saved));
    } catch { /* noop */ }

    // 2. Load from Supabase
    if (!isSupabaseReady() || !supabase || !userId) return;

    setLoading(true);
    supabase
      .from('diario_entradas')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const formatted = data.map((d: any) => ({
            id: String(d.id),
            fecha: d.fecha,
            respuestas: {
              estado: d.respuestas.estado || 'bien',
              victoria: d.respuestas.victoria || d.respuestas.q1 || '',
              aprendizaje: d.respuestas.aprendizaje || d.respuestas.q4 || '',
              foco: d.respuestas.foco || d.respuestas.q5 || '',
              cuello: d.respuestas.cuello || d.respuestas.q2 || '',
              metrica: d.respuestas.metrica || 'Otro',
            }
          }));
          setEntries(formatted);
          localStorage.setItem('tcd_diary_weekly', JSON.stringify(formatted));
        }
      })
      .then(() => setLoading(false), () => setLoading(false));
  }, [userId]);

  const handleSubmit = async () => {
    if (!respuestas.victoria.trim() || !respuestas.aprendizaje.trim() || !respuestas.foco.trim()) {
      toast.error('Por favor, completá los campos principales (Victoria, Aprendizaje, Foco).');
      return;
    }

    setSaving(true);
    try {
      let entryId = String(Date.now());
      const newEntry: DiaryEntry = { id: entryId, fecha: todayStr, respuestas: { ...respuestas } };

      if (isSupabaseReady() && supabase && userId) {
        const { data: saved } = await supabase
          .from('diario_entradas')
          .upsert(
            { user_id: userId, fecha: todayStr, respuestas: { ...respuestas } },
            { onConflict: 'user_id,fecha' }
          )
          .select()
          .single();

        if (saved) newEntry.id = String(saved.id);
      }

      const updatedEntries = [newEntry, ...entries.filter(e => e.fecha !== todayStr)];
      setEntries(updatedEntries);
      localStorage.setItem('tcd_diary_weekly', JSON.stringify(updatedEntries));
      
      toast.success('Check-in semanal guardado correctamente.');
    } catch (e) {
      toast.error('Ocurrió un error al guardar el Check-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Check-in de Lunes</h1>
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-bold">{streak} check-ins</span>
          </div>
        )}
      </div>

      {loading && entries.length === 0 && (
        <div className="flex items-center gap-2 text-indigo-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...
        </div>
      )}

      {!todayEntry && (
        <div className="glass-panel p-8 rounded-2xl border-white/5 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Reflexión estratégica</h2>
              <p className="text-sm text-gray-400">Frenar 5 minutos para alinear el foco y acelerar el doble.</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* 1. Estado */}
            <div>
               <label className="block text-sm text-gray-300 font-bold mb-3 uppercase tracking-wider">1. ¿Cómo es tu estado general?</label>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                 {ESTADOS.map(e => (
                   <button 
                     key={e.id}
                     onClick={() => setRespuestas({...respuestas, estado: e.id})}
                     className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                       respuestas.estado === e.id 
                         ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                         : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/10'
                     }`}
                   >
                     <span className={`text-2xl transition-transform ${respuestas.estado === e.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                       {e.emoji}
                     </span>
                     <span className="text-xs font-bold uppercase tracking-wider">{e.label}</span>
                   </button>
                 ))}
               </div>
            </div>

            {/* 2 & 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-300 font-bold mb-3 uppercase tracking-wider">2. Principal victoria (Semana pasada)</label>
                <textarea 
                  placeholder="¿Qué salió bien? ¿Qué avance lograste?" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none h-28 transition-all" 
                  value={respuestas.victoria} 
                  onChange={e => setRespuestas({...respuestas, victoria: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 font-bold mb-3 uppercase tracking-wider">3. Mayor aprendizaje o error</label>
                <textarea 
                  placeholder="¿De qué te diste cuenta? ¿Qué vas a evitar hacer esta semana?" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none h-28 transition-all" 
                  value={respuestas.aprendizaje} 
                  onChange={e => setRespuestas({...respuestas, aprendizaje: e.target.value})} 
                />
              </div>
            </div>

            {/* 4 */}
            <div>
              <label className="block text-sm text-indigo-300 font-bold mb-3 uppercase tracking-wider">4. Foco Único de esta semana</label>
              <textarea 
                placeholder='"Si solo pudiera hacer una cosa esta semana y sentir que valió la pena, sería..."' 
                className="w-full bg-indigo-500/5 border border-indigo-500/30 rounded-xl p-5 text-white text-base focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none h-24 placeholder-indigo-300/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]" 
                value={respuestas.foco} 
                onChange={e => setRespuestas({...respuestas, foco: e.target.value})} 
              />
            </div>

            {/* 5 */}
            <div>
              <label className="block text-sm text-gray-300 font-bold mb-3 uppercase tracking-wider">5. Cuellos de botella</label>
              <textarea 
                placeholder="¿Qué te está impidiendo avanzar más rápido? ¿Necesitas resolver algo puntual?" 
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none h-24 transition-all" 
                value={respuestas.cuello} 
                onChange={e => setRespuestas({...respuestas, cuello: e.target.value})} 
              />
            </div>

            {/* 6. Select Metric */}
            <div>
              <label className="block text-sm text-gray-300 font-bold mb-4 uppercase tracking-wider">6. Métrica prioritaria</label>
              <div className="flex flex-wrap gap-3">
                {METRICAS.map(m => (
                  <button 
                     key={m}
                     onClick={() => setRespuestas({...respuestas, metrica: m})}
                     className={`px-5 py-2.5 rounded-full border text-[11px] font-bold uppercase tracking-widest transition-all ${
                       respuestas.metrica === m 
                         ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                         : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                     }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <button 
                onClick={handleSubmit} 
                disabled={saving} 
                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold tracking-widest uppercase transition-all shadow-lg flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {saving ? 'Guardando check-in...' : 'Completar Check-in Semanal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {todayEntry && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-emerald-400">¡Check-in completado!</h3>
            <p className="text-sm text-emerald-400/70">Ya estructuraste tu semana. Tu foco principal es: <strong className="text-white">"{todayEntry.respuestas.foco}"</strong>.</p>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-12 space-y-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de Check-ins
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {entries.map(entry => (
               <div key={entry.id} className="glass-panel p-6 rounded-2xl border-l-[3px] border-l-indigo-500 hover:border-l-indigo-400 transition-colors bg-gradient-to-r from-indigo-500/[0.02] to-transparent">
                 <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                   <div>
                     <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                       Semana del {new Date(entry.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                     </span>
                   </div>
                   <div className="bg-white/5 rounded-full px-3 py-1 flex items-center gap-2 border border-white/10 text-xs text-white font-medium uppercase tracking-wider">
                     {ESTADOS.find(e => e.id === entry.respuestas.estado)?.emoji || '👍'} 
                     {ESTADOS.find(e => e.id === entry.respuestas.estado)?.label || 'Bien'}
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                   <div>
                     <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-widest mb-1.5">🎯 Foco</span>
                     <p className="text-indigo-200 font-medium text-sm bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                       {entry.respuestas.foco}
                     </p>
                   </div>
                   <div>
                     <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-widest mb-1.5">🏆 Victoria</span>
                     <p className="text-gray-300 text-sm p-3">{entry.respuestas.victoria}</p>
                   </div>
                   <div>
                     <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-widest mb-1.5">💡 Aprendizaje</span>
                     <p className="text-gray-300 text-sm p-3">{entry.respuestas.aprendizaje}</p>
                   </div>
                   <div className="flex items-center gap-4 p-3">
                     <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-widest">Métrica:</span>
                     <span className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                       {entry.respuestas.metrica}
                     </span>
                   </div>
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
