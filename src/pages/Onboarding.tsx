import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { generateText } from '../lib/aiProvider';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

// ─── Bloques del onboarding (Método CLÍNICA — Fase 0) ────────────────────────

interface Pregunta {
  id: number;
  bloque: number;
  tituloBloque: string;
  question: string;
  placeholder: string;
}

const QUESTIONS: Pregunta[] = [
  // BLOQUE 1 — Tus referentes
  {
    id: 1,
    bloque: 1,
    tituloBloque: 'Tus Referentes',
    question: '¿A qué 3-5 profesionales del sector salud o del coaching admiras? ¿Qué tienen que vos quisieras tener?',
    placeholder: 'Ej: Admiro a X porque tiene autoridad en redes sin sonar arrogante, a Y porque cobra bien y tiene lista de espera...',
  },
  {
    id: 2,
    bloque: 1,
    tituloBloque: 'Tus Referentes',
    question: '¿Hay algún referente que no quisieras parecerte? ¿Por qué?',
    placeholder: 'Ej: No quiero parecerme a X porque su comunicación es muy agresiva y parece que solo le importa vender...',
  },

  // BLOQUE 2 — Miedos y deseos
  {
    id: 3,
    bloque: 2,
    tituloBloque: 'Tus Miedos y Deseos',
    question: '¿Cuál es tu mayor miedo respecto al crecimiento económico de tu práctica?',
    placeholder: 'Ej: Que si cobro más pierda pacientes, que parezca que solo me importa el dinero, que no esté a la altura...',
  },
  {
    id: 4,
    bloque: 2,
    tituloBloque: 'Tus Miedos y Deseos',
    question: '¿Qué te ha impedido hasta ahora cobrar lo que realmente vale tu trabajo?',
    placeholder: 'Ej: Me da vergüenza hablar de plata, creo que mis pacientes no pueden pagar más, no sé cómo justificarlo...',
  },
  {
    id: 5,
    bloque: 2,
    tituloBloque: 'Tus Miedos y Deseos',
    question: '¿Cómo imaginás tu vida con $10,000 USD extra por mes? ¿Qué sería diferente? ¿Qué sería lo primero que harías?',
    placeholder: 'Ej: Dejaría de ver 30 pacientes por semana y tendría 10 con acompañamiento real, me mudaría, contrataría a alguien...',
  },

  // BLOQUE 3 — Contexto del negocio
  {
    id: 6,
    bloque: 3,
    tituloBloque: 'Tu Negocio Hoy',
    question: '¿Cuántos años llevás en tu profesión? ¿Cómo trabajás actualmente? (presencial / online / mixto)',
    placeholder: 'Ej: 8 años como nutricionista, trabajo de forma mixta: 60% presencial en consultorio y 40% online con pacientes del interior...',
  },
  {
    id: 7,
    bloque: 3,
    tituloBloque: 'Tu Negocio Hoy',
    question: '¿Cuántos pacientes pagantes tenés hoy? ¿Cuál es el principal problema que les resolvés?',
    placeholder: 'Ej: Tengo 25 pacientes activos. Principalmente resuelvo el problema de la relación con la comida en mujeres que llevaron toda la vida haciendo dieta sin resultados sostenibles...',
  },
  {
    id: 8,
    bloque: 3,
    tituloBloque: 'Tu Negocio Hoy',
    question: '¿Cuál considerás que es tu mayor obstáculo actual para escalar tu práctica?',
    placeholder: 'Ej: No sé vender sin sentirme incómoda, no tengo un sistema — todo depende de mí, no sé cómo conseguir pacientes online...',
  },
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
      const answersText = QUESTIONS.map(q => `${q.question}\nRespuesta: ${answers[q.id]}`).join('\n\n');

      const text = await generateText({
        prompt: answersText,
        systemInstruction: `Eres el Coach IA de "tu.clínica.digital", experto en el Método CLÍNICA para sanadores. Tu objetivo es generar el ADN prototipo beta del sanador a partir de las respuestas del onboarding de Fase 0.

Este prototipo es el punto de partida — NO es el ADN definitivo. Es una primera versión que los 10 pilares del programa irán refinando con trabajo real y datos reales.

Analizá las respuestas y generá el ADN prototipo beta con este formato en markdown:

## Tu ADN Prototipo Beta

> *"Este es tu prototipo de ADN. Construido desde lo que nos contaste hoy. Ahora comienza el trabajo real: completar cada pilar lo afinará y lo hará verdadero."*

---

### Quién Sos (borrador inicial)
Párrafo breve sobre su identidad como sanador basado en sus referentes y lo que admira en ellos. Qué dice sobre sus valores el hecho de que admire a esas personas.

### A Quién Servís (hipótesis)
Primer perfil de paciente ideal basado en el contexto del negocio. Hipótesis de dolores y deseos — se refinará en los Pilares 4 y 5.

### Por Qué Hacés Lo Que Hacés (pista)
Basado en sus miedos, deseos y obstáculos: ¿qué sugieren sobre su motivación profunda? Una hipótesis del propósito que el Pilar 2 profundizará.

### Objetivo Económico
- **Meta:** $10,000 USD/mes extra
- **Camino más probable:** 5 pacientes x $2,000 (Oferta Mid) — o la combinación que más se ajuste a su contexto
- **Primer bloqueo a trabajar:** [identificá el mayor obstáculo mencionado]

### Próximo Paso
Desbloqueaste el **Pilar 1: Historia**. Ahora vas a construir tu narrativa real — no tu currículum, sino la historia que conecta tu origen con lo que hacés hoy. Eso es lo que crea conexión antes del primer contacto.

---

Sé directo, honesto y estratégico. Usá segunda persona informal (vos/tu). No seas genérico — conectá con lo específico que dijeron. Máximo 400 palabras en total.`,
      });
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
            <h1 className="text-3xl font-light tracking-tight text-[#FFFFFF] mb-2">Tu ADN Prototipo Beta</h1>
            <p className="text-[#FFFFFF]/60">Fase 0 completada — ahora comienza el trabajo real con los 10 pilares</p>
          </div>
          <button onClick={resetOnboarding} className="px-4 py-2 rounded-xl bg-[#F5A623]/10 hover:bg-[#F5A623]/20 text-sm text-[#FFFFFF]/80 transition-colors">
            Reiniciar Diagnóstico
          </button>
        </div>

        <div className="card-panel p-8 rounded-2xl border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F5A623] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#FFFFFF]" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#FFFFFF]">Análisis IA de tu Perfil</h2>
              <p className="text-xs text-[#F5A623]">Generado por Sanare Coach</p>
            </div>
          </div>
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-gray-100 prose-li:text-[#FFFFFF]/80 text-sm">
            <Markdown>{profile}</Markdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-[#FFFFFF] mb-2">Onboarding — Fase 0</h1>
        <p className="text-[#FFFFFF]/60">3 bloques · {QUESTIONS.length} preguntas · La IA genera tu ADN prototipo beta para arrancar el programa</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-[#F5A623]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5A623] transition-all duration-500"
            style={{ width: `${(Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[#FFFFFF]/40">{Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length}/{QUESTIONS.length}</span>
      </div>

      {/* Question card */}
      <div className="card-panel p-8 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#F5A623]/20 text-[#F5A623] text-sm font-bold flex items-center justify-center">
            {currentStep + 1}
          </span>
          <span className="text-xs text-[#FFFFFF]/40 uppercase tracking-wider">Bloque {QUESTIONS[currentStep].bloque} — {QUESTIONS[currentStep].tituloBloque}</span>
        </div>
        <p className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider mb-6">Pregunta {currentStep + 1} de {QUESTIONS.length}</p>

        <h2 className="text-xl font-medium text-[#FFFFFF] mb-6">{QUESTIONS[currentStep].question}</h2>

        <textarea
          value={answers[QUESTIONS[currentStep].id] || ''}
          onChange={(e) => handleAnswer(e.target.value)}
          placeholder={QUESTIONS[currentStep].placeholder}
          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm placeholder-[#FFFFFF]/30 focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all resize-none min-h-[120px]"
          rows={4}
        />

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-[#FFFFFF]/60 hover:text-[#FFFFFF] disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>

          {currentStep < QUESTIONS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canAdvance}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#F5A623] disabled:opacity-50 text-[#FFFFFF] text-sm font-medium transition-colors shadow-lg shadow-[#F5A623]/20"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={generateProfile}
              disabled={!allAnswered || generating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-[#FFFFFF] text-sm font-medium transition-all shadow-lg shadow-[#F5A623]/20"
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
              i === currentStep ? 'bg-[#F5A623] scale-125' :
              answers[q.id]?.trim() ? 'bg-[#22C55E]/60' : 'bg-[#F5A623]/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
