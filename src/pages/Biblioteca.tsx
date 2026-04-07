import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  Play,
  Youtube,
  X,
  Clock,
  Loader2,
  Sprout, Mail, BookOpen, RefreshCw, DollarSign, Microscope, Target,
  Lightbulb, Ruler, Smartphone, Clapperboard, CalendarDays, Camera,
  Bot, Globe, Phone, Megaphone, Triangle, Cog, Building2, Handshake,
  Palette, BarChart3, Sunrise, UserCircle,
} from 'lucide-react';
import { SEED_ROADMAP_V3 } from '../lib/roadmapSeed';
import type { PilarId } from '../lib/supabase';
import { getHerramienta, HERRAMIENTAS_V3, EMOJI_TO_ICON } from '../lib/herramientas';
import type { HerramientaV3 } from '../lib/herramientas';

const BIB_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sprout, Mail, BookOpen, RefreshCw, DollarSign, Microscope, Target,
  Lightbulb, Ruler, Smartphone, Clapperboard, CalendarDays, Camera,
  Bot, Globe, Phone, Megaphone, Triangle, Cog, Building2, Handshake,
  Palette, BarChart3, Sunrise, UserCircle,
};
import {
  getYoutubeEmbedUrl,
  getYoutubeVideoId,
  type VideoModulo,
} from '../lib/videos';
import HerramientaDetalle from './HerramientaDetalle';

// ─── CLINICA Tab definitions ────────────────────────────────────────────────

type ClinicaTabId = 'C1' | 'L' | 'I1' | 'N' | 'I2' | 'C2' | 'A';

interface ClinicaTab {
  id: ClinicaTabId;
  letter: string;
  label: string;
  pilarIds: PilarId[];
  color: string;
}

const CLINICA_TABS: readonly ClinicaTab[] = [
  {
    id: 'C1',
    letter: 'C',
    label: 'Claridad',
    pilarIds: ['P1', 'P2', 'P3'],
    color: '#F5A623',
  },
  {
    id: 'L',
    letter: 'L',
    label: 'Liberación',
    pilarIds: ['P0'],
    color: '#FFB94D',
  },
  {
    id: 'I1',
    letter: 'Í',
    label: 'Irresistible',
    pilarIds: ['P4', 'P5', 'P6', 'P7', 'P8'],
    color: '#F5A623',
  },
  {
    id: 'N',
    letter: 'N',
    label: 'Notoriedad',
    pilarIds: ['P9A'],
    color: '#FFB94D',
  },
  {
    id: 'I2',
    letter: 'I',
    label: 'Infraestructura',
    pilarIds: ['P9C'],
    color: '#F5A623',
  },
  {
    id: 'C2',
    letter: 'C',
    label: 'Captación',
    pilarIds: ['P9B'],
    color: '#FFB94D',
  },
  {
    id: 'A',
    letter: 'A',
    label: 'Autonomía',
    pilarIds: ['P11', 'P10'],
    color: '#F5A623',
  },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCompletadas(): Set<string> {
  try {
    const saved = localStorage.getItem('tcd_hoja_ruta_v2');
    return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** A tab is unlocked if ANY of its pilares has at least one completed meta or is active */
function isTabUnlocked(tab: ClinicaTab, completadas: Set<string>): boolean {
  // First tab is always unlocked
  if (tab.id === 'C1') return true;

  for (const pilarId of tab.pilarIds) {
    const pilar = SEED_ROADMAP_V3.find((p) => p.id === pilarId);
    if (!pilar) continue;
    for (const meta of pilar.metas) {
      if (completadas.has(meta.codigo)) return true;
    }
  }
  return false;
}

/** Get herramientas V3 for a set of pilarIds */
function getHerramientasForPilars(pilarIds: readonly PilarId[]): HerramientaV3[] {
  const prefixes = pilarIds.map((pid) => `H-${pid}.`);
  return HERRAMIENTAS_V3.filter((h) =>
    prefixes.some((prefix) => h.id.startsWith(prefix))
  );
}

/** Build video-like entries from roadmap metas that have video_youtube_id */
function getVideosFromPilars(pilarIds: readonly PilarId[]): VideoModulo[] {
  const videos: VideoModulo[] = [];
  for (const pilarId of pilarIds) {
    const pilar = SEED_ROADMAP_V3.find((p) => p.id === pilarId);
    if (!pilar) continue;
    for (const meta of pilar.metas) {
      if (meta.tipo === 'VIDEO' && meta.video_youtube_id) {
        videos.push({
          id: meta.codigo,
          grupo: 'A', // placeholder — not used for display
          titulo: meta.titulo,
          descripcion: meta.descripcion,
          youtubeUrl: `https://youtu.be/${meta.video_youtube_id}`,
          duracion: meta.tiempo_estimado,
        });
      }
    }
  }
  return videos;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface BibliotecaProps {
  userId?: string;
}

export default function Biblioteca({ userId }: BibliotecaProps) {
  const [activeTabId, setActiveTabId] = useState<ClinicaTabId>('C1');
  const [herramientaActivaId, setHerramientaActivaId] = useState<string | null>(null);
  const [videoActivo, setVideoActivo] = useState<VideoModulo | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [extraVideos, setExtraVideos] = useState<VideoModulo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const completadas = useMemo(() => getCompletadas(), []);

  const activeTab = CLINICA_TABS.find((t) => t.id === activeTabId) ?? CLINICA_TABS[0];

  // Derive content for active tab
  const herramientas = useMemo(
    () => getHerramientasForPilars(activeTab.pilarIds),
    [activeTab.pilarIds]
  );
  const seedVideos = useMemo(
    () => getVideosFromPilars(activeTab.pilarIds),
    [activeTab.pilarIds]
  );

  // Merge seed videos with Supabase extra videos for the active tab's pilarIds
  const tabVideos = useMemo(() => {
    // Extra videos from Supabase use grupo A-E which doesn't map cleanly.
    // Include them all for now, merged with seed videos.
    return [...seedVideos, ...extraVideos];
  }, [seedVideos, extraVideos]);

  useEffect(() => {
    cargarVideosExtra();
  }, []);

  async function cargarVideosExtra() {
    if (!supabase) return;
    setVideosLoading(true);
    try {
      const { data, error } = await supabase
        .from('programa_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setExtraVideos(
          data.map((v: Record<string, unknown>) => ({
            id: v.id as string,
            grupo: (v.grupo as string) as VideoModulo['grupo'],
            titulo: v.titulo as string,
            descripcion: v.descripcion as string,
            youtubeUrl: v.youtube_url as string,
            duracion: v.duracion as string | undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Error cargando videos de la biblioteca:', err);
    } finally {
      setVideosLoading(false);
    }
  }

  // ─── Tab scroll ───────────────────────────────────────────────────────────

  function updateScrollState() {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = tabsRef.current;
    if (el) el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el?.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  const scrollTabs = (dir: 'left' | 'right') => {
    tabsRef.current?.scrollBy({
      left: dir === 'right' ? 160 : -160,
      behavior: 'smooth',
    });
  };

  // ─── Herramienta detail view ──────────────────────────────────────────────

  if (herramientaActivaId) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300 pb-12">
        <button
          onClick={() => setHerramientaActivaId(null)}
          className="flex items-center gap-2 text-sm text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors uppercase tracking-wider font-bold mb-4 bg-[#F5A623]/5 hover:bg-[#F5A623]/10 px-4 py-2 rounded-xl w-max"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Biblioteca
        </button>
        <HerramientaDetalle
          herramientaId={herramientaActivaId}
          userId={userId}
          geminiKey={geminiKey}
          onVolver={() => setHerramientaActivaId(null)}
        />
      </div>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light tracking-tight text-[#FFFFFF] mb-2">
          Biblioteca
        </h1>
        <p className="text-[#FFFFFF]/60 text-sm">
          Videos y herramientas IA del Método C·L·I·N·I·C·A.
        </p>
      </div>

      {/* CLINICA tabs */}
      <div className="relative flex items-center gap-1">
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="shrink-0 w-8 h-8 rounded-lg bg-[#F5A623]/5 hover:bg-[#F5A623]/10 border border-[rgba(245,166,35,0.2)] flex items-center justify-center text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1"
        >
          {CLINICA_TABS.map((tab) => {
            const isActive = activeTabId === tab.id;
            const unlocked = isTabUnlocked(tab, completadas);
            return (
              <button
                key={tab.id}
                onClick={() => unlocked && setActiveTabId(tab.id)}
                disabled={!unlocked}
                className={`flex flex-col items-center px-5 py-3 rounded-xl transition-all border min-w-[80px] ${
                  !unlocked
                    ? 'bg-[#1C1C1C]/40 border-[rgba(245,166,35,0.05)] text-[#FFFFFF]/20 cursor-not-allowed'
                    : isActive
                    ? 'bg-[#F5A623]/15 border-[#F5A623]/50 text-[#F5A623]'
                    : 'bg-[#1C1C1C]/30 border-[rgba(245,166,35,0.1)] text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:bg-[#1C1C1C]/50'
                }`}
              >
                {!unlocked ? (
                  <Lock className="w-5 h-5 mb-1 text-[#FFFFFF]/15" />
                ) : (
                  <span
                    className="text-xl font-bold leading-none mb-1"
                    style={{ color: isActive ? tab.color : undefined }}
                  >
                    {tab.letter}
                  </span>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="shrink-0 w-8 h-8 rounded-lg bg-[#F5A623]/5 hover:bg-[#F5A623]/10 border border-[rgba(245,166,35,0.2)] flex items-center justify-center text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab description */}
      <div className="bg-[#F5A623]/5 border border-[#F5A623]/20 rounded-2xl px-5 py-4">
        <p className="text-sm text-[#FFFFFF]/80">
          <span
            className="font-bold text-lg mr-2"
            style={{ color: activeTab.color }}
          >
            {activeTab.letter}
          </span>
          <span className="font-semibold text-[#FFFFFF]">
            {activeTab.label}
          </span>
          {' — '}
          {activeTab.pilarIds
            .map((pid) => {
              const p = SEED_ROADMAP_V3.find((s) => s.id === pid);
              return p ? p.titulo : pid;
            })
            .join(', ')}
        </p>
      </div>

      {/* Videos section */}
      {tabVideos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#FFFFFF]/40 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-[#EF4444]" /> Videos
          </h2>
          {videosLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin mb-3" />
              <p className="text-[#FFFFFF]/60 text-sm">Cargando videos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tabVideos.map((v) => {
                const videoId = getYoutubeVideoId(v.youtubeUrl);
                const isPlaceholder =
                  !videoId || v.youtubeUrl.includes('PLACEHOLDER');
                const thumbUrl =
                  videoId && !isPlaceholder
                    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                    : null;
                return (
                  <div
                    key={v.id}
                    className="card-panel rounded-2xl border border-[rgba(245,166,35,0.1)] hover:border-[rgba(245,166,35,0.2)] transition-all overflow-hidden group flex flex-col"
                  >
                    <div
                      className={`relative aspect-video overflow-hidden bg-black/40 ${
                        isPlaceholder ? '' : 'cursor-pointer'
                      }`}
                      onClick={() => !isPlaceholder && setVideoActivo(v)}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={v.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1C1C1C]/30">
                          <Youtube className="w-10 h-10 text-[#F5A623]/30" />
                        </div>
                      )}
                      {!isPlaceholder && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-14 h-14 rounded-full bg-[#F5A623] flex items-center justify-center shadow-2xl">
                            <Play className="w-6 h-6 text-[#FFFFFF] fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                      {v.duracion && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-[#FFFFFF] text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {v.duracion}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/20">
                          {v.id}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#FFFFFF] mb-1">
                        {v.titulo}
                      </h3>
                      <p className="text-xs text-[#FFFFFF]/60 leading-relaxed flex-1">
                        {v.descripcion}
                      </p>
                      {!isPlaceholder && (
                        <button
                          onClick={() => setVideoActivo(v)}
                          className="mt-3 w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-[#F5A623]/80 hover:bg-[#F5A623] text-[#FFFFFF] transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> Ver Video
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Herramientas section */}
      {herramientas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#FFFFFF]/40 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F5A623]" /> Herramientas IA
          </h2>

          {!geminiKey && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
              <Lock className="w-4 h-4 text-[#F5A623] shrink-0" />
              <p className="text-sm text-amber-300">
                Configura la variable{' '}
                <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-mono text-xs">
                  VITE_GEMINI_API_KEY
                </code>{' '}
                para activar las herramientas IA.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {herramientas.map((h) => (
              <div
                key={h.id}
                className="card-panel rounded-2xl p-5 border border-[rgba(245,166,35,0.1)] hover:border-[rgba(245,166,35,0.2)] hover:bg-[#1C1C1C]/50 transition-all group flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  {(() => { const iconName = EMOJI_TO_ICON[h.emoji]; const IC = iconName ? BIB_ICON_MAP[iconName] : null; return IC ? <IC className="w-6 h-6 text-[#F5A623] shrink-0" /> : <Sparkles className="w-6 h-6 text-[#F5A623] shrink-0" />; })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/20">
                        {h.id}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#FFFFFF] leading-snug">
                      {h.titulo}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-[#FFFFFF]/60 leading-relaxed mb-4 flex-1">
                  {h.descripcion}
                </p>

                <button
                  onClick={() => setHerramientaActivaId(h.id)}
                  disabled={!geminiKey}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    geminiKey
                      ? 'bg-[#F5A623] hover:bg-[#FFB94D] text-[#FFFFFF] shadow-lg shadow-[#F5A623]/20'
                      : 'bg-[#F5A623]/5 text-[#FFFFFF]/30 cursor-not-allowed border border-[rgba(245,166,35,0.1)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {geminiKey ? 'Abrir Herramienta' : 'Sin API Key'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when both lists are empty */}
      {herramientas.length === 0 && tabVideos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[#1C1C1C]/30 border border-[rgba(245,166,35,0.1)] border-dashed rounded-2xl">
          <Sparkles className="w-12 h-12 text-[#F5A623]/30 mb-4" />
          <p className="text-[#FFFFFF]/60 text-sm font-medium mb-2">
            Este modulo esta en desarrollo
          </p>
          <p className="text-[#FFFFFF]/30 text-xs max-w-sm leading-relaxed">
            Pronto se habilitaran videos y herramientas para{' '}
            <strong className="text-[#FFFFFF]/60">{activeTab.label}</strong>.
          </p>
        </div>
      )}

      {/* Video lightbox modal */}
      {videoActivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setVideoActivo(null)}
        >
          <div
            className="w-full max-w-4xl mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[#FFFFFF] font-medium text-sm truncate flex-1">
                {videoActivo.titulo}
              </h3>
              <button
                onClick={() => setVideoActivo(null)}
                className="w-8 h-8 rounded-full bg-[#F5A623]/10 hover:bg-[#F5A623]/20 flex items-center justify-center text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors shrink-0 ml-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-[rgba(245,166,35,0.2)]">
              <iframe
                src={getYoutubeEmbedUrl(videoActivo.youtubeUrl)}
                title={videoActivo.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
