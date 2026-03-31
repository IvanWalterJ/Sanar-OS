import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Lock, ChevronLeft, ChevronRight, Play, Youtube, X, Clock } from 'lucide-react';
import { HERRAMIENTAS_POR_GRUPO, GRUPOS_INFO } from '../lib/herramientas';
import { VIDEOS, getYoutubeEmbedUrl, getYoutubeVideoId, type VideoModulo } from '../lib/videos';
import HerramientaDetalle from './HerramientaDetalle';

function loadAdminVideos(): VideoModulo[] {
  try {
    const raw: Array<{ id: string; grupo: string; titulo: string; descripcion: string; youtubeUrl: string; duracion?: string }> =
      JSON.parse(localStorage.getItem('tcd_admin_videos') || '[]');
    return raw.map(v => ({
      id: v.id,
      grupo: v.grupo as VideoModulo['grupo'],
      titulo: v.titulo,
      descripcion: v.descripcion,
      youtubeUrl: v.youtubeUrl,
      duracion: v.duracion,
    }));
  } catch { return []; }
}

type GrupoId = 'A' | 'B' | 'C' | 'D' | 'E';
type Modo = 'herramientas' | 'videos';

interface BibliotecaProps {
  userId?: string;
}

export default function Biblioteca({ userId }: BibliotecaProps) {
  const [grupoActivo, setGrupoActivo] = useState<GrupoId>('A');
  const [herramientaActivaId, setHerramientaActivaId] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>('herramientas');
  const [videoActivo, setVideoActivo] = useState<VideoModulo | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const allVideos = [...VIDEOS, ...loadAdminVideos()];

  // Check scroll state for the tabs row
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
    tabsRef.current?.scrollBy({ left: dir === 'right' ? 160 : -160, behavior: 'smooth' });
  };

  if (herramientaActivaId) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300 pb-12">
        <button
          onClick={() => setHerramientaActivaId(null)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold mb-4 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl w-max"
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

  const grupoInfo = GRUPOS_INFO[grupoActivo];
  const herramientas = HERRAMIENTAS_POR_GRUPO[grupoActivo] ?? [];
  const videosDelGrupo = allVideos.filter(v => v.grupo === grupoActivo);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Biblioteca</h1>
          <p className="text-gray-400 text-sm">Herramientas IA y módulos de video del Método CLÍNICA v2.0.</p>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl shrink-0">
          <button
            onClick={() => setModo('herramientas')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              modo === 'herramientas' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Herramientas IA
          </button>
          <button
            onClick={() => setModo('videos')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              modo === 'videos' ? 'bg-red-500/20 text-red-300' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" /> Videos
          </button>
        </div>
      </div>

      {/* Grupos A–E tabs with scroll arrows */}
      <div className="relative flex items-center gap-1">
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1"
        >
          {(Object.keys(GRUPOS_INFO) as GrupoId[]).map(gId => {
            const g = GRUPOS_INFO[gId];
            const isActive = grupoActivo === gId;
            const count = modo === 'herramientas'
              ? (HERRAMIENTAS_POR_GRUPO[gId] ?? []).length
              : allVideos.filter(v => v.grupo === gId).length;
            return (
              <button
                key={gId}
                onClick={() => setGrupoActivo(gId)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? `bg-${g.color}-500/15 border-${g.color}-500/40 text-${g.color}-300`
                    : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.titulo}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? `bg-${g.color}-500/20` : 'bg-white/5'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Descripción del grupo */}
      <div className={`bg-${grupoInfo.color}-500/5 border border-${grupoInfo.color}-500/20 rounded-2xl px-5 py-4`}>
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">{grupoInfo.emoji} {grupoInfo.titulo}:</span>{' '}
          {grupoInfo.descripcion}
        </p>
      </div>

      {/* ── HERRAMIENTAS MODE ── */}
      {modo === 'herramientas' && (
        <>
          {!geminiKey && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">Configurá la variable <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-mono text-xs">VITE_GEMINI_API_KEY</code> para activar las herramientas IA.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {herramientas.map(h => (
              <div
                key={h.id}
                className="glass-panel rounded-2xl p-5 border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03] transition-all group flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl shrink-0">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-${grupoInfo.color}-500/15 text-${grupoInfo.color}-400 border border-${grupoInfo.color}-500/20`}>
                        {h.id}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-snug">{h.titulo}</h3>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{h.descripcion}</p>

                <button
                  onClick={() => setHerramientaActivaId(h.id)}
                  disabled={!geminiKey}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    geminiKey
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {geminiKey ? 'Abrir Herramienta' : 'Sin API Key'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── VIDEOS MODE ── */}
      {modo === 'videos' && (
        <>
          {videosDelGrupo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.02] border border-white/[0.05] border-dashed rounded-2xl">
              <Youtube className="w-12 h-12 text-red-500/30 mb-4" />
              <p className="text-gray-400 text-sm font-medium mb-2">No hay videos en este grupo todavía</p>
              <p className="text-gray-600 text-xs max-w-sm leading-relaxed">
                El coach puede agregar videos desde el panel de administración en la sección <strong className="text-gray-400">Videos</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {videosDelGrupo.map(v => {
                const videoId = getYoutubeVideoId(v.youtubeUrl);
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
                return (
                  <div
                    key={v.id}
                    className="glass-panel rounded-2xl border border-white/[0.06] hover:border-white/10 transition-all overflow-hidden group flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative cursor-pointer aspect-video overflow-hidden bg-black/40"
                      onClick={() => setVideoActivo(v)}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={v.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                          <Youtube className="w-10 h-10 text-red-500/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
                          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      {v.duracion && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{v.duracion}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-${grupoInfo.color}-500/15 text-${grupoInfo.color}-400 border border-${grupoInfo.color}-500/20`}>
                          {v.grupo} · {v.id}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{v.titulo}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed flex-1">{v.descripcion}</p>
                      <button
                        onClick={() => setVideoActivo(v)}
                        className="mt-3 w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-red-600/80 hover:bg-red-600 text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Ver Video
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Video lightbox modal */}
      {videoActivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setVideoActivo(null)}
        >
          <div
            className="w-full max-w-4xl mx-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-white font-medium text-sm truncate flex-1">{videoActivo.titulo}</h3>
              <button
                onClick={() => setVideoActivo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0 ml-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
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
