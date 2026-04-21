/**
 * CampanasHome.tsx — Dashboard home con modulos de acceso directo y campanas recientes
 */
import {
  PenTool, BarChart3, Wrench, FolderOpen, Trophy,
  Sparkles, ArrowRight, Calendar,
  Building2, Megaphone, Repeat,
} from 'lucide-react';
import type { CampanasView, Campana, Creativo } from '../../lib/campanasTypes';
import { OBJETIVO_LABELS, ESTADO_COLORS } from '../../lib/campanasTypes';

// ─── Mapa v7 · 3 sub-pilares de Fase 4 ──────────────────────────────────────
const SUB_PILARES_V7: Array<{
  id: 'P9A' | 'P9B' | 'P9C';
  titulo: string;
  dias: string;
  subtitulo: string;
  icon: React.ComponentType<{ className?: string }>;
  modulos: Array<{ id: CampanasView; label: string }>;
}> = [
  {
    id: 'P9A',
    titulo: 'Infraestructura',
    dias: 'Días 45-55',
    subtitulo: 'El embudo mínimo viable · landing · 6 creativos N1/N2/N3 · Meta Ads · Skool.',
    icon: Building2,
    modulos: [
      { id: 'copies', label: 'Generar copies' },
      { id: 'montaje', label: 'Montaje paso a paso' },
      { id: 'diagnostico', label: 'Diagnosticar campaña' },
    ],
  },
  {
    id: 'P9B',
    titulo: 'Captación',
    dias: 'Días 55-70',
    subtitulo: 'Campañas activas · la W · triage WhatsApp · masterclass · primera llamada real.',
    icon: Megaphone,
    modulos: [
      { id: 'nueva', label: 'Crear campaña' },
      { id: 'historial', label: 'Historial' },
    ],
  },
  {
    id: 'P9C',
    titulo: 'Seguimiento',
    dias: 'Días 70-75',
    subtitulo: 'Emails nurture · plan de contenido · retargeting tras la primera venta.',
    icon: Repeat,
    modulos: [
      { id: 'ganadores', label: 'Ganadores' },
    ],
  },
];

interface ModuleCard {
  id: CampanasView;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  featured?: boolean;
}

const MODULES: ModuleCard[] = [
  {
    id: 'copies',
    icon: PenTool,
    title: 'Generar copies',
    description: 'Copies para texto principal, titular y descripcion. Por rubro y objetivo.',
    badge: 'Activo',
  },
  {
    id: 'diagnostico',
    icon: BarChart3,
    title: 'Diagnosticar campaña',
    description: 'Cargas las metricas y la IA diagnostica que falla y como arreglarlo.',
    featured: true,
    badge: 'Activo',
  },
  {
    id: 'montaje',
    icon: Wrench,
    title: 'Montaje paso a paso',
    description: 'KAI te guia para configurar en Meta Ads Manager sin errores.',
    badge: 'Activo',
  },
  {
    id: 'historial',
    icon: FolderOpen,
    title: 'Historial',
    description: 'Campañas guardadas con toda la info generada.',
    badge: 'Activo',
  },
  {
    id: 'ganadores',
    icon: Trophy,
    title: 'Ganadores',
    description: 'Creativos con mejor performance de todos tus clientes.',
    badge: 'Activo',
  },
];

interface Props {
  campanas: Campana[];
  creativos: Creativo[];
  perfil?: { nombre?: string };
  onNavigate: (view: CampanasView) => void;
  onSelectCampana: (campana: Campana) => void;
}

export default function CampanasHome({ campanas, creativos, perfil, onNavigate, onSelectCampana }: Props) {
  const nombre = perfil?.nombre?.split(' ')[0] ?? 'Profesional';
  const recientes = campanas.slice(0, 3);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Hero */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-2">
          Meta Ads Studio - Profesionales de salud
        </p>
        <h1 className="text-2xl md:text-3xl font-light text-[#FFFFFF] mb-2">
          Hola, {nombre}
          <br />
          <span className="text-[#F5A623]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            Que hacemos hoy?
          </span>
        </h1>
        <p className="text-sm text-[#FFFFFF]/50 max-w-lg">
          Podes arrancar el flujo completo desde cero, o ir directo al modulo que necesitas.
        </p>
      </div>

      {/* Mapa v7 · Fase 4 dividida en P9A / P9B / P9C */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#F5A623]">
            Fase 4 · método C · mapa v7
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SUB_PILARES_V7.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.id}
                className="card-panel p-4 border-[rgba(245,166,35,0.15)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#F5A623]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-[#F5A623] font-semibold">{sub.id}</span>
                      <span className="text-sm font-semibold text-[#FFFFFF] truncate">{sub.titulo}</span>
                    </div>
                    <span className="text-[10px] text-[#FFFFFF]/40 uppercase tracking-widest">
                      {sub.dias}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#FFFFFF]/55 leading-relaxed mb-3">
                  {sub.subtitulo}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sub.modulos.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onNavigate(mod.id)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#F5A623]/10 hover:bg-[#F5A623]/20 border border-[#F5A623]/20 text-[#F5A623] transition-colors"
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA — Flujo completo */}
      <button
        onClick={() => onNavigate('nueva')}
        className="w-full card-panel p-5 flex items-center gap-4 hover:border-[#F5A623]/50 transition-all group text-left"
      >
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20 mb-2">
            <Sparkles className="w-3 h-3" /> Recomendado
          </div>
          <div className="text-sm font-semibold text-[#FFFFFF] mb-1">
            Crear campaña completa — flujo paso a paso
          </div>
          <div className="text-xs text-[#FFFFFF]/40" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            Estrategia - Audiencias - Copies - Creativos - Montaje. Todo en un flujo guiado con KAI.
          </div>
        </div>
        <div className="btn-primary flex items-center gap-2 shrink-0">
          Empezar <ArrowRight className="w-4 h-4" />
        </div>
      </button>

      {/* Modulos grid */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
            Acceso directo por modulo
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`card-panel p-4 text-left transition-all hover:border-[#F5A623]/40 hover:-translate-y-0.5 hover:shadow-lg group ${
                  mod.featured ? 'border-[#F5A623]/30 bg-gradient-to-br from-[#F5A623]/5 to-transparent' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    mod.featured ? 'bg-[#F5A623]/15' : 'bg-[#FFFFFF]/5'
                  }`}>
                    <Icon className="w-5 h-5 text-[#F5A623]/80" />
                  </div>
                  {mod.badge && (
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        color: mod.badgeColor ?? '#F5A623',
                        backgroundColor: `${mod.badgeColor ?? '#F5A623'}15`,
                        borderColor: `${mod.badgeColor ?? '#F5A623'}30`,
                      }}
                    >
                      {mod.badge}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[#FFFFFF] mb-1">{mod.title}</div>
                <div className="text-xs text-[#FFFFFF]/40 leading-relaxed">{mod.description}</div>
                <div className="mt-3 text-xs text-[#F5A623] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir modulo <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campanas recientes */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
            Campañas recientes
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        {recientes.length === 0 ? (
          <div className="card-panel p-8 text-center">
            <FolderOpen className="w-8 h-8 text-[#FFFFFF]/20 mx-auto mb-3" />
            <p className="text-sm text-[#FFFFFF]/40">
              Todavia no hay campañas.
              <br />
              Arranca el flujo completo o crea una desde un modulo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recientes.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCampana(c)}
                className="card-panel p-4 text-left hover:border-[#F5A623]/40 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5A623]/30 to-transparent" />
                <div className="text-sm font-semibold text-[#FFFFFF] mb-1 truncate">{c.nombre}</div>
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2"
                  style={{
                    color: ESTADO_COLORS[c.estado],
                    backgroundColor: `${ESTADO_COLORS[c.estado]}15`,
                    borderColor: `${ESTADO_COLORS[c.estado]}30`,
                  }}
                >
                  {c.estado}
                </span>
                <div className="flex items-center gap-3 text-[10px] text-[#FFFFFF]/30">
                  <span>{OBJETIVO_LABELS[c.objetivo].titulo}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
