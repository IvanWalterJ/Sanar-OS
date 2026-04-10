/**
 * CreativosView.tsx — Placeholder beta para generacion de imagenes con IA
 */
import { ImageIcon } from 'lucide-react';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function CreativosView({}: Props) {
  return (
    <div className="animate-in fade-in duration-500 max-w-3xl">
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Modulo — Beta
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          Creativos{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            con IA
          </span>
        </h2>
        <p className="text-xs text-[#FFFFFF]/40 mt-1">
          Imagenes generadas con Gemini Image Engine, listas para Instagram Ads.
        </p>
      </div>

      {/* Hero placeholder */}
      <div className="card-panel p-10 text-center mb-4">
        <ImageIcon className="w-12 h-12 text-[#FFFFFF]/15 mx-auto mb-4" />
        <div className="text-sm font-semibold text-[#FFFFFF]/80 mb-2">Gemini Image Engine</div>
        <p className="text-xs text-[#FFFFFF]/40 max-w-md mx-auto mb-4 leading-relaxed">
          Toma los copies del modulo anterior y genera imagenes con texto integrado de alta calidad.
          Formatos: 1:1, 4:5 y 9:16.
        </p>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/25">
          Se conecta en version produccion
        </span>
      </div>

      {/* Formatos disponibles */}
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {[
          { title: 'Post (1:1)', desc: 'Feed de Instagram - 1080x1080' },
          { title: 'Historia (9:16)', desc: 'Stories e Instagram Reels' },
          { title: 'Carrusel (4:5)', desc: 'Hasta 10 slides' },
          { title: 'Con foto real', desc: 'Upload foto del profesional' },
        ].map((f) => (
          <div key={f.title} className="card-panel p-4">
            <div className="text-sm font-semibold text-[#FFFFFF] mb-1">{f.title}</div>
            <div className="text-xs text-[#FFFFFF]/30">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
