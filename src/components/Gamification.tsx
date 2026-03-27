/**
 * Gamification.tsx — Sistema de gamificación dopamínico (3 capas)
 *
 * Capa 1: Progreso % + Badge por pilar
 * Capa 2: 5 niveles con nombres del viaje del sanador
 * Capa 3: Mapa visual (integrado en Roadmap.tsx)
 * Notificaciones de celebración personalizadas
 */
import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Lock } from 'lucide-react';
import { NIVEL_NOMBRES, type NivelNombre } from '../lib/supabase';
import { calcularNivel, SEED_ROADMAP_V2 } from '../lib/roadmapSeed';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProgresoGamificacion {
  pilarCompletadoMasAlto: number;
  metasCompletadasTotal: number;
  metasTotalPrograma: number;
  progresoPorcentaje: number;
  ventasRegistradas: number;
  diasEnPrograma: number;
  nombreUsuario?: string;
  especialidad?: string;
  ultimaVenta?: { monto?: number; canal?: string };
}

interface BadgePilar {
  numero: number;
  titulo: string;
  emoji: string;
  color: string;
  desbloqueado: boolean;
  completado: boolean;
  pct: number;
}

// ─── Configuración de niveles ─────────────────────────────────────────────────

const NIVELES: {
  nivel: 1 | 2 | 3 | 4 | 5;
  nombre: NivelNombre;
  descripcion: string;
  color: string;
  emoji: string;
  pilaresRequeridos: number[];
}[] = [
  {
    nivel: 1,
    nombre: 'El Sanador Despierto',
    descripcion: 'Tomaste la decisión. Sabés que hay otra forma de ejercer tu profesión.',
    color: 'emerald',
    emoji: '🌱',
    pilaresRequeridos: [0, 1],
  },
  {
    nivel: 2,
    nombre: 'El Especialista Claro',
    descripcion: 'Conocés tu nicho, tu avatar y tu propuesta de valor con claridad quirúrgica.',
    color: 'blue',
    emoji: '🎯',
    pilaresRequeridos: [2, 3],
  },
  {
    nivel: 3,
    nombre: 'El Creador de Presencia',
    descripcion: 'Tu clínica digital está viva. Publicás, captás y estás en el mercado.',
    color: 'cyan',
    emoji: '📡',
    pilaresRequeridos: [4, 5],
  },
  {
    nivel: 4,
    nombre: 'El Arquitecto de Ventas',
    descripcion: 'Tu embudo funciona, tus campañas generan leads y cerrás ventas.',
    color: 'orange',
    emoji: '🚀',
    pilaresRequeridos: [6, 7],
  },
  {
    nivel: 5,
    nombre: 'El Emprendedor Libre',
    descripcion: 'Optimizaste, escalaste y tenés el plan para el siguiente nivel.',
    color: 'rose',
    emoji: '⚡',
    pilaresRequeridos: [8],
  },
];

// ─── Componente: Tarjeta de nivel ─────────────────────────────────────────────

export function TarjetaNivel({
  nivelActual,
  diasEnPrograma,
}: {
  nivelActual: 1 | 2 | 3 | 4 | 5;
  diasEnPrograma: number;
}) {
  const cfg = NIVELES.find((n) => n.nivel === nivelActual)!;
  const siguiente = NIVELES.find((n) => n.nivel === nivelActual + 1);

  return (
    <div className={`bg-${cfg.color}-500/10 border border-${cfg.color}-500/25 rounded-2xl p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{cfg.emoji}</span>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Nivel {nivelActual} de 5</p>
            <h3 className={`text-base font-medium text-${cfg.color}-300`}>{cfg.nombre}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Día</p>
          <p className="text-lg font-light text-white">{diasEnPrograma}</p>
          <p className="text-[10px] text-gray-600">de 90</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">{cfg.descripcion}</p>
      {siguiente && (
        <div className="flex items-center gap-2 pt-1">
          <Lock className="w-3 h-3 text-gray-600" />
          <p className="text-[10px] text-gray-500">
            Próximo: <span className="text-gray-400">{siguiente.nombre}</span>
          </p>
        </div>
      )}
      {nivelActual === 5 && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <p className="text-xs text-yellow-300 font-medium">¡Completaste el Método CLÍNICA!</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente: Grid de badges por pilar ─────────────────────────────────────

export function GridBadgesPilares({
  completadasPorPilar,
  desbloqueadosPorPilar,
}: {
  completadasPorPilar: Record<number, number>;
  desbloqueadosPorPilar: Record<number, boolean>;
}) {
  const badges: BadgePilar[] = SEED_ROADMAP_V2.map((pilar) => {
    const total = pilar.metas.length;
    const completadas = completadasPorPilar[pilar.numero] ?? 0;
    return {
      numero: pilar.numero,
      titulo: pilar.titulo,
      emoji: pilar.emoji,
      color: pilar.color,
      desbloqueado: desbloqueadosPorPilar[pilar.numero] ?? false,
      completado: completadas >= total && total > 0,
      pct: total === 0 ? 0 : Math.round((completadas / total) * 100),
    };
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map((badge) => (
        <div
          key={badge.numero}
          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
            badge.completado
              ? `bg-${badge.color}-500/20 border-${badge.color}-500/40`
              : badge.desbloqueado
              ? 'bg-white/5 border-white/10'
              : 'bg-white/2 border-white/5 opacity-40'
          }`}
        >
          {/* Badge de completado */}
          {badge.completado && (
            <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-${badge.color}-500 flex items-center justify-center`}>
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          )}

          <span className="text-xl">{badge.emoji}</span>
          <p className="text-[10px] text-gray-400 text-center leading-tight font-medium">
            {badge.titulo}
          </p>

          {/* Mini barra */}
          {badge.desbloqueado && (
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${badge.color}-500 rounded-full transition-all`}
                style={{ width: `${badge.pct}%` }}
              />
            </div>
          )}
          {!badge.desbloqueado && (
            <Lock className="w-3 h-3 text-gray-600" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Componente: Notificación de celebración personalizada ────────────────────

export interface CelebracionPayload {
  tipo: 'tarea' | 'pilar' | 'nivel' | 'primera_venta';
  titulo?: string;
  outputReferencia?: string;
  nombreNivel?: string;
  diasTardados?: number;
  monto?: number;
  canal?: string;
  especialidad?: string;
}

export function generarMensajeCelebracion(payload: CelebracionPayload): string {
  switch (payload.tipo) {
    case 'tarea':
      return payload.outputReferencia
        ? `✅ Completaste: ${payload.titulo}. ${payload.outputReferencia}`
        : `✅ ${payload.titulo} — ¡listo!`;

    case 'pilar':
      return `🏆 Pilar completado: ${payload.titulo}. ¡El siguiente pilar está desbloqueado!`;

    case 'nivel':
      return `⚡ Subiste al nivel "${payload.nombreNivel}" en ${payload.diasTardados} días. Eso habla de tu consistencia.`;

    case 'primera_venta':
      return `🎉 ¡PRIMERA VENTA! ${payload.monto ? `$${payload.monto} ` : ''}cerrada por ${payload.canal ?? 'tu canal'}. ${payload.especialidad ? `Tu clínica digital de ${payload.especialidad} está generando ingresos.` : 'Tu clínica digital está generando ingresos.'} Este momento lo recordarás siempre.`;
  }
}

export function ToastCelebracion({
  payload,
  onClose,
}: {
  payload: CelebracionPayload;
  onClose: () => void;
}) {
  const mensaje = generarMensajeCelebracion(payload);
  const isVenta = payload.tipo === 'primera_venta';

  useEffect(() => {
    const t = setTimeout(onClose, isVenta ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [onClose, isVenta]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 max-w-sm rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right duration-300 ${
        isVenta
          ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20 border border-yellow-500/40 backdrop-blur-xl'
          : 'bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-xl'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">
          {payload.tipo === 'primera_venta' ? '🎉' : payload.tipo === 'nivel' ? '⚡' : '✅'}
        </span>
        <div>
          <p className={`text-sm font-medium ${isVenta ? 'text-yellow-200' : 'text-white'}`}>
            {mensaje}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-white text-lg leading-none ml-1">
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Componente: Panel de gamificación completo ───────────────────────────────

export function PanelGamificacion({ progreso }: { progreso: ProgresoGamificacion }) {
  const nivel = calcularNivel(progreso.pilarCompletadoMasAlto);

  const completadasPorPilar: Record<number, number> = {};
  const desbloqueadosPorPilar: Record<number, boolean> = {};
  // Nota: en uso real estos datos vienen de HojaDeRutaItem[] del padre

  return (
    <div className="space-y-4">
      <TarjetaNivel nivelActual={nivel} diasEnPrograma={progreso.diasEnPrograma} />

      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          Progreso global
        </h3>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progreso.metasCompletadasTotal} de {progreso.metasTotalPrograma} metas</span>
            <span className="font-medium text-white">{progreso.progresoPorcentaje}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
              style={{ width: `${progreso.progresoPorcentaje}%` }}
            />
          </div>
        </div>
        <GridBadgesPilares
          completadasPorPilar={completadasPorPilar}
          desbloqueadosPorPilar={desbloqueadosPorPilar}
        />
      </div>
    </div>
  );
}
