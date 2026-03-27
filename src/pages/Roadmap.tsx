import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronUp,
  Star,
  Trophy,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { HojaDeRutaItem, VentaRegistrada } from '../lib/supabase';
import {
  SEED_ROADMAP_V2,
  calcularNivel,
  TOTAL_METAS,
  type RoadmapPilar,
  type RoadmapMeta,
} from '../lib/roadmapSeed';
import { NIVEL_NOMBRES } from '../lib/supabase';

// ─── Tipos locales ────────────────────────────────────────────────────────────

type EstadoPilar = 'completado' | 'en_progreso' | 'bloqueado';

interface PilarConEstado extends RoadmapPilar {
  estado: EstadoPilar;
  metasCompletadas: number;
  totalMetas: number;
  estrellas_completadas: number;
}

interface Props {
  userId?: string;
  perfil?: { nombre?: string; dia_programa?: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPilarColorClasses(color: string, estado: EstadoPilar) {
  const base = `border rounded-2xl transition-all duration-300`;
  if (estado === 'completado') return `${base} bg-${color}-500/20 border-${color}-500/40`;
  if (estado === 'en_progreso') return `${base} bg-${color}-500/10 border-${color}-500/25`;
  return `${base} bg-white/3 border-white/8`;
}

function getEmojiEstado(estado: EstadoPilar) {
  if (estado === 'completado') return '✅';
  if (estado === 'en_progreso') return '⚡';
  return '🔒';
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Roadmap({ userId, perfil }: Props) {
  const [completadas, setCompletadas] = useState<Set<string>>(new Set());
  const [ventas, setVentas] = useState<VentaRegistrada[]>([]);
  const [qaVerde, setQaVerde] = useState(false);
  const [pilarAbierto, setPilarAbierto] = useState<number | null>(null);
  const [celebracion, setCelebracion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Cargar datos de Supabase ───────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      if (!isSupabaseReady() || !supabase || !userId) {
        // Modo offline: cargar desde localStorage
        try {
          const saved = localStorage.getItem('tcd_hoja_ruta_v2');
          if (saved) setCompletadas(new Set(JSON.parse(saved)));
        } catch { /* noop */ }
        setLoading(false);
        return;
      }

      const [{ data: hdr }, { data: vts }] = await Promise.all([
        supabase.from('hoja_de_ruta').select('*').eq('usuario_id', userId),
        supabase.from('ventas_registradas').select('*').eq('usuario_id', userId),
      ]);

      if (hdr) {
        const keys = (hdr as HojaDeRutaItem[])
          .filter((r) => r.completada)
          .map((r) => `${r.pilar_numero}-${r.meta_codigo}`);
        setCompletadas(new Set(keys));

        // Verificar QA verde (Pilar 7)
        const qa = (hdr as HojaDeRutaItem[]).find(
          (r) => r.pilar_numero === 6 && r.meta_codigo === '6.B',
        );
        if (qa?.output_generado && qa.output_generado['qa_points_green'] === '24') {
          setQaVerde(true);
        }
      }

      if (vts) setVentas(vts as VentaRegistrada[]);
      setLoading(false);
    }
    cargar();
  }, [userId]);

  // ─── Persistir en localStorage ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('tcd_hoja_ruta_v2', JSON.stringify([...completadas]));
  }, [completadas]);

  // ─── Lógica de desbloqueo ───────────────────────────────────────────────
  const calcularEstadoPilar = useCallback(
    (pilar: RoadmapPilar, pilares: RoadmapPilar[]): EstadoPilar => {
      const completadasPilar = pilar.metas.filter((m) =>
        completadas.has(`${pilar.numero}-${m.codigo}`),
      ).length;
      const totalMetas = pilar.metas.length;

      // Verificar si está desbloqueado
      let desbloqueado = false;
      switch (pilar.desbloqueo) {
        case 'auto':
          desbloqueado = true;
          break;
        case 'completar_anterior': {
          const anterior = pilares.find((p) => p.numero === pilar.numero - 1);
          if (!anterior) { desbloqueado = true; break; }
          const estrellasPrevias = anterior.metas.filter(
            (m) => m.es_estrella && completadas.has(`${anterior.numero}-${m.codigo}`),
          ).length;
          desbloqueado = estrellasPrevias >= (pilar.estrellas_requeridas ?? 1);
          break;
        }
        case 'venta_real':
          desbloqueado = ventas.length > 0;
          break;
        case 'qa_verde':
          desbloqueado = qaVerde;
          break;
      }

      if (!desbloqueado) return 'bloqueado';
      if (completadasPilar >= totalMetas) return 'completado';
      return 'en_progreso';
    },
    [completadas, ventas, qaVerde],
  );

  // ─── Enriquecer pilares con estado ─────────────────────────────────────
  const pilaresConEstado: PilarConEstado[] = SEED_ROADMAP_V2.map((pilar) => {
    const estado = calcularEstadoPilar(pilar, SEED_ROADMAP_V2);
    const metasCompletadas = pilar.metas.filter((m) =>
      completadas.has(`${pilar.numero}-${m.codigo}`),
    ).length;
    const estrellas_completadas = pilar.metas.filter(
      (m) => m.es_estrella && completadas.has(`${pilar.numero}-${m.codigo}`),
    ).length;
    return { ...pilar, estado, metasCompletadas, totalMetas: pilar.metas.length, estrellas_completadas };
  });

  // ─── Métricas globales ─────────────────────────────────────────────────
  const totalCompletadas = completadas.size;
  const progresoPct = TOTAL_METAS === 0 ? 0 : Math.round((totalCompletadas / TOTAL_METAS) * 100);
  const pilarMasAltoCompletado = pilaresConEstado
    .filter((p) => p.estado === 'completado')
    .reduce((max, p) => Math.max(max, p.numero), -1);
  const nivel = calcularNivel(pilarMasAltoCompletado);
  const nombreNivel = NIVEL_NOMBRES[nivel];

  // ─── Toggle completar meta ─────────────────────────────────────────────
  const toggleMeta = useCallback(
    async (pilarNum: number, meta: RoadmapMeta, pilarEstado: EstadoPilar) => {
      if (pilarEstado === 'bloqueado') return;

      const key = `${pilarNum}-${meta.codigo}`;
      const ahoraCompletada = !completadas.has(key);

      setCompletadas((prev) => {
        const next = new Set(prev);
        if (ahoraCompletada) next.add(key);
        else next.delete(key);
        return next;
      });

      // Celebración
      if (ahoraCompletada && meta.es_estrella) {
        setCelebracion(`⭐ Meta completada: ${meta.titulo}`);
        setTimeout(() => setCelebracion(null), 3500);
      }

      // Sincronizar con Supabase
      if (isSupabaseReady() && supabase && userId) {
        await supabase.from('hoja_de_ruta').upsert(
          {
            usuario_id: userId,
            pilar_numero: pilarNum,
            meta_codigo: meta.codigo,
            completada: ahoraCompletada,
            es_estrella: meta.es_estrella,
            fecha_completada: ahoraCompletada ? new Date().toISOString().split('T')[0] : null,
          },
          { onConflict: 'usuario_id,pilar_numero,meta_codigo' },
        );
      }
    },
    [completadas, userId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Cargando tu Hoja de Ruta...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* ── Notificación de celebración ── */}
      {celebracion && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-500/90 backdrop-blur text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-in slide-in-from-right duration-300">
          {celebracion}
        </div>
      )}

      {/* ── Header ── */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-white flex items-center gap-2">
              🗺️ Hoja de Ruta
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Método CLÍNICA · 90 días · 9 pilares
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Nivel actual</p>
            <p className="text-sm font-medium text-indigo-400 mt-0.5">{nombreNivel}</p>
            <p className="text-xs text-gray-500">Nivel {nivel} de 5</p>
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progreso global</span>
            <span>{progresoPct}% — {totalCompletadas} de {TOTAL_METAS} metas</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
              style={{ width: `${progresoPct}%` }}
            />
          </div>
        </div>

        {/* Indicadores rápidos */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-lg font-light text-white">{perfil?.dia_programa ?? 1}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Día de prog.</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-lg font-light text-white">{ventas.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ventas registradas</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className="text-lg font-light text-white">
              {pilaresConEstado.filter((p) => p.estado === 'completado').length}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pilares completados</p>
          </div>
        </div>
      </div>

      {/* ── Mapa visual de 9 pilares ── */}
      <div className="grid grid-cols-3 gap-3">
        {pilaresConEstado.map((pilar) => (
          <button
            key={pilar.numero}
            onClick={() => setPilarAbierto(pilarAbierto === pilar.numero ? null : pilar.numero)}
            disabled={pilar.estado === 'bloqueado'}
            className={`relative text-left p-4 rounded-2xl border transition-all duration-300 ${
              pilar.estado === 'bloqueado'
                ? 'bg-white/3 border-white/8 cursor-not-allowed opacity-50'
                : pilar.estado === 'completado'
                ? `bg-${pilar.color}-500/20 border-${pilar.color}-500/40 hover:bg-${pilar.color}-500/25`
                : `bg-${pilar.color}-500/10 border-${pilar.color}-500/25 hover:bg-${pilar.color}-500/15`
            } ${pilarAbierto === pilar.numero ? 'ring-2 ring-white/20' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{pilar.emoji}</span>
              {pilar.estado === 'bloqueado' ? (
                <Lock className="w-3.5 h-3.5 text-gray-600" />
              ) : pilar.estado === 'completado' ? (
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
              )}
            </div>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Pilar {pilar.numero}
            </p>
            <p className={`text-xs font-medium mt-0.5 ${pilar.estado === 'bloqueado' ? 'text-gray-600' : 'text-white'}`}>
              {pilar.titulo}
            </p>

            {/* Mini barra de progreso */}
            {pilar.estado !== 'bloqueado' && (
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${pilar.color}-500 rounded-full transition-all duration-500`}
                  style={{ width: `${pilar.totalMetas === 0 ? 0 : Math.round((pilar.metasCompletadas / pilar.totalMetas) * 100)}%` }}
                />
              </div>
            )}

            {/* Condición de desbloqueo especial */}
            {pilar.estado === 'bloqueado' && (
              <p className="text-[9px] text-gray-600 mt-1.5 leading-tight">
                {pilar.desbloqueo === 'venta_real' && 'Requiere 1 venta real'}
                {pilar.desbloqueo === 'qa_verde' && 'Requiere QA 24/24 ✓'}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* ── Detalle del pilar seleccionado ── */}
      {pilarAbierto !== null && (() => {
        const pilar = pilaresConEstado.find((p) => p.numero === pilarAbierto);
        if (!pilar || pilar.estado === 'bloqueado') return null;

        return (
          <div className="glass-panel rounded-2xl overflow-hidden animate-in slide-in-from-top duration-300">
            {/* Cabecera del pilar */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{pilar.emoji}</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                      Pilar {pilar.numero}
                    </p>
                    <h2 className="text-lg font-light text-white">{pilar.titulo}</h2>
                    <p className="text-xs text-gray-400">{pilar.subtitulo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPilarAbierto(null)}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              {/* Progreso del pilar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{pilar.metasCompletadas} de {pilar.totalMetas} metas</span>
                  <span>{pilar.estrellas_completadas} ⭐ completadas</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-${pilar.color}-500 rounded-full transition-all duration-700`}
                    style={{ width: `${pilar.totalMetas === 0 ? 0 : Math.round((pilar.metasCompletadas / pilar.totalMetas) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Aviso de desbloqueo especial */}
              {(pilar.desbloqueo === 'venta_real' || pilar.desbloqueo === 'qa_verde') && (
                <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    {pilar.desbloqueo === 'venta_real'
                      ? 'Este pilar se desbloqueó porque registraste tu primera venta real. 🎉'
                      : 'Este pilar se desbloqueó porque completaste el QA del embudo con 24/24 puntos verdes. 🎉'}
                  </p>
                </div>
              )}
            </div>

            {/* Lista de metas */}
            <div className="p-4 space-y-3">
              {pilar.metas.map((meta) => {
                const key = `${pilar.numero}-${meta.codigo}`;
                const estaCompletada = completadas.has(key);

                return (
                  <div
                    key={meta.codigo}
                    onClick={() => toggleMeta(pilar.numero, meta, pilar.estado)}
                    className={`group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                      estaCompletada
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {estaCompletada ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                          {meta.codigo}
                        </span>
                        {meta.es_estrella && (
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        )}
                        {meta.herramienta_id && (
                          <span className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-medium">
                            🔧 {meta.herramienta_id}
                          </span>
                        )}
                        {meta.agente_id && (
                          <span className="text-[9px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-medium">
                            🤖 Agente
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${estaCompletada ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {meta.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {meta.descripcion}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-600 font-medium">
                          ⏱ {meta.tiempo_estimado}
                        </span>
                        {meta.es_estrella && (
                          <span className="text-[10px] text-yellow-500 font-medium">
                            ★ Desbloquea siguiente pilar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicador de estrellas requeridas */}
            {pilar.estrellas_requeridas && pilar.numero < 8 && (
              <div className="px-4 pb-4">
                <div className={`text-xs rounded-xl px-4 py-3 border ${
                  pilar.estrellas_completadas >= pilar.metas.filter((m) => m.es_estrella).length
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/3 border-white/8 text-gray-500'
                }`}>
                  {pilar.estrellas_completadas >= pilar.metas.filter((m) => m.es_estrella).length
                    ? `✅ Pilar ${pilar.numero + 1} desbloqueado — todas las metas ★ completadas`
                    : `⭐ Completá ${pilar.metas.filter((m) => m.es_estrella).length - pilar.estrellas_completadas} metas ★ más para desbloquear el Pilar ${pilar.numero + 1}`}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
