import React, { useState } from 'react';
import { Play, CheckCircle2, ExternalLink } from 'lucide-react';
import type { RoadmapMeta } from '../../lib/roadmapSeed';

interface TaskVideoProps {
  meta: RoadmapMeta;
  onComplete: () => void;
  isCompleted: boolean;
}

function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export default function TaskVideo({ meta, onComplete, isCompleted }: TaskVideoProps) {
  const [watched, setWatched] = useState(isCompleted);

  const handleMarkWatched = () => {
    setWatched(true);
    onComplete();
  };

  const videoId = meta.video_youtube_id || 'dQw4w9WgXcQ'; // placeholder until Javo provides IDs

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Video Title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/25 tracking-wider">
            VIDEO
          </span>
          {watched && (
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/25 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Visto
            </span>
          )}
        </div>
        <h3 className="text-lg font-medium text-[#FFFFFF]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {meta.titulo}
        </h3>
        <p className="text-sm text-[#FFFFFF]/60 mt-1">{meta.descripcion}</p>
      </div>

      {/* YouTube Embed */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[rgba(245,166,35,0.2)] bg-black">
        {meta.video_youtube_id ? (
          <iframe
            src={getYoutubeEmbedUrl(videoId)}
            title={meta.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414]">
            <Play className="w-12 h-12 text-[#F5A623]/50 mb-3" />
            <p className="text-sm text-[#FFFFFF]/40">Video pendiente de configuración</p>
            <p className="text-xs text-[#FFFFFF]/25 mt-1">El ID de YouTube se cargará próximamente</p>
          </div>
        )}
      </div>

      {/* Mark as watched */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#FFFFFF]/40">
          {meta.tiempo_estimado || '10–15 min'}
        </p>

        {watched ? (
          <div className="flex items-center gap-2 text-[#22C55E] text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Video completado
          </div>
        ) : (
          <button
            onClick={handleMarkWatched}
            className="btn-primary flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar como visto
          </button>
        )}
      </div>
    </div>
  );
}
