import React, { useState, useCallback } from 'react';
import { Loader2, Sparkles, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { generateImageWithFallback, generateCarouselImages, base64ToDataUrl } from '../../lib/campanasImageGen';
import { buildImagePrompt } from '../../lib/campanasPrompts';
import type { ImageGenProgress } from '../../lib/campanasImageGen';
import type { CopyGenerado, AnguloCreativo } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  copies: CopyGenerado[];
  angulo: AnguloCreativo;
  perfil: Partial<ProfileV2>;
  geminiKey?: string;
  onImagesGenerated: (images: { base64: string; mimeType: string; modelUsed: string }[]) => void;
}

export default function ImagenGenerator({ copies, angulo, perfil, geminiKey, onImagesGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ImageGenProgress | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  const generate = useCallback(async () => {
    if (!geminiKey) {
      toast.error('API key de Gemini no configurada');
      return;
    }
    if (copies.length === 0) {
      toast.error('Genera el copy primero');
      return;
    }

    setGenerating(true);
    setImages([]);
    setPreviewIdx(0);

    try {
      if (copies.length === 1) {
        // Imagen unica
        const prompt = buildImagePrompt(copies[0], angulo, perfil);
        const result = await generateImageWithFallback(geminiKey, prompt, setProgress);
        const imgs = [{ base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed }];
        setImages(imgs);
        onImagesGenerated(imgs);
        toast.success(`Imagen generada con ${result.modelName}`);
      } else {
        // Carrusel
        const prompts = copies.map((c, i) =>
          buildImagePrompt(c, angulo, perfil, {
            slideNumber: i + 1,
            totalSlides: copies.length,
            slideTexto: c.titulo,
          }),
        );
        const results = await generateCarouselImages(
          geminiKey,
          prompts,
          (slideIdx, prog) => {
            setCurrentSlide(slideIdx);
            setProgress(prog);
          },
        );
        const imgs = results.map((r) => ({
          base64: r.imageBase64,
          mimeType: r.mimeType,
          modelUsed: r.modelUsed,
        }));
        setImages(imgs);
        onImagesGenerated(imgs);
        toast.success(`${results.length} imagenes de carrusel generadas`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [copies, angulo, perfil, geminiKey, onImagesGenerated]);

  const hasNoCopy = copies.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-[#FFFFFF] mb-1">Generacion de Imagenes</h4>
        <p className="text-xs text-[#FFFFFF]/40">
          Genera imagenes con IA usando los modelos Nano Banana (cascada con fallback)
        </p>
      </div>

      {hasNoCopy && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20">
          <AlertTriangle className="w-5 h-5 text-[#F5A623] shrink-0" />
          <p className="text-sm text-[#FFFFFF]/60">Genera el copy primero en la pestana anterior</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating || hasNoCopy}
        className="btn-primary flex items-center gap-2 disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating
          ? copies.length > 1
            ? `Generando slide ${currentSlide + 1} de ${copies.length}...`
            : 'Generando imagen...'
          : images.length > 0
            ? 'Regenerar Imagenes'
            : 'Generar Imagenes con IA'}
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
            </span>
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Regenerar
            </button>
          </div>

          {/* Thumbnail strip for carousel */}
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
                  <img
                    src={base64ToDataUrl(img.base64, img.mimeType)}
                    alt={`Slide ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main preview */}
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
