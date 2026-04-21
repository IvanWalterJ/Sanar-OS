/**
 * ADN.tsx — ADN del Negocio · v7
 *
 * Renderiza los 56 campos del ADN agrupados en las 7 secciones del documento
 * maestro v7: ID (Identidad) · META (Meta/Onboarding) · IRR (Irresistible) ·
 * NEG (Negocio) · INF (Infraestructura) · CAP (Captación) · MET (Métricas).
 *
 * Fuente de datos: se mergea el Profile con los outputs completados en hoja_de_ruta
 * (mapeados vía `adn_field` en roadmapSeed.ts).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Fingerprint,
  User as UserIcon,
  Sparkles,
  DollarSign,
  Building2,
  Megaphone,
  BarChart3,
  Check,
  Circle,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { ProfileV2 } from '../lib/supabase';
import { SEED_ROADMAP_V3 } from '../lib/roadmapSeed';
import {
  ADN_SCHEMA_V7,
  calcularCompletitudSeccion,
  calcularCompletitudTotal,
  campoEstaCompleto,
  getADNValor,
  type ADNSeccion,
  type ADNSeccionCodigo,
} from '../lib/adnSchema';

interface ADNProps {
  perfil: Partial<ProfileV2>;
  userId?: string;
  setCurrentPage: (page: string) => void;
}

const ICONOS_SECCION: Record<ADNSeccionCodigo, LucideIcon> = {
  ID: Fingerprint,
  META: UserIcon,
  IRR: Sparkles,
  NEG: DollarSign,
  INF: Building2,
  CAP: Megaphone,
  MET: BarChart3,
};

// ── Helpers de visualización ──────────────────────────────────────────────────

function formatearValor(valor: unknown): string {
  if (valor === undefined || valor === null) return '—';
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return valor.filter((v) => v).join(' · ');
  if (typeof valor === 'object') {
    try {
      return JSON.stringify(valor, null, 2);
    } catch {
      return String(valor);
    }
  }
  return String(valor);
}

// ── Componente: Tarjeta de sección ────────────────────────────────────────────

interface TarjetaSeccionProps {
  seccion: ADNSeccion;
  perfil: Partial<ProfileV2>;
  expandida: boolean;
  onToggle: () => void;
}

function TarjetaSeccion({ seccion, perfil, expandida, onToggle }: TarjetaSeccionProps) {
  const Icon = ICONOS_SECCION[seccion.codigo];
  const { completos, total, porcentaje } = calcularCompletitudSeccion(perfil, seccion);

  return (
    <div className="card-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 hover:bg-[#F5A623]/5 transition-colors text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#F5A623]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-medium text-[#FFFFFF] tracking-tight">{seccion.titulo}</h3>
            <span className="text-[10px] text-[#F5A623] uppercase tracking-widest font-semibold">
              {seccion.codigo} · {seccion.pilarRange}
            </span>
          </div>
          <p className="text-sm text-[#FFFFFF]/50 mt-0.5">{seccion.subtitulo}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-[#FFFFFF]/40 uppercase tracking-wider">
              {completos} / {total}
            </p>
            <p className="text-base font-medium text-[#F5A623]">{porcentaje}%</p>
          </div>
          {expandida ? (
            <ChevronUp className="w-5 h-5 text-[#FFFFFF]/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#FFFFFF]/40" />
          )}
        </div>
      </button>

      {/* Barra de progreso */}
      <div className="h-1 bg-[#F5A623]/5">
        <div
          className="h-full bg-[#F5A623] transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {expandida && (
        <div className="px-5 pb-5 pt-3 space-y-3">
          {seccion.campos.map((campo) => {
            const completo = campoEstaCompleto(perfil, campo);
            const valor = getADNValor(perfil, campo);
            const valorTexto = formatearValor(valor);
            return (
              <div
                key={campo.codigo}
                className="border-l-2 pl-4 py-2"
                style={{ borderColor: completo ? '#F5A623' : 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {completo ? (
                      <Check className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0" />
                    ) : campo.pending ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#FFFFFF]/30 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#FFFFFF]/20 flex-shrink-0" />
                    )}
                    <p className="text-sm text-[#FFFFFF]/90 font-medium truncate">{campo.label}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {campo.criticoDia45 && (
                      <span className="text-[9px] uppercase tracking-widest text-[#F5A623] font-semibold">
                        D45
                      </span>
                    )}
                    <span className="text-[10px] text-[#FFFFFF]/30 font-mono">{campo.pilarOrigen}</span>
                  </div>
                </div>
                {completo ? (
                  <div className="prose prose-invert prose-sm max-w-none text-[#FFFFFF]/60 text-sm mt-1 pl-5">
                    {typeof valor === 'string' && valor.length > 400 ? (
                      <Markdown>{valor}</Markdown>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{valorTexto}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#FFFFFF]/30 pl-5 italic">
                    {campo.pending
                      ? 'Campo nuevo · se llenará cuando completes el pilar correspondiente.'
                      : `Se completa en ${campo.pilarOrigen}.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ADN({ perfil, userId, setCurrentPage }: ADNProps) {
  const [hojaOutputs, setHojaOutputs] = useState<Record<string, string>>({});
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<ADNSeccionCodigo>>(
    () => new Set(['IRR']),
  );

  // Cargar outputs de hoja_de_ruta y mapear por adn_field
  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;
    supabase
      .from('hoja_de_ruta')
      .select('pilar_numero, meta_codigo, completada, output_generado')
      .eq('usuario_id', userId)
      .eq('completada', true)
      .then(({ data }) => {
        if (!data) return;
        const outputs: Record<string, string> = {};
        for (const row of data) {
          const pilar = SEED_ROADMAP_V3.find((p) => p.numero === row.pilar_numero);
          if (!pilar) continue;
          const meta = pilar.metas.find((m) => m.codigo === row.meta_codigo);
          if (!meta?.adn_field) continue;
          const texto = (row.output_generado as { texto?: unknown })?.texto;
          if (typeof texto === 'string' && texto.trim()) {
            // Historia 300 puede traer las 3 versiones concatenadas
            if (meta.adn_field === 'historia_300') {
              const m300 = texto.match(/---\s*HISTORIA\s+300\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+150|$)/i);
              const m150 = texto.match(/---\s*HISTORIA\s+150\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+50|$)/i);
              const m50 = texto.match(/---\s*HISTORIA\s+50\s+PALABRAS\s*---\s*([\s\S]*?)$/i);
              if (m300 && m150 && m50) {
                outputs.historia_300 = m300[1].trim();
                outputs.historia_150 = m150[1].trim();
                outputs.historia_50 = m50[1].trim();
              } else {
                outputs.historia_300 = texto;
              }
            } else {
              outputs[meta.adn_field] = texto;
            }
          }
        }
        setHojaOutputs(outputs);
      });
  }, [userId]);

  // Merge profile + outputs para vista completa
  const mergedPerfil = useMemo(() => {
    const merged = { ...perfil } as Record<string, unknown>;
    for (const [key, val] of Object.entries(hojaOutputs)) {
      if (!merged[key] || (typeof merged[key] === 'string' && !(merged[key] as string).trim())) {
        merged[key] = val;
      }
    }
    return merged as Partial<ProfileV2>;
  }, [perfil, hojaOutputs]);

  const totalStats = calcularCompletitudTotal(mergedPerfil);

  const toggleSeccion = (codigo: ADNSeccionCodigo) => {
    setSeccionesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-[10px] text-[#F5A623] uppercase tracking-widest font-semibold">
          Documento maestro v7 · 7 secciones · 56 campos
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-[#FFFFFF] tracking-tight">
          ADN del Negocio
        </h1>
        <p className="text-[#FFFFFF]/60 max-w-2xl">
          Todo lo que construís a lo largo de los 90 días se condensa acá. Cada pilar lo refina un
          poco más. Al día 45 los campos marcados <span className="text-[#F5A623] font-semibold">D45</span> deben estar
          completos para pasar a Fase 4.
        </p>
      </div>

      {/* Resumen global */}
      <div className="card-panel p-6 flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs text-[#FFFFFF]/40 uppercase tracking-widest mb-1 font-semibold">
            Progreso del ADN
          </p>
          <p className="text-3xl font-light text-[#FFFFFF] tracking-tight">
            {totalStats.porcentaje}%
            <span className="text-sm text-[#FFFFFF]/40 ml-2">
              ({totalStats.completos} de {totalStats.total} campos)
            </span>
          </p>
          <div className="h-2 bg-[#F5A623]/5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#F5A623] rounded-full transition-all duration-700"
              style={{ width: `${totalStats.porcentaje}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentPage('roadmap')}
          className="btn-primary text-sm whitespace-nowrap"
        >
          Ir a la Hoja de Ruta
        </button>
      </div>

      {/* Secciones */}
      <div className="space-y-4">
        {ADN_SCHEMA_V7.map((seccion) => (
          <TarjetaSeccion
            key={seccion.codigo}
            seccion={seccion}
            perfil={mergedPerfil}
            expandida={seccionesExpandidas.has(seccion.codigo)}
            onToggle={() => toggleSeccion(seccion.codigo)}
          />
        ))}
      </div>

      <p className="text-xs text-[#FFFFFF]/30 text-center pt-4">
        Versión alineada con el documento maestro v7 · método CLÍNICA
      </p>
    </div>
  );
}
