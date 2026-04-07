import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Loader2,
  Calendar,
  Flame,
  History,
  Check,
  Send,
  BarChart2,
  Zap,
  Battery,
  BatteryLow,
  Moon,
  Salad,
  Footprints,
  TreePine,
} from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModuloEnergetico {
  durmio_bien: boolean;
  comio_bien: boolean;
  movio_cuerpo: boolean;
  aire_libre: boolean;
}

interface EntradaDiario {
  id: string;
  fecha: string;
  energia_nivel: number; // 1-10
  emocion: string;
  pensamiento_dominante: string;
  aprendizaje: string;
  accion_manana: string;
  modulo_energetico: ModuloEnergetico;
  respuestas: {
    q1: string; // ¿Completaste tu tarea de hoy? (Sí/No)
    q2: string; // ¿Cómo estuvo tu energía? (slider, stored as level)
    q3: string; // ¿Hubo algo que te bloqueó? (textarea, optional)
    q4: string; // ¿Cuál fue el momento más importante del día? (textarea, required)
    q5: string; // ¿Tomaste llamadas hoy? (Sí/No, day>=45)
    q6: string; // ¿Cuántas? ¿Cerraste alguna? (text, if q5=Sí)
    q7: string; // ¿Qué objeción apareció? (textarea, optional, if q5=Sí)
  };
}

interface ResumenSemana {
  id: string;
  semana_inicio: string;
  resumen_texto: string;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Day calculation from tcd_profile
function getCurrentDay(): number {
  try {
    const profile = localStorage.getItem('tcd_profile');
    if (!profile) return 1;
    const parsed = JSON.parse(profile);
    const fechaInicio = parsed.fecha_inicio;
    if (!fechaInicio) return 1;
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const ahora = new Date();
    return Math.floor((ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 1;
  }
}

function calcEnergyAverage7d(allEntries: EntradaDiario[]): number | null {
  const sorted = [...allEntries].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const last7 = sorted.slice(0, 7);
  if (last7.length === 0) return null;
  const sum = last7.reduce((acc, e) => acc + e.energia_nivel, 0);
  return Math.round((sum / last7.length) * 10) / 10;
}

const CHECKLIST_ENERGETICO: { key: keyof ModuloEnergetico; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: 'durmio_bien', icon: Moon, label: 'Dormí bien' },
  { key: 'comio_bien', icon: Salad, label: 'Comí bien' },
  { key: 'movio_cuerpo', icon: Footprints, label: 'Moví el cuerpo' },
  { key: 'aire_libre', icon: TreePine, label: 'Tiempo al aire libre' },
];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isDomingo(): boolean {
  return new Date().getDay() === 0;
}

function calcStreak(entries: EntradaDiario[]): number {
  if (entries.length === 0) return 0;
  const hoy = new Date();
  let racha = 0;
  for (let i = 0; i < 30; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    if (entries.some((e) => e.fecha === fechaStr)) {
      racha++;
    } else if (i > 0) {
      break;
    }
  }
  return racha;
}

// ─── Barra de energía ─────────────────────────────────────────────────────────

function BarraEnergia({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#FFFFFF]/40">Energía del día</span>
        <span className={`text-sm font-bold ${valor >= 7 ? 'text-[#22C55E]' : valor >= 4 ? 'text-[#F5A623]' : 'text-[#EF4444]'}`}>
          {valor}/10
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-lg transition-all text-[10px] font-bold ${
              n <= valor
                ? n >= 7
                  ? 'bg-[#22C55E] text-[#FFFFFF]'
                  : n >= 4
                  ? 'bg-[#F5A623] text-[#FFFFFF]'
                  : 'bg-[#EF4444] text-[#FFFFFF]'
                : 'bg-[#F5A623]/5 text-[#FFFFFF]/30 hover:bg-[#F5A623]/10'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[#FFFFFF]/30">
        <span>Sin energía</span>
        <span>Imparable</span>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DiarioDirector({
  userId,
  geminiKey,
}: {
  userId?: string;
  geminiKey?: string;
}) {
  const [entries, setEntries] = useState<EntradaDiario[]>([]);
  const [resumen, setResumen] = useState<ResumenSemana | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [vista, setVista] = useState<'formulario' | 'historial'>('formulario');

  const [respuestas, setRespuestas] = useState<EntradaDiario['respuestas']>({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '',
  });
  const [energiaNivel, setEnergiaNivel] = useState(5);
  const [moduloEnergetico, setModuloEnergetico] = useState<ModuloEnergetico>({
    durmio_bien: false,
    comio_bien: false,
    movio_cuerpo: false,
    aire_libre: false,
  });

  const todayStr = getTodayStr();
  const todayEntry = entries.find((e) => e.fecha === todayStr);
  const streak = calcStreak(entries);
  const esDomingo = isDomingo();
  const currentDay = getCurrentDay();
  const showConditional = currentDay >= 45;

  // Energy average tracking
  const energiaPromedio7d = calcEnergyAverage7d(entries);
  useEffect(() => {
    if (energiaPromedio7d !== null) {
      localStorage.setItem('tcd_energia_promedio_7d', String(energiaPromedio7d));
    }
  }, [energiaPromedio7d]);

  // ─── Cargar datos ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tcd_diario_v2');
      if (saved) setEntries(JSON.parse(saved));
    } catch { /* noop */ }

    if (!isSupabaseReady() || !supabase || !userId) return;

    setLoading(true);
    Promise.all([
      supabase
        .from('diario_entradas')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: false })
        .limit(30),
      supabase
        .from('diario_resumen')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: raw }, { data: res }]) => {
      if (raw) {
        const formatted: EntradaDiario[] = raw.map((d: any) => ({
          id: String(d.id),
          fecha: d.fecha,
          energia_nivel: d.energia_nivel ?? d.respuestas?.q3 ?? 5,
          emocion: d.emocion ?? d.respuestas?.q5 ?? '',
          pensamiento_dominante: d.pensamiento_dominante ?? d.respuestas?.q4 ?? '',
          aprendizaje: d.aprendizaje ?? d.respuestas?.q6 ?? '',
          accion_manana: d.accion_manana ?? d.respuestas?.q7 ?? '',
          modulo_energetico: d.modulo_energetico ?? { durmio_bien: false, comio_bien: false, movio_cuerpo: false, aire_libre: false },
          respuestas: {
            q1: d.respuestas?.q1 ?? '',
            q2: d.respuestas?.q2 ?? d.respuestas?.cuello ?? '',
            q3: d.respuestas?.q3 ?? d.respuestas?.victoria ?? '',
            q4: d.respuestas?.q4 ?? '',
            q5: d.respuestas?.q5 ?? '',
            q6: d.respuestas?.q6 ?? d.respuestas?.aprendizaje ?? '',
            q7: d.respuestas?.q7 ?? '',
          },
        }));
        setEntries(formatted);
        localStorage.setItem('tcd_diario_v2', JSON.stringify(formatted));
      }
      if (res) setResumen(res as ResumenSemana);
    }).finally(() => setLoading(false));
  }, [userId]);

  // ─── Guardar entrada ──────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!respuestas.q1) {
      toast.error('Respondé si completaste tu tarea de hoy.');
      return;
    }
    if (!respuestas.q4.trim()) {
      toast.error('Contanos cuál fue el momento más importante del día.');
      return;
    }

    setSaving(true);
    try {
      const respuestasToSave = {
        ...respuestas,
        q2: String(energiaNivel),
      };

      const entradaLocal: EntradaDiario = {
        id: String(Date.now()),
        fecha: todayStr,
        energia_nivel: energiaNivel,
        emocion: '',
        pensamiento_dominante: respuestas.q4,
        aprendizaje: '',
        accion_manana: '',
        modulo_energetico: moduloEnergetico,
        respuestas: respuestasToSave,
      };

      if (isSupabaseReady() && supabase && userId) {
        const { data: saved } = await supabase
          .from('diario_entradas')
          .upsert(
            {
              user_id: userId,
              fecha: todayStr,
              energia_nivel: energiaNivel,
              emocion: '',
              pensamiento_dominante: respuestas.q4,
              aprendizaje: '',
              accion_manana: '',
              modulo_energetico: moduloEnergetico,
              respuestas: respuestasToSave,
            },
            { onConflict: 'user_id,fecha' },
          )
          .select()
          .single();
        if (saved) entradaLocal.id = String(saved.id);
      }

      const actualizadas = [entradaLocal, ...entries.filter((e) => e.fecha !== todayStr)];
      setEntries(actualizadas);
      localStorage.setItem('tcd_diario_v2', JSON.stringify(actualizadas));
      toast.success('Entrada del diario guardada. ¡Sigue así!');

      // Si es domingo → generar resumen semanal
      if (esDomingo) {
        await generarResumenSemana(actualizadas);
      }
    } catch {
      toast.error('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Generar resumen semanal (domingo) ────────────────────────────────────
  const generarResumenSemana = useCallback(
    async (todasEntradas: EntradaDiario[]) => {
      if (!geminiKey) return;

      // Obtener las entradas de esta semana (L-V)
      const ahora = new Date();
      const lunes = new Date(ahora);
      lunes.setDate(ahora.getDate() - ahora.getDay() + 1);
      const entradasSemana = todasEntradas.filter((e) => {
        const fecha = new Date(e.fecha + 'T12:00:00');
        return fecha >= lunes;
      });

      if (entradasSemana.length < 1) return;

      setGenerandoResumen(true);
      try {
        const prompt = `Sos el Coach de ${'"Tu Clínica Digital"'}. Analizá las entradas del Diario de esta semana y generá un resumen de patrones en formato JSON.

ENTRADAS DE LA SEMANA:
${entradasSemana.map((e, i) => `
Día ${i + 1} (${e.fecha}):
- Energía: ${e.energia_nivel}/10
- Fricción: ${e.respuestas.q2}
- Acción tomada: ${e.respuestas.q3}
- Pensamiento dominante: ${e.pensamiento_dominante}
- Emoción: ${e.emocion}
- Aprendizaje: ${e.aprendizaje}
- Señales físicas: durmió bien=${e.modulo_energetico.durmio_bien}, comió bien=${e.modulo_energetico.comio_bien}
`).join('\n')}

Genera un JSON con EXACTAMENTE esta estructura:
{
  "racha": <número de días consecutivos del Diario>,
  "energia_promedio": <número decimal con 1 decimal>,
  "tendencia_energia": "subiendo" | "bajando" | "estable",
  "bloqueo_recurrente": "<si q2 se repite 2+ veces, nombrarlo explícitamente. Si no, null>",
  "correlacion_energia_resultados": "<una observación específica sobre si los días de mayor energía coinciden con las acciones de mayor impacto>",
  "pensamiento_dominante_semana": "<el pensamiento que más se repitió, o null>",
  "emocion_dominante": "<la emoción más frecuente y su patrón>",
  "acciones_proxima_semana": ["<acción 1 concreta>", "<acción 2 concreta>", "<acción 3 concreta>"]
}

Respondé SOLO con el JSON, sin texto adicional.`;

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const texto = result.text ?? '';
        const jsonMatch = texto.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON en respuesta');

        const resumenJson = JSON.parse(jsonMatch[0]);
        const resumenTexto = JSON.stringify(resumenJson);

        if (isSupabaseReady() && supabase && userId) {
          const semanaInicio = lunes.toISOString().split('T')[0];
          await supabase.from('diario_resumen').upsert(
            { user_id: userId, semana_inicio: semanaInicio, resumen_texto: resumenTexto },
            { onConflict: 'user_id,semana_inicio' },
          );
          setResumen({ id: '', semana_inicio: semanaInicio, resumen_texto: resumenTexto, created_at: new Date().toISOString() });
        }

        toast.success('📊 Resumen de la semana generado por el Coach.');
      } catch {
        // Silencioso — el resumen es un nice-to-have
      } finally {
        setGenerandoResumen(false);
      }
    },
    [geminiKey, userId],
  );

  // ─── Alertas basadas en energía ──────────────────────────────────────────
  const ultimasDosEntradas = entries.slice(0, 2);
  const alertaEnergiaBaja =
    ultimasDosEntradas.length === 2 &&
    ultimasDosEntradas.every((e) => e.energia_nivel < 4);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-light text-[#FFFFFF] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#F5A623]" /> Diario de Cierre
          </h1>
          <p className="text-sm text-[#FFFFFF]/60 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {energiaPromedio7d !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              energiaPromedio7d >= 7 ? 'text-[#22C55E] bg-emerald-500/10 border-emerald-500/20' :
              energiaPromedio7d >= 4 ? 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/20' :
              'text-[#EF4444] bg-red-500/10 border-red-500/20'
            }`}>
              <Zap className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{energiaPromedio7d}</span>
              <span className="text-[10px] opacity-60">7d</span>
            </div>
          )}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{streak} días</span>
            </div>
          )}
          <button
            onClick={() => setVista(vista === 'formulario' ? 'historial' : 'formulario')}
            className="flex items-center gap-1.5 text-[#FFFFFF]/60 bg-[#F5A623]/5 px-3 py-1.5 rounded-xl border border-[rgba(245,166,35,0.2)] hover:bg-[#F5A623]/10 transition-colors text-sm"
          >
            <History className="w-3.5 h-3.5" />
            Historial
          </button>
        </div>
      </div>

      {/* Alerta de energía baja */}
      {alertaEnergiaBaja && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <BatteryLow className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Energía baja por 2 días consecutivos</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              El Coach detectó tu estado. Recordá: tu &quot;por qué&quot; es más grande que cualquier día difícil.
            </p>
          </div>
        </div>
      )}

      {/* Resumen semanal (domingo) */}
      {generandoResumen && (
        <div className="flex items-center gap-2 text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-2xl p-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">El Coach está analizando tu semana...</span>
        </div>
      )}

      {esDomingo && resumen && (() => {
        try {
          const datos = JSON.parse(resumen.resumen_texto);
          return (
            <div className="card-panel p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-medium text-violet-300">Resumen del Coach — Semana cerrada</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#1C1C1C]/50 rounded-xl p-3">
                  <p className="text-[#FFFFFF]/40 uppercase tracking-wider text-[10px]">Energía promedio</p>
                  <p className="text-[#FFFFFF] font-medium mt-0.5">{datos.energia_promedio}/10 — {datos.tendencia_energia}</p>
                </div>
                <div className="bg-[#1C1C1C]/50 rounded-xl p-3">
                  <p className="text-[#FFFFFF]/40 uppercase tracking-wider text-[10px]">Racha del Diario</p>
                  <p className="text-[#FFFFFF] font-medium mt-0.5">{datos.racha} días consecutivos</p>
                </div>
              </div>
              {datos.bloqueo_recurrente && (
                <div className="bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-xl p-3">
                  <p className="text-[10px] text-[#F5A623] uppercase tracking-wider mb-1">Bloqueo recurrente detectado</p>
                  <p className="text-sm text-amber-200">{datos.bloqueo_recurrente}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-[#FFFFFF]/40 uppercase tracking-wider mb-2">3 acciones para la próxima semana</p>
                <ul className="space-y-1.5">
                  {datos.acciones_proxima_semana?.map((accion: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#FFFFFF]/80">
                      <span className="text-[#F5A623] font-bold shrink-0">{i + 1}.</span>
                      {accion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        } catch { return null; }
      })()}

      {/* ── Vista: Formulario ── */}
      {vista === 'formulario' && (
        <>
          {todayEntry ? (
            <div className="card-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Check className="w-6 h-6 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#22C55E]">Entrada del día completada</h3>
                <p className="text-sm text-[#22C55E]/70 mt-0.5">
                  Energía: <strong>{todayEntry.energia_nivel}/10</strong> · Tarea: {todayEntry.respuestas.q1 || '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="card-panel p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#F5A623]/20 flex items-center justify-center border border-[#F5A623]/30">
                  <BookOpen className="w-5 h-5 text-[#F5A623]" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-[#FFFFFF]">Cierre del día</h2>
                  <p className="text-xs text-[#FFFFFF]/60">Lunes a viernes · 5–8 minutos</p>
                </div>
              </div>

              {/* Q1: ¿Completaste tu tarea de hoy? */}
              <div>
                <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                  1. ¿Completaste tu tarea de hoy?
                </label>
                <div className="flex gap-3">
                  {(['Sí', 'No'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setRespuestas((prev) => ({ ...prev, q1: opt }))}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        respuestas.q1 === opt
                          ? opt === 'Sí'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-[#22C55E]'
                            : 'bg-red-500/20 border-red-500/40 text-[#EF4444]'
                          : 'bg-black/20 border-[rgba(245,166,35,0.2)] text-[#FFFFFF]/50 hover:bg-[#F5A623]/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2: Energía (slider) */}
              <div className="bg-[#1C1C1C]/30 rounded-xl p-4 border border-[rgba(245,166,35,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-medium text-[#FFFFFF]/80 uppercase tracking-wider">2. ¿Cómo estuvo tu energía?</span>
                </div>
                <BarraEnergia valor={energiaNivel} onChange={setEnergiaNivel} />
              </div>

              {/* Q3: ¿Hubo algo que te bloqueó? (optional) */}
              <div>
                <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                  3. ¿Hubo algo que te bloqueó? <span className="text-[#FFFFFF]/30 normal-case">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Si algo te frenó hoy, contalo acá..."
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 resize-none transition-all placeholder-[#FFFFFF]/30"
                  value={respuestas.q3}
                  onChange={(e) => setRespuestas((prev) => ({ ...prev, q3: e.target.value }))}
                />
              </div>

              {/* Q4: Momento más importante (required) */}
              <div>
                <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                  4. ¿Cuál fue el momento más importante del día?
                </label>
                <textarea
                  rows={2}
                  placeholder="El momento que más te marcó hoy..."
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 resize-none transition-all placeholder-[#FFFFFF]/30"
                  value={respuestas.q4}
                  onChange={(e) => setRespuestas((prev) => ({ ...prev, q4: e.target.value }))}
                />
              </div>

              {/* Conditional questions (day >= 45) */}
              {showConditional && (
                <>
                  {/* Q5: ¿Tomaste llamadas hoy? */}
                  <div>
                    <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                      5. ¿Tomaste llamadas hoy?
                    </label>
                    <div className="flex gap-3">
                      {(['Sí', 'No'] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setRespuestas((prev) => ({
                            ...prev,
                            q5: opt,
                            ...(opt === 'No' ? { q6: '', q7: '' } : {}),
                          }))}
                          className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                            respuestas.q5 === opt
                              ? opt === 'Sí'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-[#22C55E]'
                                : 'bg-[#F5A623]/20 border-[#F5A623]/40 text-[#F5A623]'
                              : 'bg-black/20 border-[rgba(245,166,35,0.2)] text-[#FFFFFF]/50 hover:bg-[#F5A623]/10'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q6 & Q7: Only if q5 === 'Sí' */}
                  {respuestas.q5 === 'Sí' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                          6. ¿Cuántas? ¿Cerraste alguna?
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 3 llamadas, cerré 1"
                          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all placeholder-[#FFFFFF]/30"
                          value={respuestas.q6}
                          onChange={(e) => setRespuestas((prev) => ({ ...prev, q6: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#FFFFFF]/80 mb-2 uppercase tracking-wider">
                          7. ¿Qué objeción apareció? <span className="text-[#FFFFFF]/30 normal-case">(opcional)</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Si hubo alguna objeción recurrente..."
                          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 resize-none transition-all placeholder-[#FFFFFF]/30"
                          value={respuestas.q7}
                          onChange={(e) => setRespuestas((prev) => ({ ...prev, q7: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Módulo energético-corporal */}
              <div className="bg-[#1C1C1C]/30 rounded-xl p-4 border border-[rgba(245,166,35,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Battery className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-xs font-medium text-[#FFFFFF]/80 uppercase tracking-wider">
                    Bienestar energético-corporal
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CHECKLIST_ENERGETICO.map((item) => (
                    <button
                      key={item.key}
                      onClick={() =>
                        setModuloEnergetico((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        moduloEnergetico[item.key]
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#1C1C1C]/50 border-white/8 text-[#FFFFFF]/40 hover:bg-white/8'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-xs">{item.label}</span>
                      {moduloEnergetico[item.key] && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón guardar */}
              <button
                onClick={handleGuardar}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-[#FFFFFF] font-medium tracking-wide transition-all flex justify-center items-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Guardar entrada del día</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Vista: Historial ── */}
      {vista === 'historial' && (
        <div className="space-y-4">
          {loading && entries.length === 0 && (
            <div className="flex items-center gap-2 text-[#FFFFFF]/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...
            </div>
          )}
          {entries.length === 0 && !loading && (
            <p className="text-center text-[#FFFFFF]/40 text-sm py-12">
              Aún no hay entradas en el Diario.
            </p>
          )}
          {entries.map((entrada) => (
            <div
              key={entrada.id}
              className="card-panel p-5 rounded-2xl border-l-4 border-l-[#F5A623]/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#F5A623] font-medium">
                  {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    entrada.energia_nivel >= 7 ? 'bg-emerald-500/15 text-[#22C55E]' :
                    entrada.energia_nivel >= 4 ? 'bg-[#F5A623]/15 text-[#F5A623]' :
                    'bg-red-500/15 text-[#EF4444]'
                  }`}>
                    <Zap className="w-3 h-3 inline" /> {entrada.energia_nivel}/10
                  </span>
                  {entrada.emocion && (
                    <span className="text-xs text-[#FFFFFF]/40">{entrada.emocion}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {entrada.respuestas.q1 && (
                  <div>
                    <span className="text-[#FFFFFF]/30 uppercase tracking-wider text-[10px]">Tarea completada</span>
                    <p className="text-[#FFFFFF]/80 mt-0.5">{entrada.respuestas.q1}</p>
                  </div>
                )}
                {entrada.respuestas.q3 && (
                  <div>
                    <span className="text-[#FFFFFF]/30 uppercase tracking-wider text-[10px]">Bloqueo</span>
                    <p className="text-[#FFFFFF]/80 mt-0.5">{entrada.respuestas.q3}</p>
                  </div>
                )}
                {entrada.respuestas.q4 && (
                  <div>
                    <span className="text-[#FFFFFF]/30 uppercase tracking-wider text-[10px]">Momento importante</span>
                    <p className="text-[#FFFFFF]/80 mt-0.5">{entrada.respuestas.q4}</p>
                  </div>
                )}
                {entrada.respuestas.q5 && (
                  <div>
                    <span className="text-[#FFFFFF]/30 uppercase tracking-wider text-[10px]">Llamadas</span>
                    <p className="text-[#FFFFFF]/80 mt-0.5">
                      {entrada.respuestas.q5}
                      {entrada.respuestas.q6 ? ` — ${entrada.respuestas.q6}` : ''}
                    </p>
                  </div>
                )}
                {entrada.respuestas.q7 && (
                  <div>
                    <span className="text-[#FFFFFF]/30 uppercase tracking-wider text-[10px]">Objeción</span>
                    <p className="text-[#FFFFFF]/80 mt-0.5">{entrada.respuestas.q7}</p>
                  </div>
                )}
              </div>

              {/* Módulo energético */}
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(entrada.modulo_energetico)
                  .filter(([, v]) => v)
                  .map(([k]) => {
                    const item = CHECKLIST_ENERGETICO.find((c) => c.key === k);
                    return item ? (
                      <span key={k} className="text-[10px] bg-[#F5A623]/5 px-2 py-1 rounded-full text-[#FFFFFF]/60 flex items-center gap-1">
                        <item.icon className="w-3 h-3" /> {item.label}
                      </span>
                    ) : null;
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
