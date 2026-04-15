import React, { useState, useCallback, useEffect } from 'react';
import {
  Loader2, Sparkles, RotateCcw,
  Pencil, Camera, Zap, Heart, Eye, Award, BookOpen,
  ArrowLeftRight, Bell, ChevronDown, ChevronUp,
  Upload, X, User, Palette as PaletteIcon, Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateImageWithFallback, generateCarouselImages, base64ToDataUrl } from '../../lib/campanasImageGen';
import type { ReferenceImages } from '../../lib/campanasImageGen';
import { buildImagePrompt } from '../../lib/campanasPrompts';
import type { ImageGenProgress } from '../../lib/campanasImageGen';
import type {
  CopyGenerado, AnguloCreativo, EstiloVisual, ImageMode, ImageFormat,
  ReferenceImage, TextSource, CustomText, SlideConfig, ImageGenerationMode,
} from '../../lib/campanasTypes';
import { ESTILO_VISUAL_OPTIONS, IMAGE_FORMAT_OPTIONS } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

const MAX_REFS = 5;

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

function fileToBase64(file: File): Promise<ReferenceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type, fileName: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function modeToImageMode(m: ImageGenerationMode): ImageMode {
  return m === 'solo_fondo' ? 'fondo' : 'completa';
}

function modeToTextSource(m: ImageGenerationMode): TextSource {
  return m === 'texto_personalizado' ? 'personalizado' : 'ia';
}

interface Props {
  copies?: CopyGenerado[];
  angulo?: AnguloCreativo;
  perfil: Partial<ProfileV2>;
  geminiKey?: string;
  initialFormat?: ImageFormat;
  initialSlideCount?: number;
  lockFormat?: boolean;
  onImagesGenerated: (images: { base64: string; mimeType: string; modelUsed: string }[], mode: ImageMode) => void;
}

export default function ImagenGenerator({ copies, angulo, perfil, geminiKey, initialFormat, initialSlideCount, lockFormat, onImagesGenerated }: Props) {
  const copyList = copies ?? [];
  const effectiveAngulo: AnguloCreativo = angulo ?? 'directo';

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ImageGenProgress | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Free-text prompt (the main input now)
  const [userPrompt, setUserPrompt] = useState('');

  // Controls
  const [format, setFormat] = useState<ImageFormat>(initialFormat ?? '1:1');
  const [genMode, setGenMode] = useState<ImageGenerationMode>('ia_completa');
  const [estilo, setEstilo] = useState<EstiloVisual>('grafico_bold');
  const [instrucciones, setInstrucciones] = useState('');
  const [showInstrucciones, setShowInstrucciones] = useState(false);

  // Reference images (multi, up to 5 each)
  const [characterRefs, setCharacterRefs] = useState<ReferenceImage[]>([]);
  const [styleRefs, setStyleRefs] = useState<ReferenceImage[]>([]);

  // Text mode (single image)
  const [customText, setCustomText] = useState<CustomText>({ h1: '', h2: '', cta: '' });

  // Carousel: cantidad de slides (1 = imagen unica, 2-10 = carrusel)
  const [slideCount, setSlideCount] = useState(initialSlideCount ?? 1);

  // Carousel slide control (config por slide)
  const [slideConfigs, setSlideConfigs] = useState<SlideConfig[]>([]);
  const [activeConfigSlide, setActiveConfigSlide] = useState(0);

  const totalSlides = copyList.length > 1 ? copyList.length : slideCount;

  useEffect(() => {
    if (totalSlides > 1) {
      setSlideConfigs(prev => {
        const next: SlideConfig[] = [];
        for (let i = 0; i < totalSlides; i++) {
          next.push(prev[i] ?? { textSource: 'ia' as TextSource });
        }
        return next;
      });
      setActiveConfigSlide(a => Math.min(a, totalSlides - 1));
    } else {
      setSlideConfigs([]);
      setActiveConfigSlide(0);
    }
  }, [totalSlides]);

  const handleRefUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    current: ReferenceImage[],
    setter: (refs: ReferenceImage[]) => void,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_REFS - current.length;
    if (remaining <= 0) {
      toast.error(`Maximo ${MAX_REFS} imagenes`);
      e.target.value = '';
      return;
    }

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`Solo se agregaron ${remaining} de ${files.length} (maximo ${MAX_REFS})`);
    }

    const newRefs: ReferenceImage[] = [];
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name}: solo imagenes`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: maximo 10MB`); continue; }
      newRefs.push(await fileToBase64(file));
    }
    if (newRefs.length > 0) setter([...current, ...newRefs]);
    e.target.value = '';
  }, []);

  const removeRef = useCallback((refs: ReferenceImage[], setter: (r: ReferenceImage[]) => void, idx: number) => {
    setter(refs.filter((_, i) => i !== idx));
  }, []);

  const updateSlideConfig = useCallback((idx: number, patch: Partial<SlideConfig>) => {
    setSlideConfigs(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...patch };
      return updated;
    });
  }, []);

  const updateSlideCustomText = useCallback((idx: number, field: keyof CustomText, value: string) => {
    setSlideConfigs(prev => {
      const updated = [...prev];
      const current = updated[idx];
      updated[idx] = {
        ...current,
        customText: { ...({ h1: '', h2: '', cta: '', ...current.customText }), [field]: value },
      };
      return updated;
    });
  }, []);

  const mode: ImageMode = modeToImageMode(genMode);
  const textSource: TextSource = modeToTextSource(genMode);
  const isCarousel = totalSlides > 1;
  const styleGridDisabled = styleRefs.length > 0;

  const generate = useCallback(async () => {
    if (!geminiKey) { toast.error('API key de Gemini no configurada'); return; }

    // New: no hard dependency on copies. Require EITHER userPrompt OR custom text OR copies.
    const hasAnyInput = userPrompt.trim().length > 0 || copyList.length > 0 ||
      (genMode === 'texto_personalizado' && (customText.h1.trim() || customText.h2.trim() || customText.cta.trim()));
    if (!hasAnyInput) {
      toast.error('Describi que queres en la imagen (o completa el texto personalizado)');
      return;
    }

    // Validate custom text for single image
    if (!isCarousel && genMode === 'texto_personalizado') {
      if (!customText.h1.trim() || !customText.h2.trim() || !customText.cta.trim()) {
        toast.error('Completa al menos Titulo, Subtitulo y CTA'); return;
      }
    }
    if (isCarousel) {
      const invalid = slideConfigs.findIndex(
        cfg => cfg.textSource === 'personalizado' && (!cfg.customText?.h1?.trim() || !cfg.customText?.h2?.trim() || !cfg.customText?.cta?.trim())
      );
      if (invalid >= 0) { toast.error(`Completa Titulo, Subtitulo y CTA en slide ${invalid + 1}`); return; }
    }

    setGenerating(true);
    setImages([]);
    setPreviewIdx(0);

    const refs: ReferenceImages | undefined = (characterRefs.length > 0 || styleRefs.length > 0)
      ? {
          characterRefs: characterRefs.map(r => ({ base64: r.base64, mimeType: r.mimeType })),
          styleRefs: styleRefs.map(r => ({ base64: r.base64, mimeType: r.mimeType })),
        }
      : undefined;

    const baseOpts = {
      estilo: styleRefs.length > 0 ? undefined : estilo,
      mode,
      instrucciones: instrucciones.trim() || undefined,
      userPrompt: userPrompt.trim() || undefined,
      characterRefCount: characterRefs.length,
      styleRefCount: styleRefs.length,
      format,
    };

    try {
      if (!isCarousel) {
        const effectiveCustomText = genMode === 'texto_personalizado' ? customText : undefined;
        const copyForPrompt = copyList[0] ?? null;
        const prompt = buildImagePrompt(copyForPrompt, effectiveAngulo, perfil, undefined, {
          ...baseOpts,
          customText: effectiveCustomText,
        });
        const result = await generateImageWithFallback(geminiKey, prompt, setProgress, refs);
        const imgs = [{ base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed }];
        setImages(imgs);
        onImagesGenerated(imgs, mode);
        toast.success(`Imagen generada con ${result.modelName}`);
      } else {
        const prompts = Array.from({ length: totalSlides }).map((_, i) => {
          const copyForSlide = copyList[i] ?? null;
          const cfg = slideConfigs[i] ?? { textSource: 'ia' };
          const slideCustomText = cfg.textSource === 'personalizado' ? cfg.customText : undefined;
          const slideTexto = slideCustomText
            ? slideCustomText.h1
            : copyForSlide?.titulo ?? userPrompt.trim() ?? '';
          return buildImagePrompt(copyForSlide, effectiveAngulo, perfil, {
            slideNumber: i + 1,
            totalSlides,
            slideTexto,
          }, {
            ...baseOpts,
            customText: slideCustomText,
          });
        });
        const results = await generateCarouselImages(geminiKey, prompts, (slideIdx, prog) => {
          setCurrentSlide(slideIdx);
          setProgress(prog);
        }, refs);
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
  }, [copyList, effectiveAngulo, perfil, geminiKey, onImagesGenerated, estilo, mode, genMode, instrucciones, characterRefs, styleRefs, customText, slideConfigs, format, userPrompt, textSource, isCarousel, totalSlides]);

  return (
    <div className="space-y-3">
      {/* ─── Prompt libre (input principal) ─── */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          ¿Que queres en la imagen?
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          rows={3}
          placeholder="Ej: Una mujer de 35 años leyendo un libro en un sillon, luz calida de mañana, ambiente minimalista"
          className="w-full bg-black/20 border border-[rgba(245,166,35,0.25)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/60 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20 resize-none"
        />
      </div>

      {/* ─── Reference Images (multi, up to 5 each) ─── */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Imagenes de referencia (opcional — hasta {MAX_REFS} por tipo)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Character refs */}
          <div className="card-panel p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FFFFFF]/40" />
                <span className="text-[10px] font-semibold text-[#FFFFFF]/70">Personaje</span>
              </div>
              <span className="text-[9px] text-[#FFFFFF]/30">{characterRefs.length}/{MAX_REFS}</span>
            </div>
            {characterRefs.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {characterRefs.map((ref, idx) => (
                  <div key={idx} className="relative">
                    <img src={`data:${ref.mimeType};base64,${ref.base64}`} className="w-full h-14 object-cover rounded-md" alt={`Ref personaje ${idx + 1}`} />
                    <button onClick={() => removeRef(characterRefs, setCharacterRefs, idx)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-500/80 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {characterRefs.length < MAX_REFS && (
              <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-[#FFFFFF]/10 rounded-lg cursor-pointer hover:border-[#F5A623]/30 transition-colors">
                <Upload className="w-4 h-4 text-[#FFFFFF]/20" />
                <span className="text-[10px] text-[#FFFFFF]/30">Subir foto</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleRefUpload(e, characterRefs, setCharacterRefs)} />
              </label>
            )}
          </div>

          {/* Style refs */}
          <div className="card-panel p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PaletteIcon className="w-3.5 h-3.5 text-[#FFFFFF]/40" />
                <span className="text-[10px] font-semibold text-[#FFFFFF]/70">Estilo de diseño</span>
              </div>
              <span className="text-[9px] text-[#FFFFFF]/30">{styleRefs.length}/{MAX_REFS}</span>
            </div>
            {styleRefs.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {styleRefs.map((ref, idx) => (
                  <div key={idx} className="relative">
                    <img src={`data:${ref.mimeType};base64,${ref.base64}`} className="w-full h-14 object-cover rounded-md" alt={`Ref estilo ${idx + 1}`} />
                    <button onClick={() => removeRef(styleRefs, setStyleRefs, idx)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-500/80 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {styleRefs.length < MAX_REFS && (
              <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-[#FFFFFF]/10 rounded-lg cursor-pointer hover:border-[#F5A623]/30 transition-colors">
                <Upload className="w-4 h-4 text-[#FFFFFF]/20" />
                <span className="text-[10px] text-[#FFFFFF]/30">Subir diseño</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleRefUpload(e, styleRefs, setStyleRefs)} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ─── Format selector ─── */}
      {!lockFormat && (
        <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
            Formato
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(IMAGE_FORMAT_OPTIONS) as [ImageFormat, typeof IMAGE_FORMAT_OPTIONS[ImageFormat]][]).map(([key, opt]) => {
              const isActive = format === key;
              return (
                <button key={key} onClick={() => setFormat(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]' : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'}`}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-[#FFFFFF]/25 mt-1">{IMAGE_FORMAT_OPTIONS[format].descripcion} — {IMAGE_FORMAT_OPTIONS[format].width}x{IMAGE_FORMAT_OPTIONS[format].height}px</p>
        </div>
      )}

      {/* ─── Cantidad de imagenes (single vs carrusel) ─── */}
      {copyList.length <= 1 && (
        <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
            Cantidad de imagenes
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const isActive = slideCount === n;
              return (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]'
                      : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-[#FFFFFF]/25 mt-1">
            {slideCount === 1 ? 'Una imagen' : `Carrusel de ${slideCount} slides — consistencia visual entre slides`}
          </p>
        </div>
      )}

      {/* ─── Unified mode selector (IA Completa / Texto personalizado / Solo fondo) ─── */}
      <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
            Modo de generacion
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setGenMode('ia_completa')} className={`card-panel p-2.5 text-left transition-all ${genMode === 'ia_completa' ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className={`w-3.5 h-3.5 ${genMode === 'ia_completa' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
                <span className={`text-xs font-semibold ${genMode === 'ia_completa' ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>IA Completa</span>
              </div>
              <p className="text-[9px] text-[#FFFFFF]/30 leading-tight">La IA elige el texto segun tu prompt y angulo</p>
            </button>
            <button onClick={() => setGenMode('texto_personalizado')} className={`card-panel p-2.5 text-left transition-all ${genMode === 'texto_personalizado' ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Type className={`w-3.5 h-3.5 ${genMode === 'texto_personalizado' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
                <span className={`text-xs font-semibold ${genMode === 'texto_personalizado' ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>Texto personalizado</span>
              </div>
              <p className="text-[9px] text-[#FFFFFF]/30 leading-tight">Vos escribis el texto que va en la imagen</p>
            </button>
            <button onClick={() => setGenMode('solo_fondo')} className={`card-panel p-2.5 text-left transition-all ${genMode === 'solo_fondo' ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Pencil className={`w-3.5 h-3.5 ${genMode === 'solo_fondo' ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
                <span className={`text-xs font-semibold ${genMode === 'solo_fondo' ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>Solo fondo</span>
              </div>
              <p className="text-[9px] text-[#FFFFFF]/30 leading-tight">Sin texto — lo agregas vos despues</p>
            </button>
          </div>
          {isCarousel && genMode === 'texto_personalizado' && (
            <p className="text-[9px] text-[#FFFFFF]/40 mt-1.5">
              Configura el texto de cada slide abajo en "Control por slide"
            </p>
          )}
        </div>

      {/* ─── Style gallery (disabled when style refs uploaded) ─── */}
      <div className={styleGridDisabled ? 'opacity-40' : ''}>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Estilo visual {styleGridDisabled && <span className="text-[9px] font-normal normal-case tracking-normal text-[#FFFFFF]/30">— desactivado (hay referencia de estilo cargada)</span>}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(Object.entries(ESTILO_VISUAL_OPTIONS) as [EstiloVisual, typeof ESTILO_VISUAL_OPTIONS[EstiloVisual]][]).map(([key, opt]) => {
            const Icon = ESTILO_ICONS[key];
            const isActive = estilo === key && !styleGridDisabled;
            return (
              <button key={key} onClick={() => setEstilo(key)} disabled={styleGridDisabled} className={`p-2 rounded-xl border text-left transition-all disabled:cursor-not-allowed ${isActive ? 'border-[#F5A623]/50 bg-[#F5A623]/10' : 'border-[#FFFFFF]/5 hover:border-[#F5A623]/25 hover:bg-[#FFFFFF]/[0.02]'}`}>
                <Icon className={`w-3.5 h-3.5 mb-0.5 ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'}`} />
                <div className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/70'}`}>{opt.titulo}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Custom text inputs (single image, texto_personalizado) ─── */}
      {!isCarousel && genMode === 'texto_personalizado' && (
        <div className="space-y-2.5 p-4 rounded-xl bg-[#141414] border border-[rgba(245,166,35,0.15)]">
          <div>
            <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">H1 — Titulo *</label>
            <input type="text" value={customText.h1} onChange={(e) => setCustomText(prev => ({ ...prev, h1: e.target.value }))} placeholder="Tu titulo principal..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#FFFFFF]/50 uppercase tracking-wider">H2 — Subtitulo *</label>
            <input type="text" value={customText.h2} onChange={(e) => setCustomText(prev => ({ ...prev, h2: e.target.value }))} placeholder="Subtitulo..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">H3 — Terciario (opcional)</label>
            <input type="text" value={customText.h3 ?? ''} onChange={(e) => setCustomText(prev => ({ ...prev, h3: e.target.value || undefined }))} placeholder="Texto adicional..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.15)] rounded-xl px-3 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">CTA — Boton *</label>
            <input type="text" value={customText.cta} onChange={(e) => setCustomText(prev => ({ ...prev, cta: e.target.value }))} placeholder="Ej: Reserva tu lugar" className="w-full mt-1 bg-black/20 border border-[#F5A623]/30 rounded-xl px-3 py-2.5 text-[#F5A623] text-sm font-semibold focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#F5A623]/20" />
          </div>
        </div>
      )}

      {/* ─── Carousel Slide Control (when copies.length > 1) ─── */}
      {isCarousel && slideConfigs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40">Control por slide</label>
            <button
              onClick={() => {
                const current = slideConfigs[activeConfigSlide];
                if (current) { setSlideConfigs(slideConfigs.map(() => ({ ...current }))); toast.success('Aplicado a todos los slides'); }
              }}
              className="text-[10px] text-[#F5A623]/60 hover:text-[#F5A623] transition-colors"
            >
              Aplicar a todos
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button key={idx} onClick={() => setActiveConfigSlide(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${activeConfigSlide === idx ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30' : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30 hover:text-[#FFFFFF]/50 border border-transparent'}`}>
                Slide {idx + 1}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#141414] border border-[rgba(245,166,35,0.15)] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateSlideConfig(activeConfigSlide, { textSource: 'ia' })} className={`p-2 rounded-lg text-xs font-medium transition-all ${slideConfigs[activeConfigSlide]?.textSource === 'ia' ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30' : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30 border border-transparent'}`}>
                Texto de IA
              </button>
              <button onClick={() => updateSlideConfig(activeConfigSlide, { textSource: 'personalizado', customText: slideConfigs[activeConfigSlide]?.customText ?? { h1: '', h2: '', cta: '' } })} className={`p-2 rounded-lg text-xs font-medium transition-all ${slideConfigs[activeConfigSlide]?.textSource === 'personalizado' ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30' : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30 border border-transparent'}`}>
                Texto personalizado
              </button>
            </div>

            {slideConfigs[activeConfigSlide]?.textSource === 'personalizado' && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">H1 *</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.h1 ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'h1', e.target.value)} placeholder="Titulo del slide..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 placeholder-[#FFFFFF]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#FFFFFF]/50 uppercase tracking-wider">H2 *</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.h2 ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'h2', e.target.value)} placeholder="Subtitulo..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 placeholder-[#FFFFFF]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">H3</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.h3 ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'h3', e.target.value)} placeholder="Opcional..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.15)] rounded-xl px-3 py-2 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 placeholder-[#FFFFFF]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">CTA *</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.cta ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'cta', e.target.value)} placeholder="Boton de accion..." className="w-full mt-1 bg-black/20 border border-[#F5A623]/30 rounded-xl px-3 py-2 text-[#F5A623] text-xs font-semibold focus:border-[#F5A623]/50 placeholder-[#F5A623]/20" />
                </div>
              </div>
            )}

            {slideConfigs[activeConfigSlide]?.textSource === 'ia' && copyList[activeConfigSlide] && (
              <div className="text-xs text-[#FFFFFF]/40 space-y-1">
                <p><span className="text-[#FFFFFF]/20">Titulo:</span> {copyList[activeConfigSlide].titulo}</p>
                <p><span className="text-[#FFFFFF]/20">CTA:</span> {copyList[activeConfigSlide].cta_texto}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Custom instructions ─── */}
      <div>
        <button onClick={() => setShowInstrucciones(!showInstrucciones)} className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 hover:text-[#FFFFFF]/60 transition-colors">
          {showInstrucciones ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Instrucciones adicionales (opcional)
        </button>
        {showInstrucciones && (
          <textarea className="w-full mt-2 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20 resize-none" rows={3} placeholder="Ej: Mujer profesional de 35 años en consultorio moderno, luz natural..." value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} />
        )}
      </div>

      {/* ─── Generate button ─── */}
      <button onClick={generate} disabled={generating} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating
          ? isCarousel ? `Generando slide ${currentSlide + 1} de ${totalSlides}...` : 'Generando imagen...'
          : images.length > 0 ? 'Regenerar' : mode === 'fondo' ? 'Generar fondo' : 'Generar imagen'}
      </button>

      {/* ─── Progress ─── */}
      {generating && progress && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[rgba(245,166,35,0.15)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#FFFFFF]/60">Modelo: <span className="text-[#F5A623]">{progress.modelName}</span></span>
            <span className="text-xs text-[#FFFFFF]/40">Intento {progress.attempt}/{progress.total}</span>
          </div>
          <div className="h-1.5 bg-[#FFFFFF]/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#F5A623] rounded-full transition-all duration-500" style={{ width: `${(progress.attempt / progress.total) * 100}%` }} />
          </div>
          {progress.status === 'failed' && <p className="text-xs text-[#EF4444]/60 mt-1">Fallo, intentando siguiente modelo...</p>}
        </div>
      )}

      {/* ─── Image previews ─── */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#FFFFFF]/40">
              {images.length === 1 ? 'Imagen generada' : `${images.length} imagenes generadas`}
              {mode === 'fondo' && ' (solo fondo)'}
            </span>
            <button onClick={generate} disabled={generating} className="flex items-center gap-1 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors">
              <RotateCcw className="w-3 h-3" /> Regenerar
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button key={idx} onClick={() => setPreviewIdx(idx)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${previewIdx === idx ? 'border-[#F5A623]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={base64ToDataUrl(img.base64, img.mimeType)} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)] max-w-sm mx-auto">
            <img src={base64ToDataUrl(images[previewIdx].base64, images[previewIdx].mimeType)} alt="Preview" className="w-full object-cover" style={{ aspectRatio: `${IMAGE_FORMAT_OPTIONS[format].width}/${IMAGE_FORMAT_OPTIONS[format].height}` }} />
            {images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-[#FFFFFF]">{previewIdx + 1} / {images.length}</div>
            )}
          </div>
          <p className="text-[10px] text-[#FFFFFF]/30 text-center">Modelo: {images[previewIdx].modelUsed}</p>
        </div>
      )}
    </div>
  );
}
