import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

const QUESTIONS = [
  { id: 1, question: '¿Cuál es tu especialidad profesional?', placeholder: 'Ej: Nutricionista, Psicóloga, Dermatóloga...' },
  { id: 2, question: '¿Cuántos años de experiencia tenés en tu especialidad?', placeholder: 'Ej: 5 años' },
  { id: 3, question: '¿Cómo te perciben actualmente tus pacientes en redes sociales?', placeholder: 'Describe cómo te ven, qué tipo de contenido publicás...' },
  { id: 4, question: '¿Cuál es tu paciente ideal? Describí su perfil.', placeholder: 'Edad, género, problemas que busca resolver, poder adquisitivo...' },
  { id: 5, question: '¿Cuánto cobrás actualmente por consulta y cuántas hacés por semana?', placeholder: 'Ej: $50 por consulta, 20 consultas por semana' },
  { id: 6, question: '¿Tenés presencia digital? (Landing page, redes, Google My Business)', placeholder: 'Listá tus canales digitales actuales...' },
  { id: 7, question: '¿Cuál es tu meta de facturación mensual a 90 días?', placeholder: 'Ej: $10,000 USD mensuales' },
  { id: 8, question: '¿Cuál considerás que es tu mayor obstáculo para escalar tu práctica?', placeholder: 'Ej: No sé vender, no tengo tiempo, no sé de marketing digital...' },
];

function loadOnboarding() {
  try {
    const saved = localStorage.getItem('sanare_onboarding');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function Onboarding() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const saved = loadOnboarding();
    if (saved) {
      setAnswers(saved.answers || {});
      setProfile(saved.profile || null);
      if (saved.profile) setCurrentStep(QUESTIONS.length);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(answers).length > 0 || profile) {
      localStorage.setItem('sanare_onboarding', JSON.stringify({ answers, profile }));
    }
  }, [answers, profile]);

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [QUESTIONS[currentStep].id]: value });
  };

  const canAdvance = answers[QUESTIONS[currentStep]?.id]?.trim().length > 0;
  const allAnswered = QUESTIONS.every(q => answers[q.id]?.trim());

  const generateProfile = async () => {
    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const answersText = QUESTIONS.map(q => `${q.question}\nRespuesta: ${answers[q.id]}`).join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: answersText }] }],
        config: {
          systemInstruction: `Eres un consultor estratégico de Sanare OS, una plataforma para profesionales de la salud. Analiza las respuestas del diagnóstico de identidad digital y genera un perfil profesional completo en español. Incluye:

1. **Resumen del Perfil** — quién es este profesional y su posicionamiento actual
2. **Fortalezas Detectadas** — qué tiene a favor
3. **Áreas de Oportunidad** — dónde puede mejorar
4. **Diagnóstico de Identidad Digital** — cómo se percibe online vs cómo debería percibirse
5. **Plan de Acción Inmediato** — 3 acciones concretas para las próximas 2 semanas
6. **Potencial de Facturación** — estimación basada en los datos proporcionados

Sé directo, estratégico y motivador. Usa formato markdown con headers y bullets.`,
        }
      });

      const text = response.text || '';
      setProfile(text);
      setCurrentStep(QUESTIONS.length);
      toast.success('Perfil generado exitosamente');
    } catch (error) {
      console.error('Error generating profile:', error);
      toast.error('Error al generar el perfil. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const resetOnboarding = () => {
    if (window.confirm('¿Querés reiniciar el diagnóstico? Se borrarán todas las respuestas.')) {
      setAnswers({});
      setProfile(null);
      setCurrentStep(0);
      localStorage.removeItem('sanare_onboarding');
    }
  };

  // Show profile result
  if (profile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2">Tu Perfil Digital</h1>
            <p className="text-gray-400">Diagnóstico de Identidad Digital completado</p>
          </div>
          <button onClick={resetOnboarding} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-gray-300 transition-colors">
            Reiniciar Diagnóstico
          </button>
        </div>

        <div className="glass-panel p-8 rounded-2xl border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Análisis IA de tu Perfil</h2>
              <p className="text-xs text-purple-400">Generado por Sanare Coach</p>
            </div>
          </div>
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-gray-100 prose-li:text-gray-300 text-sm">
            <Markdown>{profile}</Markdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Diagnóstico de Identidad Digital</h1>
        <p className="text-gray-400">Respondé estas {QUESTIONS.length} preguntas para que la IA analice tu perfil profesional</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${(Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length}/{QUESTIONS.length}</span>
      </div>

      {/* Question card */}
      <div className="glass-panel p-8 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold flex items-center justify-center">
            {currentStep + 1}
          </span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Pregunta {currentStep + 1} de {QUESTIONS.length}</span>
        </div>

        <h2 className="text-xl font-medium text-white mb-6">{QUESTIONS[currentStep].question}</h2>

        <textarea
          value={answers[QUESTIONS[currentStep].id] || ''}
          onChange={(e) => handleAnswer(e.target.value)}
          placeholder={QUESTIONS[currentStep].placeholder}
          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none min-h-[120px]"
          rows={4}
        />

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>

          {currentStep < QUESTIONS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canAdvance}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={generateProfile}
              disabled={!allAnswered || generating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg shadow-purple-500/20"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generar Perfil con IA</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick nav dots */}
      <div className="flex justify-center gap-2">
        {QUESTIONS.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentStep(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentStep ? 'bg-blue-500 scale-125' :
              answers[q.id]?.trim() ? 'bg-emerald-500/60' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
