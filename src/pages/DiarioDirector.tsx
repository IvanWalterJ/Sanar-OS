import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Sparkles, Loader2, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface DiaryEntry {
  id: number;
  date: string;
  question: string;
  answer: string;
  aiReflection: string | null;
}

function loadDiary(): DiaryEntry[] {
  try {
    const saved = localStorage.getItem('sanare_diary');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

const WEEKLY_QUESTIONS = [
  '¿Qué decisión importante tomaste esta semana como líder de tu clínica?',
  '¿Qué patrón de auto-sabotaje detectaste en vos misma esta semana?',
  '¿Qué logro profesional celebraste esta semana, por pequeño que sea?',
  '¿En qué momento sentiste resistencia al cambio? ¿Qué la provocó?',
  '¿Qué conversación difícil evitaste? ¿Qué pasaría si la tuvieras?',
  '¿Cómo equilibraste tu rol de profesional de la salud y emprendedora?',
  '¿Qué aprendiste sobre tus pacientes que podrías aplicar a tu marketing?',
  '¿Si pudieras hablar con la versión tuya de hace 6 meses, qué le dirías?',
];

export default function DiarioDirector() {
  const [entries, setEntries] = useState<DiaryEntry[]>(loadDiary);
  const [showForm, setShowForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('sanare_diary', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    // Pick a question based on entry count to rotate through them
    setCurrentQuestion(WEEKLY_QUESTIONS[entries.length % WEEKLY_QUESTIONS.length]);
  }, [entries.length]);

  const submitEntry = async () => {
    if (!answer.trim()) return;
    setGenerating(true);

    let aiReflection: string | null = null;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const previousEntries = entries.slice(-3).map(e =>
        `Pregunta: ${e.question}\nRespuesta: ${e.answer}`
      ).join('\n\n');

      const prompt = `Pregunta del diario: ${currentQuestion}
Respuesta del profesional: ${answer}

${previousEntries ? `Entradas anteriores del diario:\n${previousEntries}` : ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `Eres un coach de liderazgo personal de Sanare OS. Analiza la entrada del diario de este profesional de la salud y genera una reflexión breve (3-5 párrafos). Incluye:

1. **Validación** — Reconocé lo que está haciendo bien
2. **Patrón detectado** — Si hay entradas anteriores, identificá patrones recurrentes
3. **Desafío constructivo** — Una pregunta poderosa que lo haga pensar más profundo
4. **Acción sugerida** — Un micro-ejercicio para la próxima semana

Sé empático pero directo. No uses lenguaje condescendiente. Formato markdown breve.`,
        }
      });

      aiReflection = response.text || null;
    } catch (error) {
      console.error('Error generating reflection:', error);
      toast.error('No se pudo generar la reflexión IA, pero tu entrada fue guardada.');
    }

    const newEntry: DiaryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      question: currentQuestion,
      answer: answer.trim(),
      aiReflection,
    };

    setEntries([newEntry, ...entries]);
    setAnswer('');
    setShowForm(false);
    setGenerating(false);
    setExpandedEntry(newEntry.id);
    toast.success('Entrada guardada en tu diario');
  };

  const deleteEntry = (id: number) => {
    if (window.confirm('¿Eliminar esta entrada del diario?')) {
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Entrada eliminada');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Diario del Director</h1>
          <p className="text-gray-400">Liderazgo personal · {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Nueva Entrada
        </button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <div className="glass-panel p-6 rounded-2xl border-blue-500/30 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Reflexión de la Semana</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl bg-amber-500/5 border-amber-500/20 mb-4">
            <p className="text-sm text-amber-200 font-medium">{currentQuestion}</p>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Escribí tu reflexión honesta aquí..."
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none min-h-[150px]"
            rows={6}
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setAnswer(''); }}
              className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={submitEntry}
              disabled={!answer.trim() || generating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg shadow-amber-500/20"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Guardar y Reflexionar</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 && !showForm ? (
        <div className="glass-panel p-12 rounded-2xl text-center">
          <BookOpen className="w-12 h-12 text-amber-400/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Tu diario está vacío</h3>
          <p className="text-sm text-gray-400 mb-6">Empezá a escribir tus reflexiones semanales. La IA te ayudará a detectar patrones y crecer como líder.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
          >
            Escribir Primera Entrada
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="glass-panel rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white line-clamp-1">{entry.question}</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.date}</p>
                  </div>
                </div>
                {expandedEntry === entry.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {expandedEntry === entry.id && (
                <div className="px-6 pb-6 space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tu Respuesta</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{entry.answer}</p>
                  </div>

                  {entry.aiReflection && (
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                      <p className="text-xs text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Reflexión IA
                      </p>
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed text-sm prose-p:text-gray-300">
                        <Markdown>{entry.aiReflection}</Markdown>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
