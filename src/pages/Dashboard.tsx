import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle2, Bot, ChevronRight, Circle } from 'lucide-react';

interface Profile {
  nombre: string;
  especialidad: string;
  fecha_inicio: string;
  plan: string;
}

interface MetricWeek {
  name: string;
  leads: number;
  ventas: number;
  visitas?: number;
}

interface RoadmapTarea {
  id: string;
  titulo: string;
  descripcion: string;
  status: 'pendiente' | 'activa' | 'completada';
}

interface RoadmapFase {
  id: number;
  tareas: RoadmapTarea[];
  status: string;
}

interface DiaryEntry {
  fecha: string;
}

function loadProfile(): Profile {
  try {
    const saved = localStorage.getItem('tcd_profile');
    if (saved) return JSON.parse(saved);
  } catch { /* noop */ }
  const today = new Date().toISOString().split('T')[0];
  return { nombre: 'Profesional', especialidad: '', fecha_inicio: today, plan: 'DWY' };
}

function getProgramDay(fechaInicio: string): number {
  if (!fechaInicio) return 1;
  const inicio = new Date(fechaInicio);
  const hoy = new Date();
  const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(90, diff + 1));
}

function getActiveTask(): { tarea: RoadmapTarea; faseIdx: number; tareaIdx: number } | null {
  try {
    const roadmap = JSON.parse(localStorage.getItem('tcd_roadmap') || '{}');
    const fases: RoadmapFase[] = roadmap.fases || [];
    for (let fi = 0; fi < fases.length; fi++) {
      for (let ti = 0; ti < fases[fi].tareas.length; ti++) {
        const t = fases[fi].tareas[ti];
        if (t.status === 'activa' || t.status === 'pendiente') {
          return { tarea: t, faseIdx: fi, tareaIdx: ti };
        }
      }
    }
  } catch { /* noop */ }
  return null;
}

function markTaskComplete(faseIdx: number, tareaIdx: number) {
  try {
    const roadmap = JSON.parse(localStorage.getItem('tcd_roadmap') || '{}');
    if (!roadmap.fases?.[faseIdx]?.tareas?.[tareaIdx]) return;
    roadmap.fases[faseIdx].tareas[tareaIdx].status = 'completada';
    // activate next
    for (let ti = tareaIdx + 1; ti < roadmap.fases[faseIdx].tareas.length; ti++) {
      if (roadmap.fases[faseIdx].tareas[ti].status !== 'completada') {
        roadmap.fases[faseIdx].tareas[ti].status = 'activa';
        break;
      }
    }
    localStorage.setItem('tcd_roadmap', JSON.stringify(roadmap));
  } catch { /* noop */ }
}

function getDiaryStreak(): number {
  try {
    const diaryData = JSON.parse(localStorage.getItem('tcd_diary') || '{}');
    const entries: DiaryEntry[] = diaryData.entries || [];
    if (!entries.length) return 0;

    const sorted = [...entries].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    const d = new Date();

    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { d.setDate(d.getDate() - 1); continue; }
      if (dateStr === today) { d.setDate(d.getDate() - 1); continue; }
      if (sorted.some(e => e.fecha === dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  } catch { return 0; }
}

type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris';

function getMetricSemaforo(): { leads: SemaforoColor; conversaciones: SemaforoColor; ventas: SemaforoColor } {
  try {
    const metrics: MetricWeek[] = JSON.parse(localStorage.getItem('tcd_metrics') || '[]');
    if (metrics.length < 2) return { leads: 'gris', conversaciones: 'gris', ventas: 'gris' };

    const cur = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];

    const classify = (cur: number, prev: number): SemaforoColor => {
      if (prev === 0) return cur > 0 ? 'verde' : 'gris';
      const pct = ((cur - prev) / prev) * 100;
      if (pct > 5) return 'verde';
      if (pct >= -5) return 'amarillo';
      return 'rojo';
    };

    return {
      leads: classify(cur.leads, prev.leads),
      conversaciones: classify(cur.leads, prev.leads), // leads = conversations proxy
      ventas: classify(cur.ventas, prev.ventas),
    };
  } catch { return { leads: 'gris', conversaciones: 'gris', ventas: 'gris' }; }
}

function getLastCoachMessage(): string {
  try {
    const msgs: Array<{ role: string; content: string }> = JSON.parse(localStorage.getItem('tcd_coach_messages') || '[]');
    const assistantMsgs = msgs.filter(m => m.role === 'assistant' && m.content);
    if (assistantMsgs.length) return assistantMsgs[assistantMsgs.length - 1].content.slice(0, 120) + (assistantMsgs[assistantMsgs.length - 1].content.length > 120 ? '…' : '');
  } catch { /* noop */ }
  return 'Estoy aquí para acompañarte en cada paso del programa. ¿En qué te ayudo hoy?';
}

const SEMAFORO_COLORS: Record<SemaforoColor, string> = {
  verde: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
  amarillo: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]',
  rojo: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
  gris: 'bg-gray-600',
};

const SEMAFORO_LABELS: Record<SemaforoColor, string> = {
  verde: 'Bien',
  amarillo: 'Atención',
  rojo: 'Revisar',
  gris: 'Sin datos',
};

export default function Dashboard({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  const [profile] = useState<Profile>(loadProfile);
  const [activeTaskInfo, setActiveTaskInfo] = useState<ReturnType<typeof getActiveTask>>(null);
  const [streak, setStreak] = useState(0);
  const [semaforo, setSemaforo] = useState<ReturnType<typeof getMetricSemaforo>>({ leads: 'gris', conversaciones: 'gris', ventas: 'gris' });
  const [lastCoachMsg, setLastCoachMsg] = useState('');
  const [taskDone, setTaskDone] = useState(false);

  useEffect(() => {
    setActiveTaskInfo(getActiveTask());
    setStreak(getDiaryStreak());
    setSemaforo(getMetricSemaforo());
    setLastCoachMsg(getLastCoachMessage());
  }, []);

  const programDay = getProgramDay(profile.fecha_inicio);
  const greeting = programDay === 1 ? '¡Bienvenida al programa!' : `Día ${programDay} de 90`;

  const handleMarkComplete = () => {
    if (!activeTaskInfo) return;
    markTaskComplete(activeTaskInfo.faseIdx, activeTaskInfo.tareaIdx);
    setTaskDone(true);
    setActiveTaskInfo(getActiveTask());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-6 animate-in fade-in duration-500">

      {/* Bloque 1 — Bienvenida */}
      <div className="glass-panel p-6 rounded-2xl">
        <p className="text-sm text-gray-400 mb-1">{greeting}</p>
        <h1 className="text-3xl font-light tracking-tight text-white">{profile.nombre}</h1>
        {profile.especialidad && (
          <p className="text-sm text-blue-400 mt-1">{profile.especialidad}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.round((programDay / 90) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">Día {programDay} / 90</span>
        </div>
      </div>

      {/* Bloque 2 — Próxima tarea */}
      <div className="glass-panel p-6 rounded-2xl">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Próxima tarea de la Hoja de Ruta</p>
        {activeTaskInfo && !taskDone ? (
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Circle className="w-4 h-4 text-blue-400 fill-blue-400/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{activeTaskInfo.tarea.titulo}</p>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activeTaskInfo.tarea.descripcion}</p>
            </div>
            <button
              onClick={handleMarkComplete}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors border border-emerald-500/30 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Completar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-white font-medium">{taskDone ? '¡Tarea completada!' : '¡Todas las tareas completadas!'}</p>
              <button onClick={() => setCurrentPage('roadmap')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-0.5">
                Ver Hoja de Ruta completa →
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setCurrentPage('roadmap')}
          className="mt-4 w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>Ver todas las tareas</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bloque 3 — Racha del Diario */}
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Racha del Diario</p>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streak > 0 ? 'bg-amber-500/20' : 'bg-white/5'}`}>
              <Flame className={`w-6 h-6 ${streak > 0 ? 'text-amber-400' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-3xl font-light text-white">{streak}</p>
              <p className="text-xs text-gray-400">
                {streak === 0 ? 'Sin racha aún' : streak === 1 ? 'día seguido' : 'días seguidos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('diario')}
            className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {streak === 0 ? 'Empezar hoy' : 'Escribir entrada de hoy'}
          </button>
        </div>

        {/* Bloque 4 — Semáforo de métricas */}
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Semáforo de métricas</p>
          <div className="space-y-3">
            {([
              { key: 'leads', label: 'Leads' },
              { key: 'conversaciones', label: 'Conversaciones' },
              { key: 'ventas', label: 'Ventas' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${SEMAFORO_COLORS[semaforo[key]]}`} />
                  <span className="text-xs text-gray-500">{SEMAFORO_LABELS[semaforo[key]]}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage('metrics')}
            className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Ver métricas completas
          </button>
        </div>
      </div>

      {/* Bloque 5 — Quick Coach */}
      <div
        onClick={() => setCurrentPage('coach')}
        className="glass-panel p-6 rounded-2xl cursor-pointer hover:bg-white/[0.03] transition-colors group"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white">Coach IA</p>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{lastCoachMsg}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
