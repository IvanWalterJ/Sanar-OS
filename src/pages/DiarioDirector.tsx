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
    q1: string; // ¿Cómo te sentiste?
    q2: string; // ¿Qué te frenó?
    q3: string; // ¿Qué acción tomaste?
    q4: string; // ¿Qué pensamiento dominante?
    q5: string; // ¿Qué emoción?
    q6: string; // ¿Qué aprendiste?
    q7: string; // ¿Qué harás mañana?
  };
}

interface ResumenSemana {
  id: string;
  semana_inicio: string;
  resumen_texto: string;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PREGUNTAS = [
  { id: 'q1', label: '¿Cómo te sentiste hoy en tu negocio?', placeholder: 'Contame con tus palabras cómo fue el día...', campo: 'general', color: 'indigo' },
  { id: 'q2', label: '¿Qué te frenó o te generó fricción hoy?', placeholder: 'Puede ser una situación, una persona, una emoción, o algo técnico...', campo: 'friccion', color: 'amber' },
  { id: 'q3', label: '¿Qué acción tomaste hoy que te acercó a tu meta?', placeholder: 'Aunque sea pequeña, ¿qué moviste hoy?', campo: 'accion', color: 'emerald' },
  { id: 'q4', label: '¿Qué pensamiento dominante apareció hoy?', placeholder: 'El pensamiento que más veces repetiste mentalmente hoy...', campo: 'pensamiento', color: 'violet' },
  { id: 'q5', label: '¿Qué emoción fue la predominante?', placeholder: 'Entusiasmo, ansiedad, claridad, miedo, orgullo, frustración...', campo: 'emocion', color: 'pink' },
  { id: 'q6', label: '¿Qué aprendiste hoy?', placeholder: 'Sobre vos, tu negocio, tus clientes o el mercado...', campo: 'aprendizaje', color: 'cyan' },
  { id: 'q7', label: '¿Qué vas a hacer mañana con lo de hoy?', placeholder: '1 acción concreta para mañana...', campo: 'accion_manana', color: 'teal' },
];

const CHECKLIST_ENERGETICO: { key: keyof ModuloEnergetico; emoji: string; label: string }[] = [
  { key: 'durmio_bien', emoji: '😴', label: 'Dormí bien' },
  { key: 'comio_bien', emoji: '🥗', label: 'Comí bien' },
  { key: 'movio_cuerpo', emoji: '🏃', label: 'Moví el cuerpo' },
  { key: 'aire_libre', emoji: '🌿', label: 'Tiempo al aire libre' },
];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isViernes(): boolean {
  return new Date().getDay() === 5;
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
        <span className="text-xs text-gray-500">Energía del día</span>
        <span className={`text-sm font-bold ${valor >= 7 ? 'text-emerald-400' : valor >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
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
                  ? 'bg-emerald-500 text-white'
                  : n >= 4
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-white/5 text-gray-600 hover:bg-white/10'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
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
  const esViernes = isViernes();

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
    const camposRequeridos = [respuestas.q1, respuestas.q2, respuestas.q3];
    if (camposRequeridos.some((c) => !c.trim())) {
      toast.error('Completá al menos las primeras 3 preguntas.');
      return;
    }

    setSaving(true);
    try {
      const entradaLocal: EntradaDiario = {
        id: String(Date.now()),
        fecha: todayStr,
        energia_nivel: energiaNivel,
        emocion: respuestas.q5,
        pensamiento_dominante: respuestas.q4,
        aprendizaje: respuestas.q6,
        accion_manana: respuestas.q7,
        modulo_energetico: moduloEnergetico,
        respuestas: { ...respuestas },
      };

      if (isSupabaseReady() && supabase && userId) {
        const { data: saved } = await supabase
          .from('diario_entradas')
          .upsert(
            {
              user_id: userId,
              fecha: todayStr,
              energia_nivel: energiaNivel,
              emocion: respuestas.q5,
              pensamiento_dominante: respuestas.q4,
              aprendizaje: respuestas.q6,
              accion_manana: respuestas.q7,
              modulo_energetico: moduloEnergetico,
              respuestas: { ...respuestas },
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

      // Si es viernes y hay 5 entradas esta semana → generar resumen
      if (esViernes) {
        await generarResumenSemana(actualizadas);
      }
    } catch {
      toast.error('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Generar resumen del viernes ──────────────────────────────────────────
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
          <h1 className="text-2xl font-light text-white flex items-center gap-2">
            📔 Diario de Cierre
          </h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{streak} días</span>
            </div>
          )}
          <button
            onClick={() => setVista(vista === 'formulario' ? 'historial' : 'formulario')}
            className="flex items-center gap-1.5 text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-sm"
          >
            <History className="w-3.5 h-3.5" />
            Historial
          </button>
        </div>
      </div>

      {/* Alerta de energía baja */}
      {alertaEnergiaBaja && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <BatteryLow className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Energía baja por 2 días consecutivos</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              El Coach detectó tu estado. Recordá: tu &quot;por qué&quot; es más grande que cualquier día difícil.
            </p>
          </div>
        </div>
      )}

      {/* Resumen del viernes */}
      {generandoResumen && (
        <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">El Coach está analizando tu semana...</span>
        </div>
      )}

      {esViernes && resumen && (() => {
        try {
          const datos = JSON.parse(resumen.resumen_texto);
          return (
            <div className="glass-panel p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-medium text-violet-300">Resumen del Coach — Semana cerrada</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/3 rounded-xl p-3">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px]">Energía promedio</p>
                  <p className="text-white font-medium mt-0.5">{datos.energia_promedio}/10 — {datos.tendencia_energia}</p>
                </div>
                <div className="bg-white/3 rounded-xl p-3">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px]">Racha del Diario</p>
                  <p className="text-white font-medium mt-0.5">{datos.racha} días consecutivos</p>
                </div>
              </div>
              {datos.bloqueo_recurrente && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Bloqueo recurrente detectado</p>
                  <p className="text-sm text-amber-200">{datos.bloqueo_recurrente}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">3 acciones para la próxima semana</p>
                <ul className="space-y-1.5">
                  {datos.acciones_proxima_semana?.map((accion: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
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
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-emerald-400">Entrada del día completada</h3>
                <p className="text-sm text-emerald-400/70 mt-0.5">
                  Energía: <strong>{todayEntry.energia_nivel}/10</strong> · Emoción: {todayEntry.emocion || '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-white">Cierre del día</h2>
                  <p className="text-xs text-gray-400">Lunes a viernes · 5–8 minutos</p>
                </div>
              </div>

              {/* Energía */}
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Nivel de energía</span>
                </div>
                <BarraEnergia valor={energiaNivel} onChange={setEnergiaNivel} />
              </div>

              {/* 7 preguntas */}
              <div className="space-y-5">
                {PREGUNTAS.map((p, idx) => (
                  <div key={p.id}>
                    <label className="block text-xs font-medium text-gray-300 mb-2 uppercase tracking-wider">
                      {idx + 1}. {p.label}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={p.placeholder}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-${p.color}-500/50 focus:ring-1 focus:ring-${p.color}-500/50 resize-none transition-all placeholder-gray-600`}
                      value={respuestas[p.id as keyof typeof respuestas]}
                      onChange={(e) =>
                        setRespuestas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Módulo energético-corporal */}
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
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
                          : 'bg-white/3 border-white/8 text-gray-500 hover:bg-white/8'
                      }`}
                    >
                      <span>{item.emoji}</span>
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
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium tracking-wide transition-all flex justify-center items-center gap-2"
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
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...
            </div>
          )}
          {entries.length === 0 && !loading && (
            <p className="text-center text-gray-500 text-sm py-12">
              Aún no hay entradas en el Diario.
            </p>
          )}
          {entries.map((entrada) => (
            <div
              key={entrada.id}
              className="glass-panel p-5 rounded-2xl border-l-4 border-l-indigo-500/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-medium">
                  {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    entrada.energia_nivel >= 7 ? 'bg-emerald-500/15 text-emerald-400' :
                    entrada.energia_nivel >= 4 ? 'bg-amber-500/15 text-amber-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    ⚡ {entrada.energia_nivel}/10
                  </span>
                  {entrada.emocion && (
                    <span className="text-xs text-gray-500">{entrada.emocion}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {entrada.respuestas.q2 && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider text-[10px]">Fricción</span>
                    <p className="text-gray-300 mt-0.5">{entrada.respuestas.q2}</p>
                  </div>
                )}
                {entrada.respuestas.q3 && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider text-[10px]">Acción tomada</span>
                    <p className="text-gray-300 mt-0.5">{entrada.respuestas.q3}</p>
                  </div>
                )}
                {entrada.aprendizaje && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider text-[10px]">Aprendizaje</span>
                    <p className="text-gray-300 mt-0.5">{entrada.aprendizaje}</p>
                  </div>
                )}
                {entrada.accion_manana && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider text-[10px]">Mañana</span>
                    <p className="text-gray-300 mt-0.5">{entrada.accion_manana}</p>
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
                      <span key={k} className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-gray-400">
                        {item.emoji} {item.label}
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
