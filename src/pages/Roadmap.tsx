import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Lock, X, ListChecks, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Tarea {
  id: string;
  dia: number;
  titulo: string;
  descripcion: string;
  es_tecnica: boolean; // Si true, DFY usuarios ven botón "Delegar"
  status: 'pendiente' | 'activa' | 'completada';
}

interface Fase {
  id: number;
  titulo: string;
  subtitulo: string;
  dias: string;
  status: 'bloqueada' | 'activa' | 'completada';
  tareas: Tarea[];
  expanded: boolean;
}

interface RoadmapData {
  fases: Fase[];
}

const SEED_PHASES: Fase[] = [
  {
    id: 1,
    titulo: 'Fase 1 — Fundamentos',
    subtitulo: 'Definís quién sos, a quién ayudás y cuánto vale tu trabajo',
    dias: 'Días 1–30',
    status: 'activa',
    expanded: true,
    tareas: [
      {
        id: 'f1t1', dia: 1, es_tecnica: false, status: 'activa',
        titulo: 'Definir tu especialidad',
        descripcion: 'Identificá en qué área de la salud sos la mejor opción para tu paciente ideal. Sin especialidad clara, no hay posicionamiento posible. Esto es el punto de partida de todo.',
      },
      {
        id: 'f1t2', dia: 4, es_tecnica: false, status: 'pendiente',
        titulo: 'Identificar el problema principal que resolvés',
        descripcion: 'Tu cliente no te contrata por tu título, te contrata porque tiene un problema urgente. Escribí ese problema en una sola oración, en palabras de tu paciente, no en términos clínicos.',
      },
      {
        id: 'f1t3', dia: 8, es_tecnica: false, status: 'pendiente',
        titulo: 'Definir tu cliente ideal',
        descripcion: 'Describí a una sola persona: edad, situación de vida, qué desea, qué la frena, dónde está en redes. Cuanto más específico, más efectivo todo lo que construyas después.',
      },
      {
        id: 'f1t4', dia: 13, es_tecnica: false, status: 'pendiente',
        titulo: 'Construir tu propuesta de valor',
        descripcion: 'La promesa específica que hacés a tu cliente ideal: qué resultado concreto obtendrá, en cuánto tiempo y bajo qué condiciones. Una frase poderosa que diferencie tu programa de cualquier otro.',
      },
      {
        id: 'f1t5', dia: 18, es_tecnica: false, status: 'pendiente',
        titulo: 'Nombrar tu programa',
        descripcion: 'El nombre de tu programa es lo primero que escucha tu cliente. Tiene que hacer que diga "eso es para mí". Creá al menos 3 opciones y elegí la que mejor resuena con tu cliente ideal.',
      },
      {
        id: 'f1t6', dia: 22, es_tecnica: false, status: 'pendiente',
        titulo: 'Definir el precio de tu programa',
        descripcion: 'Calculá el precio de acuerdo al valor que entregás, no al tiempo que invertís. Un precio correcto es el que tu cliente ideal puede pagar y vos podés cobrar sin vergüenza.',
      },
      {
        id: 'f1t7', dia: 28, es_tecnica: false, status: 'pendiente',
        titulo: 'Escribir tu historia personal',
        descripcion: 'Por qué elegiste esta especialidad, qué viviste que te hace diferente, y cómo eso conecta con el problema de tu cliente ideal. Tu historia es tu mayor argumento de venta.',
      },
    ],
  },
  {
    id: 2,
    titulo: 'Fase 2 — Construcción',
    subtitulo: 'Armás las piezas técnicas que convierten desconocidos en clientes',
    dias: 'Días 31–60',
    status: 'bloqueada',
    expanded: false,
    tareas: [
      {
        id: 'f2t1', dia: 31, es_tecnica: true, status: 'pendiente',
        titulo: 'Crear tu landing page',
        descripcion: 'Una sola página que convierte visitantes en prospectos. Tiene que responder: ¿para quién es? ¿qué problema resuelve? ¿qué resultado promete? ¿cómo funciona? ¿por qué confiar?',
      },
      {
        id: 'f2t2', dia: 37, es_tecnica: true, status: 'pendiente',
        titulo: 'Escribir tu guión de venta',
        descripcion: 'Lo que decís en cada llamada de diagnóstico para que el prospecto sienta que lo entendés y quiera empezar. Un guión no es un script rígido, es una estructura que guía la conversación.',
      },
      {
        id: 'f2t3', dia: 43, es_tecnica: true, status: 'pendiente',
        titulo: 'Diseñar la secuencia de emails de bienvenida',
        descripcion: '3 emails automáticos para los prospectos que se registran pero no compran de inmediato. Bienvenida, entrega de valor, y llamada a la acción. La secuencia que trabaja mientras dormís.',
      },
      {
        id: 'f2t4', dia: 49, es_tecnica: false, status: 'pendiente',
        titulo: 'Optimizar tu perfil de Instagram',
        descripcion: 'Bio clara, foto profesional, highlights que educan, y llamada a la acción que dirige al siguiente paso. Tu perfil tiene que decirle a tu cliente ideal "esto es para vos" en menos de 3 segundos.',
      },
      {
        id: 'f2t5', dia: 53, es_tecnica: false, status: 'pendiente',
        titulo: 'Crear el contenido de lanzamiento',
        descripcion: '3 piezas de contenido que generan tu primer tráfico calificado: una historia de transformación, un video educativo, y un post de oferta directa. Publicás antes de tener todo perfecto.',
      },
      {
        id: 'f2t6', dia: 58, es_tecnica: true, status: 'pendiente',
        titulo: 'Armar tu embudo básico',
        descripcion: 'El camino completo desde que alguien te descubre hasta que compra: tráfico → landing → email → llamada → venta. Sin embudo, estás vendiendo a mano. Con embudo, escalás.',
      },
    ],
  },
  {
    id: 3,
    titulo: 'Fase 3 — Lanzamiento',
    subtitulo: 'Salís a vender, cerrás tus primeros clientes y medís resultados',
    dias: 'Días 61–90',
    status: 'bloqueada',
    expanded: false,
    tareas: [
      {
        id: 'f3t1', dia: 61, es_tecnica: false, status: 'pendiente',
        titulo: 'Iniciar primeras conversaciones de venta',
        descripcion: 'Contactás a tu lista caliente: ex-pacientes, contactos que preguntaron antes, seguidores que interactuaron. El objetivo es generar al menos 5 llamadas de diagnóstico esta semana.',
      },
      {
        id: 'f3t2', dia: 70, es_tecnica: false, status: 'pendiente',
        titulo: 'Cerrar tus primeros clientes',
        descripcion: 'Aplicás tu guión de venta en cada llamada y registrás cada resultado: cuántas personas llamaste, cuántas avanzaron, cuántas compraron. Sin datos no hay aprendizaje.',
      },
      {
        id: 'f3t3', dia: 80, es_tecnica: false, status: 'pendiente',
        titulo: 'Medir las métricas del primer mes',
        descripcion: 'Revisás leads generados, conversaciones de venta, cierres y facturación. Estos números te dicen qué funcionó y qué necesita ajuste antes del mes 2.',
      },
      {
        id: 'f3t4', dia: 88, es_tecnica: false, status: 'pendiente',
        titulo: 'Retrospectiva y plan para el mes 2',
        descripcion: 'Qué funcionó exactamente, qué cambiarías, cuál es el objetivo del mes 2 y qué vas a hacer diferente. Esta sesión de cierre es lo que separa a quienes crecen de los que repiten los mismos errores.',
      },
    ],
  },
];

function loadRoadmap(): RoadmapData {
  try {
    const saved = localStorage.getItem('tcd_roadmap');
    if (saved) return JSON.parse(saved);
  } catch { /* noop */ }
  return { fases: SEED_PHASES };
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('tcd_profile') || '{}');
  } catch { return {}; }
}

function calculateProgress(fases: Fase[]): number {
  let total = 0;
  let completed = 0;
  fases.forEach(f => {
    f.tareas.forEach(t => {
      total++;
      if (t.status === 'completada') completed++;
    });
  });
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export default function Roadmap() {
  const [data, setData] = useState<RoadmapData>(loadRoadmap);
  const [selectedTask, setSelectedTask] = useState<{ faseIdx: number; tareaIdx: number } | null>(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateNote, setDelegateNote] = useState('');
  const profile = getProfile();
  const isPlanDFY = profile.plan === 'DFY';

  useEffect(() => {
    localStorage.setItem('tcd_roadmap', JSON.stringify(data));
  }, [data]);

  const toggleFase = (faseIdx: number) => {
    setData(prev => ({
      ...prev,
      fases: prev.fases.map((f, i) => i === faseIdx ? { ...f, expanded: !f.expanded } : f),
    }));
  };

  const completeTask = (faseIdx: number, tareaIdx: number) => {
    setData(prev => {
      const fases = prev.fases.map((fase, fi) => {
        if (fi !== faseIdx) return fase;

        const tareas = fase.tareas.map((t, ti) => {
          if (ti !== tareaIdx) return t;
          return { ...t, status: t.status === 'completada' ? 'pendiente' : 'completada' } as Tarea;
        });

        // Auto-activate next pending task in this phase
        let foundActive = false;
        const updatedTareas = tareas.map(t => {
          if (t.status === 'completada') return t;
          if (!foundActive) {
            foundActive = true;
            return { ...t, status: 'activa' } as Tarea;
          }
          return { ...t, status: 'pendiente' } as Tarea;
        });

        const allCompleted = updatedTareas.every(t => t.status === 'completada');
        return { ...fase, tareas: updatedTareas, status: allCompleted ? 'completada' : 'activa' } as Fase;
      });

      // Unlock next phase if current phase is completed
      const updatedFases = fases.map((fase, fi) => {
        if (fi === faseIdx + 1 && fases[faseIdx].status === 'completada') {
          return {
            ...fase,
            status: 'activa' as const,
            expanded: true,
            tareas: fase.tareas.map((t, ti) => ({
              ...t,
              status: (ti === 0 ? 'activa' : 'pendiente') as Tarea['status'],
            })),
          };
        }
        return fase;
      });

      return { ...prev, fases: updatedFases };
    });

    setSelectedTask(null);
    toast.success('Tarea actualizada.');
  };

  const handleDelegate = () => {
    toast.success('Delegación enviada al equipo. Lo tienen en 24-48 horas.');
    setDelegateNote('');
    setShowDelegateModal(false);
    setSelectedTask(null);
  };

  const progress = calculateProgress(data.fases);
  const activeTask = (() => {
    for (const fase of data.fases) {
      const t = fase.tareas.find(t => t.status === 'activa');
      if (t) return t;
    }
    return null;
  })();

  const selected = selectedTask ? data.fases[selectedTask.faseIdx].tareas[selectedTask.tareaIdx] : null;

  // Program day
  let programDay = 1;
  if (profile.fecha_inicio) {
    const inicio = new Date(profile.fecha_inicio);
    const hoy = new Date();
    programDay = Math.max(1, Math.min(90, Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Hoja de Ruta</h1>
          <p className="text-gray-400 text-sm">Programa de 90 días · Día {programDay}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-light text-blue-400">{progress}%</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Completado</p>
        </div>
      </div>

      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {activeTask && (
        <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-wider mb-0.5">Tarea activa</p>
              <p className="text-sm text-white font-medium">{activeTask.titulo}</p>
            </div>
          </div>
          {isPlanDFY && activeTask.es_tecnica && (
            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium border border-purple-500/30">
              DFY
            </span>
          )}
        </div>
      )}

      <div className="space-y-4">
        {data.fases.map((fase, fi) => (
          <div
            key={fase.id}
            className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${
              fase.status === 'activa' ? 'border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.08)]' : ''
            }`}
          >
            <button
              onClick={() => toggleFase(fi)}
              className={`w-full p-6 flex items-center justify-between ${
                fase.status === 'activa' ? 'bg-blue-500/5' : 'bg-white/[0.02]'
              } hover:bg-white/5 transition-colors`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  fase.status === 'completada' ? 'bg-emerald-500/20 text-emerald-400' :
                  fase.status === 'activa' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                  'bg-white/5 text-gray-500'
                }`}>
                  {fase.status === 'completada' ? <CheckCircle2 className="w-5 h-5" /> :
                   fase.status === 'bloqueada' ? <Lock className="w-4 h-4" /> :
                   <span className="text-sm font-bold">{fase.id}</span>}
                </div>
                <div className="text-left">
                  <h3 className={`text-base font-medium ${fase.status === 'bloqueada' ? 'text-gray-500' : 'text-gray-200'}`}>
                    {fase.titulo}
                  </h3>
                  <p className={`text-xs mt-0.5 ${fase.status === 'bloqueada' ? 'text-gray-600' : 'text-gray-500'}`}>
                    {fase.dias} · {fase.subtitulo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {fase.status === 'activa' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                    En curso
                  </span>
                )}
                {fase.status !== 'bloqueada' && (
                  fase.expanded
                    ? <ChevronUp className="w-4 h-4 text-gray-500" />
                    : <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {fase.expanded && fase.status !== 'bloqueada' && (
              <div className="border-t border-white/5 p-4 space-y-2 animate-in fade-in duration-200">
                {fase.tareas.map((tarea, ti) => (
                  <div
                    key={tarea.id}
                    onClick={() => tarea.status !== 'pendiente' && setSelectedTask({ faseIdx: fi, tareaIdx: ti })}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                      tarea.status === 'activa'
                        ? 'bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10'
                        : tarea.status === 'completada'
                          ? 'opacity-60 cursor-pointer hover:opacity-100'
                          : 'opacity-40 cursor-default'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {tarea.status === 'completada'
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : tarea.status === 'activa'
                          ? <Circle className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                          : <Circle className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${
                          tarea.status === 'completada' ? 'text-gray-500 line-through' :
                          tarea.status === 'activa' ? 'text-blue-100 font-medium' :
                          'text-gray-500'
                        }`}>{tarea.titulo}</p>
                        {isPlanDFY && tarea.es_tecnica && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/20 shrink-0">DFY</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">Día {tarea.dia}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selected && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 relative">
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selected.status === 'completada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  <ListChecks className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Día {selected.dia}</span>
                  {isPlanDFY && selected.es_tecnica && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs border border-purple-500/30">Delegable</span>
                  )}
                </div>
              </div>
              <h2 className="text-xl font-medium text-white mb-2 pr-8">{selected.titulo}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{selected.descripcion}</p>
            </div>

            <div className="p-6 flex flex-col gap-3 bg-[#111827]">
              {isPlanDFY && selected.es_tecnica && (
                <button
                  onClick={() => setShowDelegateModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white text-sm font-medium transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Delegar al equipo
                </button>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => completeTask(selectedTask.faseIdx, selectedTask.tareaIdx)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${
                    selected.status === 'completada'
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  }`}
                >
                  {selected.status === 'completada' ? 'Marcar como pendiente' : 'Marcar como completada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal (DFY) */}
      {showDelegateModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-medium text-white mb-1">Delegar: {selected.titulo}</h3>
              <p className="text-xs text-gray-400">El equipo construirá esto por vos. Dejá cualquier nota o preferencia.</p>
            </div>
            <div className="p-6">
              <label className="block text-xs text-gray-400 mb-2">Notas para el equipo (opcional)</label>
              <textarea
                value={delegateNote}
                onChange={e => setDelegateNote(e.target.value)}
                placeholder="Ej: Mi especialidad es nutrición funcional, mi cliente ideal tiene 35-45 años..."
                rows={4}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setShowDelegateModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelegate}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Enviar al equipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
