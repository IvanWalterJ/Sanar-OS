/**
 * ManualNegocio.tsx — ADN del Negocio
 * Progress view organized by the CLINICA method letters
 * showing all completed ADN fields.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Heart,
  Unlock,
  Star,
  Briefcase,
  Layout,
  Users,
  Crown,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { ProfileV2 } from '../lib/supabase';
import type { LucideIcon } from 'lucide-react';
import { SEED_ROADMAP_V3 } from '../lib/roadmapSeed';

// ── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'object' | 'array';
}

interface SectionDef {
  readonly id: string;
  readonly letter: string;
  readonly name: string;
  readonly pillars: string;
  readonly icon: LucideIcon;
  readonly fields: readonly FieldDef[];
}

interface ManualNegocioProps {
  perfil: Partial<ProfileV2>;
  userId?: string;
  setCurrentPage: (page: string) => void;
}

// ── Section definitions ──────────────────────────────────────────────────────

const SECTIONS: readonly SectionDef[] = [
  {
    id: 'claridad',
    letter: 'C',
    name: 'Claridad',
    pillars: 'P1-P3',
    icon: Heart,
    fields: [
      { key: 'adn_linea_tiempo', label: 'Linea de tiempo vital', type: 'string' },
      { key: 'historia_300', label: 'Historia -- version larga', type: 'string' },
      { key: 'historia_150', label: 'Historia -- version media', type: 'string' },
      { key: 'historia_50', label: 'Historia -- version corta', type: 'string' },
      { key: 'adn_cinco_por_que', label: 'Los 5 por que', type: 'array' },
      { key: 'proposito', label: 'Proposito', type: 'string' },
      { key: 'adn_carta_futuro', label: 'Carta al yo del futuro', type: 'string' },
      { key: 'legado', label: 'Legado', type: 'string' },
    ],
  },
  {
    id: 'liberacion',
    letter: 'L',
    name: 'Liberacion',
    pillars: 'P4',
    icon: Unlock,
    fields: [
      { key: 'adn_pacientes_reales', label: 'Analisis de 3 pacientes reales', type: 'string' },
    ],
  },
  {
    id: 'irresistible',
    letter: 'I',
    name: 'Irresistible',
    pillars: 'P4-P8',
    icon: Star,
    fields: [
      { key: 'adn_avatar', label: 'Avatar del Paciente Ideal', type: 'object' },
      { key: 'adn_nicho', label: 'Nicho', type: 'string' },
      { key: 'adn_usp', label: 'Propuesta Unica de Venta', type: 'string' },
      { key: 'adn_transformaciones', label: 'Transformaciones reales', type: 'string' },
      { key: 'matriz_a', label: 'Matriz A -- El Infierno', type: 'string' },
      { key: 'matriz_b', label: 'Matriz B -- Los Obstaculos', type: 'string' },
      { key: 'matriz_c', label: 'Matriz C -- El Cielo', type: 'string' },
      { key: 'metodo_nombre', label: 'Metodo Propio (nombre)', type: 'string' },
      { key: 'metodo_pasos', label: 'Metodo Propio (pasos)', type: 'string' },
    ],
  },
  {
    id: 'negocio',
    letter: 'N',
    name: 'Negocio',
    pillars: 'P7-P8',
    icon: Briefcase,
    fields: [
      { key: 'adn_proceso_actual', label: 'Proceso actual documentado', type: 'string' },
      { key: 'oferta_mid', label: 'Oferta principal (Mid)', type: 'string' },
      { key: 'oferta_high', label: 'Oferta High', type: 'string' },
      { key: 'oferta_low', label: 'Oferta Low', type: 'string' },
      { key: 'lead_magnet', label: 'Lead Magnet', type: 'string' },
    ],
  },
  {
    id: 'infraestructura',
    letter: 'I',
    name: 'Infraestructura',
    pillars: 'P9A',
    icon: Layout,
    fields: [
      { key: 'adn_landing_copy', label: 'Landing page copy', type: 'string' },
      { key: 'adn_anuncios', label: 'Anuncios Meta', type: 'string' },
    ],
  },
  {
    id: 'captacion',
    letter: 'C',
    name: 'Captacion',
    pillars: 'P9B-P9C',
    icon: Users,
    fields: [
      { key: 'script_venta', label: 'Script de ventas', type: 'string' },
      { key: 'adn_protocolo_servicio', label: 'Protocolo de entrega', type: 'string' },
    ],
  },
  {
    id: 'autonomia',
    letter: 'A',
    name: 'Autonomia',
    pillars: 'P10',
    icon: Crown,
    fields: [
      { key: 'adn_identidad_sistema', label: 'Sistema de identidad visual', type: 'string' },
    ],
  },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFieldValue(perfil: Partial<ProfileV2>, key: string): unknown {
  return (perfil as Record<string, unknown>)[key];
}

function isFieldCompleted(perfil: Partial<ProfileV2>, field: FieldDef): boolean {
  const val = getFieldValue(perfil, field.key);
  if (val === undefined || val === null) return false;
  if (field.type === 'string') return typeof val === 'string' && val.trim().length > 0;
  if (field.type === 'array') return Array.isArray(val) && val.length > 0;
  if (field.type === 'object') return typeof val === 'object' && Object.keys(val as object).length > 0;
  return false;
}

function countCompleted(perfil: Partial<ProfileV2>, fields: readonly FieldDef[]): number {
  return fields.filter((f) => isFieldCompleted(perfil, f)).length;
}

// ── Avatar card renderer ─────────────────────────────────────────────────────

interface AvatarData {
  nombre_ficticio?: string;
  edad?: number;
  profesion?: string;
  situacion?: string;
  dolores?: string[];
  suenos?: string[];
  objeciones?: string[];
  lenguaje?: string[];
}

function AvatarCard({ data }: { data: AvatarData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {data.nombre_ficticio && (
          <div>
            <span className="text-xs text-[#F5A623]">Nombre ficticio</span>
            <p className="text-sm text-[#FFFFFF]">{data.nombre_ficticio}</p>
          </div>
        )}
        {data.edad !== undefined && (
          <div>
            <span className="text-xs text-[#F5A623]">Edad</span>
            <p className="text-sm text-[#FFFFFF]">{data.edad}</p>
          </div>
        )}
        {data.profesion && (
          <div>
            <span className="text-xs text-[#F5A623]">Profesion</span>
            <p className="text-sm text-[#FFFFFF]">{data.profesion}</p>
          </div>
        )}
        {data.situacion && (
          <div className="col-span-2">
            <span className="text-xs text-[#F5A623]">Situacion</span>
            <p className="text-sm text-[#FFFFFF]">{data.situacion}</p>
          </div>
        )}
      </div>

      {data.dolores && data.dolores.length > 0 && (
        <div>
          <span className="text-xs text-[#EF4444] font-medium">Dolores</span>
          <ul className="mt-1 space-y-1">
            {data.dolores.map((d, i) => (
              <li key={i} className="text-sm text-[#FFFFFF]/80 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#EF4444]/40">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.suenos && data.suenos.length > 0 && (
        <div>
          <span className="text-xs text-[#22C55E] font-medium">Suenos</span>
          <ul className="mt-1 space-y-1">
            {data.suenos.map((s, i) => (
              <li key={i} className="text-sm text-[#FFFFFF]/80 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#22C55E]/40">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.objeciones && data.objeciones.length > 0 && (
        <div>
          <span className="text-xs text-[#F5A623] font-medium">Objeciones</span>
          <ul className="mt-1 space-y-1">
            {data.objeciones.map((o, i) => (
              <li key={i} className="text-sm text-[#FFFFFF]/80 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#F5A623]/40">
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Field item renderer ──────────────────────────────────────────────────────

interface FieldItemProps {
  field: FieldDef;
  perfil: Partial<ProfileV2>;
  setCurrentPage: (page: string) => void;
}

function navigateToTask(setCurrentPage: (page: string) => void, fieldKey: string) {
  localStorage.setItem('tcd_auto_open_adn_field', fieldKey);
  setCurrentPage('roadmap');
}

function FieldItem({ field, perfil, setCurrentPage }: FieldItemProps) {
  const value = getFieldValue(perfil, field.key);
  const completed = isFieldCompleted(perfil, field);

  if (!completed) {
    return (
      <div className="py-4 px-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[#FFFFFF]/40">{field.label}</p>
          <p className="text-xs text-[#FFFFFF]/20 mt-0.5">Pendiente de completar</p>
        </div>
        <button
          onClick={() => navigateToTask(setCurrentPage, field.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F5A623] hover:text-[#FFB94D] bg-[#F5A623]/10 hover:bg-[#F5A623]/15 border border-[rgba(245,166,35,0.2)] rounded-lg transition-all whitespace-nowrap shrink-0"
        >
          Completar
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Completed field
  return (
    <div className="py-4 px-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[#FFFFFF]">{field.label}</p>
        <button
          onClick={() => navigateToTask(setCurrentPage, field.key)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </div>

      <div className="pl-3 border-l-2 border-[rgba(245,166,35,0.15)]">
        {field.type === 'object' && field.key === 'adn_avatar' ? (
          <AvatarCard data={value as AvatarData} />
        ) : field.type === 'array' && Array.isArray(value) ? (
          <ol className="space-y-1.5">
            {(value as string[]).map((item, i) => (
              <li key={i} className="text-sm text-[#FFFFFF]/80 flex gap-2">
                <span className="text-[#F5A623] font-medium shrink-0">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:text-[#FFFFFF]/80 prose-p:leading-relaxed prose-headings:text-[#F5A623] prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-[#FFFFFF] prose-strong:font-bold prose-em:text-[#FFFFFF]/70 prose-li:text-[#FFFFFF]/80 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-hr:border-[rgba(245,166,35,0.15)] prose-a:text-[#F5A623] prose-a:underline">
            <Markdown>{String(value)}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: SectionDef;
  perfil: Partial<ProfileV2>;
  isExpanded: boolean;
  onToggle: () => void;
  setCurrentPage: (page: string) => void;
}

function SectionCard({ section, perfil, isExpanded, onToggle, setCurrentPage }: SectionCardProps) {
  const completed = countCompleted(perfil, section.fields);
  const total = section.fields.length;
  const Icon = section.icon;

  return (
    <div className="card-panel border border-[rgba(245,166,35,0.2)] rounded-2xl overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: '#F5A623' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-[#FFFFFF]/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 text-left">
          <div className="w-9 h-9 rounded-lg bg-[#F5A623]/10 border border-[rgba(245,166,35,0.2)] flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-[#F5A623]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#F5A623] font-bold text-base" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {section.letter}
              </span>
              <span className="text-[10px] text-[#FFFFFF]/30 font-medium tracking-wider uppercase">
                {section.pillars}
              </span>
            </div>
            <p className="text-sm font-medium text-[#FFFFFF] mt-0.5 truncate">
              {section.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[rgba(245,166,35,0.2)] bg-[#F5A623]/10 text-[#F5A623]">
            {completed}/{total} completados
          </span>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-[#FFFFFF]/30" />
            : <ChevronDown className="w-4 h-4 text-[#FFFFFF]/30" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[rgba(245,166,35,0.1)] divide-y divide-[rgba(245,166,35,0.06)]">
          {section.fields.map((field) => (
            <FieldItem
              key={field.key}
              field={field}
              perfil={perfil}
              setCurrentPage={setCurrentPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ManualNegocio({ perfil, userId, setCurrentPage }: ManualNegocioProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([SECTIONS[0].id])
  );
  const [hojaOutputs, setHojaOutputs] = useState<Record<string, string>>({});

  // Load hoja_de_ruta outputs and map them to adn_field keys
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
          // Find the matching meta in roadmapSeed to get its adn_field
          const pilar = SEED_ROADMAP_V3.find(p => p.numero === row.pilar_numero);
          if (!pilar) continue;
          const meta = pilar.metas.find(m => m.codigo === row.meta_codigo);
          if (!meta?.adn_field) continue;
          const texto = row.output_generado?.texto;
          if (typeof texto === 'string' && texto.trim()) {
            // Special case: historia_300 may contain all 3 versions
            if (meta.adn_field === 'historia_300') {
              const m300 = texto.match(/---\s*HISTORIA\s+300\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+150|$)/i);
              const m150 = texto.match(/---\s*HISTORIA\s+150\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+50|$)/i);
              const m50 = texto.match(/---\s*HISTORIA\s+50\s+PALABRAS\s*---\s*([\s\S]*?)$/i);
              if (m300 && m150 && m50) {
                outputs['historia_300'] = m300[1].trim();
                outputs['historia_150'] = m150[1].trim();
                outputs['historia_50'] = m50[1].trim();
              } else {
                outputs['historia_300'] = texto;
              }
            } else {
              outputs[meta.adn_field] = texto;
            }
          }
        }
        setHojaOutputs(outputs);
      });
  }, [userId]);

  // Merge profile data with hoja_de_ruta outputs for a complete view
  const mergedPerfil = useMemo(() => {
    const merged = { ...perfil } as Record<string, unknown>;
    for (const [key, val] of Object.entries(hojaOutputs)) {
      if (!merged[key] || (typeof merged[key] === 'string' && !(merged[key] as string).trim())) {
        merged[key] = val;
      }
    }
    return merged as Partial<ProfileV2>;
  }, [perfil, hojaOutputs]);

  const { totalCompleted, totalFields, progressPct } = useMemo(() => {
    const completed = SECTIONS.reduce((acc, s) => acc + countCompleted(mergedPerfil, s.fields), 0);
    const total = SECTIONS.reduce((acc, s) => acc + s.fields.length, 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalCompleted: completed, totalFields: total, progressPct: pct };
  }, [mergedPerfil]);

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header with overall progress */}
      <div className="card-panel border border-[rgba(245,166,35,0.2)] rounded-2xl p-6">
        <h1
          className="text-2xl font-bold text-[#FFFFFF] tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          ADN del Negocio
        </h1>
        <p className="text-sm text-[#FFFFFF]/40 mt-1">
          Tu estrategia completa documentada con el metodo CLINICA
        </p>

        <div className="mt-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#FFFFFF]/60">
              ADN completado: {progressPct}%
            </span>
            <span className="text-xs text-[#F5A623] font-semibold">
              {totalCompleted}/{totalFields}
            </span>
          </div>
          <div className="h-2 bg-[#FFFFFF]/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                backgroundColor: '#F5A623',
              }}
            />
          </div>
        </div>
      </div>

      {/* Section cards */}
      {SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          perfil={mergedPerfil}
          isExpanded={expanded.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          setCurrentPage={setCurrentPage}
        />
      ))}
    </div>
  );
}
