import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Loader2, ChevronDown, ChevronUp, Calendar, Flame, FileText } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface DiaryEntry {
  id: number;
  fecha: string; // YYYY-MM-DD
  respuestas: {
    q1: string;
    q2: string;
    q3: number; // 1-10 energía
    q4: string;
    q5: string;
  };
}

interface WeeklySummary {
  id: number;
  semana_inicio: string; // YYYY-MM-DD (lunes)
  resumen_texto: string;
}

interface DiaryData {
  entries: DiaryEntry[];
  resumenes: WeeklySummary[];
}

const PREGUNTAS = [
  '¿Qué hice hoy hacia mi clínica digital?',
  '¿Qué frenó mi avance hoy?',
  '¿Cómo está mi energía? (1–10)',
  '¿Qué me llevo aprendido?',
  '¿Qué voy a hacer mañana?',
];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sab
}

function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function loadDiary(): DiaryData {
  try {
    const saved = localStorage.getItem('tcd_diary');
    if (saved) return JSON.parse(saved);
  } catch { /* noop */ }
  return { entries: [], resumenes: [] };
}

function saveDiary(data: DiaryData) {
  localStorage.setItem('tcd_diary', JSON.stringify(data));
}

export function calcDiaryStreak(entries: DiaryEntry[]): number {
  if (!entries.length) return 0;
  const today = getTodayStr();
  const sorted = [...entries].sort((a, b) => b.fecha.localeCompare(a.fecha));
  let streak = 0;
  const d = new Date();

  for (let i = 0; i < 30; i++) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    // If today and no entry yet, that's ok (don't break streak)
    if (dateStr === today) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    const hasEntry = sorted.some(e => e.fecha === dateStr);
    if (hasEntry) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function DiarioDirector() {
  const [data, setData] = useState<DiaryData>(loadDiary);
  const [generating, setGenerating] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'entradas' | 'resumenes'>('entradas');

  // Form state
  const [respuestas, setRespuestas] = useState({ q1: '', q2: '', q3: 7, q4: '', q5: '' });

  const dayOfWeek = getDayOfWeek();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;
  const todayStr = getTodayStr();
  const todayEntry = data.entries.find(e => e.fecha === todayStr);
  const streak = calcDiaryStreak(data.entries);

  useEffect(() => {
    saveDiary(data);
  }, [data]);

  const handleSubmit = async () => {
    if (!respuestas.q1.trim() || !respuestas.q2.trim() || !respuestas.q4.trim() || !respuestas.q5.trim()) {
      toast.error('Completá todas las preguntas antes de guardar.');
      return;
    }

    setGenerating(true);

    const newEntry: DiaryEntry = {
      id: Date.now(),
      fecha: todayStr,
      respuestas: { ...respuestas },
    };

    const newData: DiaryData = {
      ...data,
      entries: [newEntry, ...data.entries.filter(e => e.fecha !== todayStr)],
      resumenes: [...data.resumenes],
    };

    // Friday: generate weekly summary
    if (isFriday) {
      const monday = getMondayOfCurrentWeek();
      const weekEntries = newData.entries.filter(e => e.fecha >= monday && e.fecha <= todayStr);

      if (weekEntries.length >= 1) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const entryText = weekEntries.map(e =>
            `Fecha: ${e.fecha}\n1. Hice: ${e.respuestas.q1}\n2. Bloqueó: ${e.respuestas.q2}\n3. Energía: ${e.respuestas.q3}/10\n4. Aprendí: ${e.respuestas.q4}\n5. Mañana: ${e.respuestas.q5}`
          ).join('\n\n---\n\n');

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: entryText }] }],
            config: {
              systemInstruction: `Sos el Coach IA de Tu Clínica Digital. Acabás de leer las entradas del diario de esta semana de un profesional de la salud construyendo su clínica digital. Generá un resumen semanal breve y útil (máximo 5 párrafos) con este formato markdown:

**Qué avanzó esta semana:**
[lo concreto que hizo hacia su clínica]

**Patrón de bloqueo detectado:**
[qué se repite como obstáculo, si aplica]

**Cómo estuvo la energía:**
[análisis del slider 1-10 a lo largo de la semana]

**Qué aprendió:**
[síntesis de aprendizajes]

**Para la semana que viene:**
[una acción concreta y específica basada en lo que escribió]

Sé directo, empático y práctico. No uses lenguaje genérico.`,
            }
          });

          const existingResumeIndex = newData.resumenes.findIndex(r => r.semana_inicio === monday);
          const newResumen: WeeklySummary = {
            id: Date.now() + 1,
            semana_inicio: monday,
            resumen_texto: response.text || '',
          };

          if (existingResumeIndex >= 0) {
            newData.resumenes[existingResumeIndex] = newResumen;
          } else {
            newData.resumenes = [newResumen, ...newData.resumenes];
          }

          toast.success('¡Entrada guardada y resumen semanal generado!');
        } catch (error) {
          console.error('Error generating summary:', error);
          toast.success('Entrada guardada. No se pudo generar el resumen semanal.');
        }
      }
    } else {
      toast.success('Entrada del día guardada.');
    }

    setData(newData);
    setRespuestas({ q1: '', q2: '', q3: 7, q4: '', q5: '' });
    setGenerating(false);
  };

  // Weekend screen
  if (isWeekend) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center animate-in fade-in duration-500">
        <div className="glass-panel p-12 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-light text-white mb-3">Es fin de semana</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            El diario es de lunes a viernes. Volvé el lunes para registrar tu próximo día.
          </p>
          {streak > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-amber-400">
              <Flame className="w-5 h-5" />
              <span className="text-lg font-medium">{streak} días seguidos</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Diario</h1>
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {isFriday && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">Viernes — se genera resumen semanal</span>}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">{streak} {streak === 1 ? 'día' : 'días'} seguidos</span>
          </div>
        )}
      </div>

      {/* Today's entry form or already-filled state */}
      {todayEntry ? (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Entrada de hoy completa</p>
              <p className="text-xs text-gray-400">Ya registraste tu día de hoy. Volvé mañana.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[todayEntry.respuestas.q1, todayEntry.respuestas.q2, `Energía: ${todayEntry.respuestas.q3}/10`, todayEntry.respuestas.q4, todayEntry.respuestas.q5].map((r, i) => (
              <div key={i} className="col-span-5 flex items-start gap-2 text-sm">
                <span className="text-gray-500 shrink-0 w-4">{i + 1}.</span>
                <span className="text-gray-300 line-clamp-1">{r}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Entrada del día</h3>
              <p className="text-xs text-gray-400">5 preguntas · Cierre de tu jornada</p>
            </div>
          </div>

          {/* Q1 */}
          <div>
            <label className="block text-sm text-amber-200 font-medium mb-2">
              1. {PREGUNTAS[0]}
            </label>
            <textarea
              value={respuestas.q1}
              onChange={e => setRespuestas({ ...respuestas, q1: e.target.value })}
              placeholder="Describí qué hiciste hoy..."
              rows={3}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Q2 */}
          <div>
            <label className="block text-sm text-amber-200 font-medium mb-2">
              2. {PREGUNTAS[1]}
            </label>
            <textarea
              value={respuestas.q2}
              onChange={e => setRespuestas({ ...respuestas, q2: e.target.value })}
              placeholder="¿Qué obstáculo apareció hoy?"
              rows={2}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Q3 — Energy slider */}
          <div>
            <label className="block text-sm text-amber-200 font-medium mb-3">
              3. {PREGUNTAS[2]}
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-4">1</span>
              <input
                type="range"
                min={1}
                max={10}
                value={respuestas.q3}
                onChange={e => setRespuestas({ ...respuestas, q3: parseInt(e.target.value) })}
                className="flex-1 accent-amber-500"
              />
              <span className="text-xs text-gray-500 w-4">10</span>
              <div className="w-12 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold text-sm">{respuestas.q3}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1 px-5">
              <span>Sin energía</span>
              <span>Llena de energía</span>
            </div>
          </div>

          {/* Q4 */}
          <div>
            <label className="block text-sm text-amber-200 font-medium mb-2">
              4. {PREGUNTAS[3]}
            </label>
            <textarea
              value={respuestas.q4}
              onChange={e => setRespuestas({ ...respuestas, q4: e.target.value })}
              placeholder="¿Qué insight o aprendizaje te llevás de hoy?"
              rows={2}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Q5 */}
          <div>
            <label className="block text-sm text-amber-200 font-medium mb-2">
              5. {PREGUNTAS[4]}
            </label>
            <textarea
              value={respuestas.q5}
              onChange={e => setRespuestas({ ...respuestas, q5: e.target.value })}
              placeholder="Una acción concreta para mañana..."
              rows={2}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-medium transition-all shadow-lg shadow-amber-500/20"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isFriday ? 'Guardando y generando resumen semanal...' : 'Guardando...'}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {isFriday ? 'Guardar y generar resumen semanal' : 'Guardar entrada del día'}</>
            )}
          </button>
        </div>
      )}

      {/* History tabs */}
      {(data.entries.length > 0 || data.resumenes.length > 0) && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('entradas')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'entradas' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Entradas ({data.entries.length})
            </button>
            <button
              onClick={() => setActiveTab('resumenes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'resumenes' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Resúmenes semanales ({data.resumenes.length})
            </button>
          </div>

          {activeTab === 'entradas' && (
            <div className="space-y-3">
              {data.entries.map(entry => (
                <div key={entry.id} className="glass-panel rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <span className="text-amber-400 font-bold text-xs">{entry.respuestas.q3}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{new Date(entry.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{entry.respuestas.q1}</p>
                      </div>
                    </div>
                    {expandedEntry === entry.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {expandedEntry === entry.id && (
                    <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                      {[
                        { q: PREGUNTAS[0], a: entry.respuestas.q1 },
                        { q: PREGUNTAS[1], a: entry.respuestas.q2 },
                        { q: PREGUNTAS[2], a: `${entry.respuestas.q3}/10` },
                        { q: PREGUNTAS[3], a: entry.respuestas.q4 },
                        { q: PREGUNTAS[4], a: entry.respuestas.q5 },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-gray-500 mb-1">{item.q}</p>
                          <p className="text-sm text-gray-300">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'resumenes' && (
            <div className="space-y-3">
              {data.resumenes.length === 0 && (
                <div className="glass-panel p-8 rounded-xl text-center">
                  <p className="text-gray-400 text-sm">Los resúmenes semanales se generan automáticamente cada viernes.</p>
                </div>
              )}
              {data.resumenes.map(resumen => (
                <div key={resumen.id} className="glass-panel rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSummary(expandedSummary === resumen.id ? null : resumen.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-white">
                        Semana del {new Date(resumen.semana_inicio + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    {expandedSummary === resumen.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {expandedSummary === resumen.id && (
                    <div className="px-4 pb-4 animate-in fade-in duration-200">
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                        <div className="prose prose-invert max-w-none text-sm prose-p:text-gray-300 prose-headings:text-purple-300 prose-strong:text-white">
                          <Markdown>{resumen.resumen_texto}</Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
