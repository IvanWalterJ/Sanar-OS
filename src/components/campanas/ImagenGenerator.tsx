import React, { useState, useCallback } from 'react';
import {
  Loader2, Sparkles, RotateCcw, AlertTriangle, Image, Pencil,
  Camera, Zap, Heart, Eye, Award, BookOpen, ArrowLeftRight, Bell,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateImageWithFallback, generateCarouselImages, base64ToDataUrl } from '../../lib/campanasImageGen';
import { buildImagePrompt } from '../../lib/campanasPrompts';
import type { ImageGenProgress } from '../../lib/campanasImageGen';
import type { CopyGenerado, AnguloCreativo, EstiloVisual, ImageMode } from '../../lib/campanasTypes';
import { ESTILO_VISUAL_OPTIONS } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

const ESTILO_ICONS: Record<EstiloVisual, React.ComponentType<{ className?: string }>> = {
  fotografico_profesional: Camera,
  grafico_bold: Zap,
  minimalista: Eye,
  lifestyle: Heart,
  testimonio: Award,
  educativo: BookOpen,
  antes_despues: ArrowLeftRight,
  urgencia: Bell,
};

interface Props {
  copies: CopyGenerado[];
  angulo: AnguloCreativo;
  perfil: Partial<ProfileV2>;
  geminiKey?: string;
  onImagesGenerated: (images: { base64: string; mimeType: string; modelUsed: string }[], mode: ImageMode) => void;
}

export default function ImagenGenerator({ copies, angulo, perfil, geminiKey, onImagesGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ImageGenProgress | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // New controls
  const [mode, setMode] = useState<ImageMode>('completa');
  const [estilo, setEstilo] = useState<EstiloVisual>('grafico_bold');
  const [instrucciones, setInstrucciones] = useState('');
  const [showInstrucciones, setShowInstrucciones] = useState(false);

  const generate = useCallback(async () => {
    if (!geminiKey) { toast.error('API key de Gemini no configurada'); return; }
    if (copies.length === 0) { toast.error('Genera el copy primero'); return; }

    setGenerating(true);
    setImages([]);
    setPreviewIdx(0);

    const opts = { estilo, mode, instrucciones: instrucciones.trim() || undefined };

    try {
      if (copies.length === 1) {
        const prompt = buildImagePrompt(copies[0], angulo, perfil, undefined, opts);
        const result = await generateImageWithFallback(geminiKey, prompt, setProgress);
        const imgs = [{ base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed }];
        setImages(imgs);
        onImagesGenerated(imgs, mode);
        toast.success(`Imagen generada con ${result.modelName}`);
      } else {
        const prompts = copies.map((c, i) =>
          buildImagePrompt(c, angulo, perfil, {
            slideNumber: i + 1,
            totalSlides: copies.length,
            slideTexto: c.titulo,
          }, opts),
        );
        const results = await generateCarouselImages(geminiKey, prompts, (slideIdx, prog) => {
          setCurrentSlide(slideIdx);
          setProgress(prog);
        });
        const imgs = results.map((r) => ({ base64: r.imageBase64, mimeType: r.mimeType, modelUsed: r.modelUsed }));
        setImages(imgs);
        onImagesGenerated(imgs, mode);
        toast.success(`${results.length} imagenes de carrusel generadas`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [copies, angulo, perfil, geminiKey, onImagesGenerated, estilo, mode, instrucciones]);

  const hasNoCopy = copies.length === 0;

  return (
    <div className="space-y-5">
      {hasNoCopy && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20">
          <AlertTriangle className="w-5 h-5 text-[#F5A623] shrink-0" />
          <p className="text-sm text-[#FFFFFF]/60">Genera el copy primero</p>
        </div>
      )}

      {/* Mode selector */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Modo de generacion
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('completa')}
            className={`card-panel p-3 text-left transition-all ${
              mode === 'completa' ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`w-4 h-4 ${mode === 'completa' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
              <span className={`text-xs font-semibold ${mode === 'completa' ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>
                IA Completa
              </span>
            </div>
            <p className="text-[10px] text-[#FFFFFF]/30">Imagen con texto integrado, lista para publicar</p>
          </button>
          <button
            onClick={() => setMode('fondo')}
            className={`card-panel p-3 text-left transition-all ${
              mode === 'fondo' ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Pencil className={`w-4 h-4 ${mode === 'fondo' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
              <span className={`text-xs font-semibold ${mode === 'fondo' ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>
                Fondo + Editor
              </span>
            </div>
            <p className="text-[10px] text-[#FFFFFF]/30">Imagen de fondo sin texto, editas el copy encima</p>
          </button>
        </div>
      </div>

      {/* Style gallery */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Estilo visual
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(ESTILO_VISUAL_OPTIONS) as [EstiloVisual, typeof ESTILO_VISUAL_OPTIONS[EstiloVisual]][]).map(([key, opt]) => {
            const Icon = ESTILO_ICONS[key];
            const isActive = estilo === key;
            return (
              <button
                key={key}
                onClick={() => setEstilo(key)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-[#F5A623]/50 bg-[#F5A623]/10'
                    : 'border-[#FFFFFF]/5 hover:border-[#F5A623]/25 hover:bg-[#FFFFFF]/[0.02]'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'}`} />
                <div className={`text-[10px] font-semibold ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/70'}`}>
                  {opt.titulo}
                </div>
                <div className="text-[9px] text-[#FFFFFF]/25 leading-tight mt-0.5">{opt.descripcion}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom instructions */}
      <div>
        <button
          onClick={() => setShowInstrucciones(!showInstrucciones)}
          className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 hover:text-[#FFFFFF]/60 transition-colors"
        >
          {showInstrucciones ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Instrucciones adicionales (opcional)
        </button>
        {showInstrucciones && (
          <textarea
            className="w-full mt-2 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20 resize-none"
            rows={3}
            placeholder="Ej: Mujer profesional de 35 años en consultorio moderno con plantas, luz natural lateral, sonrisa genuina..."
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
          />
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating || hasNoCopy}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating
          ? copies.length > 1
            ? `Generando slide ${currentSlide + 1} de ${copies.length}...`
            : 'Generando imagen...'
          : images.length > 0
            ? 'Regenerar'
            : mode === 'fondo' ? 'Generar fondo' : 'Generar imagen'}
      </button>

      {/* Progress indicator */}
      {generating && progress && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[rgba(245,166,35,0.15)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#FFFFFF]/60">
              Modelo: <span className="text-[#F5A623]">{progress.modelName}</span>
            </span>
            <span className="text-xs text-[#FFFFFF]/40">
              Intento {progress.attempt}/{progress.total}
            </span>
          </div>
          <div className="h-1.5 bg-[#FFFFFF]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F5A623] rounded-full transition-all duration-500"
              style={{ width: `${(progress.attempt / progress.total) * 100}%` }}
            />
          </div>
          {progress.status === 'failed' && (
            <p className="text-xs text-[#EF4444]/60 mt-1">Fallo, intentando siguiente modelo...</p>
          )}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#FFFFFF]/40">
              {images.length === 1 ? 'Imagen generada' : `${images.length} imagenes generadas`}
              {mode === 'fondo' && ' (solo fondo)'}
            </span>
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Regenerar
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewIdx(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    previewIdx === idx ? 'border-[#F5A623]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={base64ToDataUrl(img.base64, img.mimeType)} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)]">
            <img
              src={base64ToDataUrl(images[previewIdx].base64, images[previewIdx].mimeType)}
              alt="Preview"
              className="w-full aspect-square object-cover"
            />
            {images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-[#FFFFFF]">
                {previewIdx + 1} / {images.length}
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#FFFFFF]/30 text-center">
            Modelo: {images[previewIdx].modelUsed}
          </p>
        </div>
      )}
    </div>
  );
}
