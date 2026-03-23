import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Lock, ArrowRight, X, ListChecks } from 'lucide-react';

const INITIAL_PHASES = [
    {
      title: 'Fase 1: Diagnóstico Financiero',
      status: 'completed',
      tasks: [
        { 
          id: 't1', title: 'Completar diagnóstico de identidad digital', status: 'completed',
          description: 'Analiza cómo te perciben tus pacientes actualmente en redes sociales y Google.',
          requirements: [
            { id: 'r1', text: 'Auditar perfil de Instagram', completed: true },
            { id: 'r2', text: 'Revisar reseñas en Google My Business', completed: true }
          ]
        },
        { 
          id: 't2', title: 'Calcular tu PHR (hora real neta)', status: 'completed',
          description: 'Descubre cuánto vale realmente tu hora de trabajo descontando gastos operativos.',
          requirements: [
            { id: 'r3', text: 'Listar gastos fijos mensuales', completed: true },
            { id: 'r4', text: 'Calcular horas efectivas de consulta', completed: true }
          ]
        },
        { 
          id: 't3', title: 'Completar Inyección de Capital — Plan 7 días', status: 'completed',
          description: 'Estrategia rápida para generar flujo de caja inmediato con pacientes actuales.',
          requirements: [
            { id: 'r5', text: 'Enviar mensaje de reactivación a ex-pacientes', completed: true },
            { id: 'r6', text: 'Cerrar al menos 2 consultas nuevas', completed: true }
          ]
        },
      ]
    },
    {
      title: 'Fase 2: Diseño de Oferta Premium',
      status: 'active',
      tasks: [
        { 
          id: 't4', title: 'Hacer Sesión 1 — Diagnóstico financiero', status: 'completed',
          description: 'Revisión 1 a 1 con el equipo Sanare para analizar tus números.',
          requirements: [
            { id: 'r7', text: 'Asistir a la videollamada', completed: true },
            { id: 'r8', text: 'Definir meta de facturación a 90 días', completed: true }
          ]
        },
        { 
          id: 't5', title: 'Completar Resonancia de Oferta (IA)', status: 'completed',
          description: 'Usa el módulo de IA para encontrar el ángulo perfecto de tu servicio.',
          requirements: [
            { id: 'r9', text: 'Ingresar tu especialidad y paciente ideal', completed: true },
            { id: 'r10', text: 'Guardar la promesa de valor generada', completed: true }
          ]
        },
        { 
          id: 't6', title: 'Definir tus 3 paquetes de precios', status: 'active',
          description: 'Estructura tus servicios en 3 niveles para aumentar el ticket promedio.',
          requirements: [
            { id: 'r11', text: 'Definir entregables y precio del paquete Básico', completed: false },
            { id: 'r12', text: 'Definir entregables y precio del paquete Premium', completed: false },
            { id: 'r13', text: 'Definir entregables y precio del paquete VIP', completed: false }
          ]
        },
        { 
          id: 't7', title: 'Agendar Sesión 2 con Javo', status: 'pending',
          description: 'Sesión estratégica para validar tus nuevos paquetes de precios.',
          requirements: [
            { id: 'r14', text: 'Seleccionar fecha en Calendly', completed: false },
            { id: 'r15', text: 'Enviar borrador de precios antes de la sesión', completed: false }
          ]
        },
      ]
    },
    {
      title: 'Fase 3: Sistema Digital Instalado',
      status: 'locked',
      tasks: [
        { 
          id: 't8', title: 'Construir tu landing con el módulo guiado', status: 'locked',
          description: 'Crea tu página de ventas usando la estructura validada de Sanare.',
          requirements: [
            { id: 'r16', text: 'Completar sección Hero', completed: false },
            { id: 'r17', text: 'Añadir testimonios', completed: false }
          ]
        },
        { 
          id: 't9', title: 'Conectar formulario a tu CRM', status: 'locked',
          description: 'Automatiza la captura de leads para que lleguen directamente a tu base de datos.',
          requirements: [
            { id: 'r18', text: 'Crear cuenta en CRM', completed: false },
            { id: 'r19', text: 'Integrar Webhook', completed: false }
          ]
        },
        { 
          id: 't10', title: 'Configurar secuencia de 3 emails', status: 'locked',
          description: 'Emails automáticos para nutrir a los prospectos que no compran de inmediato.',
          requirements: [
            { id: 'r20', text: 'Redactar email de bienvenida', completed: false },
            { id: 'r21', text: 'Configurar automatización', completed: false }
          ]
        },
      ]
    }
  ];

function loadRoadmapPhases() {
  try {
    const saved = localStorage.getItem('sanare_roadmap');
    return saved ? JSON.parse(saved) : INITIAL_PHASES;
  } catch { return INITIAL_PHASES; }
}

export default function Roadmap() {
  const [phases, setPhases] = useState(loadRoadmapPhases);

  useEffect(() => {
    localStorage.setItem('sanare_roadmap', JSON.stringify(phases));
  }, [phases]);

  const [selectedTaskInfo, setSelectedTaskInfo] = useState<{phaseIndex: number, taskIndex: number} | null>(null);

  const handleTaskClick = (phaseIndex: number, taskIndex: number) => {
    const task = phases[phaseIndex].tasks[taskIndex];
    if (task.status === 'locked') return;
    setSelectedTaskInfo({ phaseIndex, taskIndex });
  };

  const toggleRequirement = (reqId: string) => {
    if (!selectedTaskInfo) return;
    
    setPhases(prev => {
      const newPhases = [...prev];
      const phase = { ...newPhases[selectedTaskInfo.phaseIndex] };
      const tasks = [...phase.tasks];
      const task = { ...tasks[selectedTaskInfo.taskIndex] };
      
      task.requirements = task.requirements.map(req => 
        req.id === reqId ? { ...req, completed: !req.completed } : req
      );
      
      tasks[selectedTaskInfo.taskIndex] = task;
      phase.tasks = tasks;
      newPhases[selectedTaskInfo.phaseIndex] = phase;
      return newPhases;
    });
  };

  const completeTask = () => {
    if (!selectedTaskInfo) return;
    const { phaseIndex, taskIndex } = selectedTaskInfo;

    setPhases(prevPhases => {
      const newPhases = [...prevPhases];
      const phase = { ...newPhases[phaseIndex] };
      const tasks = [...phase.tasks];
      
      const currentStatus = tasks[taskIndex].status;
      
      // If it was already completed, we are marking it pending again
      if (currentStatus === 'completed') {
        tasks[taskIndex] = { ...tasks[taskIndex], status: 'pending' };
        // Uncheck all requirements
        tasks[taskIndex].requirements = tasks[taskIndex].requirements.map(r => ({...r, completed: false}));
      } else {
        tasks[taskIndex] = { ...tasks[taskIndex], status: 'completed' };
        // Check all requirements
        tasks[taskIndex].requirements = tasks[taskIndex].requirements.map(r => ({...r, completed: true}));
      }

      // Auto-set next pending task to 'active'
      let foundActive = false;
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].status === 'locked') continue;
        
        if (tasks[i].status === 'pending' && !foundActive) {
          tasks[i].status = 'active';
          foundActive = true;
        } else if (tasks[i].status === 'active' && foundActive) {
          tasks[i].status = 'pending';
        }
      }

      phase.tasks = tasks;
      
      // Check if phase is completed
      const allCompleted = tasks.every(t => t.status === 'completed' || t.status === 'locked');
      if (allCompleted && phase.status === 'active') {
        phase.status = 'completed';
        // Unlock next phase if exists
        if (newPhases[phaseIndex + 1]) {
          newPhases[phaseIndex + 1].status = 'active';
          newPhases[phaseIndex + 1].tasks = newPhases[phaseIndex + 1].tasks.map((t, i) => ({
            ...t,
            status: i === 0 ? 'active' : 'pending'
          }));
        }
      } else if (!allCompleted && phase.status === 'completed') {
        phase.status = 'active';
        // Lock next phases
        for (let i = phaseIndex + 1; i < newPhases.length; i++) {
          newPhases[i].status = 'locked';
          newPhases[i].tasks = newPhases[i].tasks.map(t => ({ ...t, status: 'locked' }));
        }
      }

      newPhases[phaseIndex] = phase;
      return newPhases;
    });
    
    setSelectedTaskInfo(null);
  };

  const calculateProgress = () => {
    let total = 0;
    let completed = 0;
    phases.forEach(p => {
      p.tasks.forEach(t => {
        total++;
        if (t.status === 'completed') completed++;
      });
    });
    return Math.round((completed / total) * 100);
  };

  const selectedTask = selectedTaskInfo ? phases[selectedTaskInfo.phaseIndex].tasks[selectedTaskInfo.taskIndex] : null;
  const allReqsCompleted = selectedTask?.requirements.every(r => r.completed);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-6 animate-in fade-in duration-500 relative">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Tu Hoja de Ruta</h1>
          <p className="text-gray-400">Programa de 60 días · Día 18</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-light text-blue-400">{calculateProgress()}%</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Completado</p>
        </div>
      </div>

      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
          style={{ width: `${calculateProgress()}%` }}
        />
      </div>

      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={i} className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${
            phase.status === 'active' ? 'border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : ''
          }`}>
            <div className={`p-6 flex items-center justify-between ${
              phase.status === 'active' ? 'bg-blue-500/5' : 'bg-white/[0.02]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  phase.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  phase.status === 'active' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                  'bg-white/5 text-gray-500'
                }`}>
                  {phase.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : 
                   phase.status === 'locked' ? <Lock className="w-4 h-4" /> : 
                   <span className="text-sm font-bold">{i + 1}</span>}
                </div>
                <h3 className={`text-lg font-medium ${phase.status === 'locked' ? 'text-gray-500' : 'text-gray-200'}`}>
                  {phase.title}
                </h3>
              </div>
              {phase.status === 'active' && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                  Fase Actual
                </span>
              )}
            </div>
            
            {(phase.status === 'active' || phase.status === 'completed') && (
              <div className="p-6 pt-0 border-t border-white/5">
                <div className="mt-6 space-y-4">
                  {phase.tasks.map((task, j) => (
                    <div 
                      key={task.id} 
                      onClick={() => handleTaskClick(i, j)}
                      className={`flex items-start gap-4 p-3 rounded-xl transition-colors cursor-pointer ${
                        task.status === 'active' ? 'bg-white/5 border border-white/10' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <button className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                        {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                         task.status === 'active' ? <Circle className="w-5 h-5 text-blue-400 fill-blue-400/20" /> :
                         <Circle className="w-5 h-5 text-gray-600" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm transition-colors ${
                          task.status === 'completed' ? 'text-gray-500 line-through' :
                          task.status === 'active' ? 'text-blue-100 font-medium' :
                          'text-gray-400'
                        }`}>{task.title}</p>
                        {task.status === 'active' && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                      {task.status === 'active' && (
                        <span className="text-xs flex items-center gap-1 text-blue-400">
                          Completar requerimientos <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 relative">
              <button 
                onClick={() => setSelectedTaskInfo(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTask.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  <ListChecks className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Detalles de la Tarea
                </span>
              </div>
              <h2 className="text-xl font-medium text-white mb-2 pr-8">{selectedTask.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{selectedTask.description}</p>
            </div>
            
            <div className="p-6 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-gray-200 mb-4">Requerimientos para avanzar:</h3>
              <div className="space-y-3">
                {selectedTask.requirements.map(req => (
                  <div 
                    key={req.id} 
                    onClick={() => toggleRequirement(req.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      req.completed 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-black/20 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="mt-0.5">
                      {req.completed 
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 
                        : <Circle className="w-4 h-4 text-gray-500" />
                      }
                    </div>
                    <span className={`text-sm ${req.completed ? 'text-gray-300 line-through' : 'text-gray-300'}`}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#111827]">
              <button 
                onClick={() => setSelectedTaskInfo(null)} 
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={completeTask}
                disabled={!allReqsCompleted && selectedTask.status !== 'completed'}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${
                  selectedTask.status === 'completed'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : allReqsCompleted
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-blue-500/50 text-white/50 cursor-not-allowed'
                }`}
              >
                {selectedTask.status === 'completed' ? 'Marcar como Pendiente' : 'Completar Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
