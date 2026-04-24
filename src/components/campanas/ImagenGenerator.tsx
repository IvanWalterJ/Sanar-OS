import React, { useState, useCallback, useEffect } from 'react';
import {
  Loader2, Sparkles, RotateCcw,
  Camera, Zap, Smile, Tv, Twitter,
  ChevronDown, ChevronUp,
  Upload, X, Palette as PaletteIcon, Type,
  RefreshCw, Wand2, Cookie, Layers, User, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateImageWithFallback, generateCarouselImages, base64ToDataUrl, editImage } from '../../lib/campanasImageGen';
import type { ReferenceImages } from '../../lib/campanasImageGen';
import { buildImagePrompt, buildCarouselNarrativePrompt } from '../../lib/campanasPrompts';
import type { CarouselNarrative, CarouselConceptoVisual } from '../../lib/campanasPrompts';
import { generateText } from '../../lib/aiProvider';
import type { ImageGenProgress } from '../../lib/campanasImageGen';
import type {
  CopyGenerado, AnguloCreativo, EstiloVisual, ImageMode, ImageFormat, ImageQuality,
  ReferenceImage, TextSource, CustomText, SlideConfig, ImageGenerationMode,
} from '../../lib/campanasTypes';
import {
  ESTILO_VISUAL_OPTIONS, IMAGE_FORMAT_OPTIONS,
  IMAGE_QUALITY_OPTIONS, IMAGE_QUALITY_DEFAULT,
} from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

const MAX_REFS = 5;

const ESTILO_ICONS: Record<EstiloVisual, React.ComponentType<{ className?: string }>> = {
  foto_real: Camera,
  bold: Zap,
  pixar: Sparkles,
  caricatura: Smile,
  comic: Layers,
  plasticina: Cookie,
  noticias: Tv,
  twitter: Twitter,
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
  onImagesGenerated: (
    images: { base64: string; mimeType: string; modelUsed: string }[],
    mode: ImageMode,
    prompts?: string[],
  ) => void;
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
  const [quality, setQuality] = useState<ImageQuality>(IMAGE_QUALITY_DEFAULT);
  const [genMode, setGenMode] = useState<ImageGenerationMode>('ia_completa');
  const [estilo, setEstilo] = useState<EstiloVisual>('foto_real');
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

  // Prompts y refs por slide (para regeneracion individual y edicion)
  const [slidePrompts, setSlidePrompts] = useState<string[]>([]);
  const [slideRefsUsed, setSlideRefsUsed] = useState<(ReferenceImages | undefined)[]>([]);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  // Narrativa del carrusel guardada — se reusa en regenerateSingle para
  // reconstruir el prompt con el estado UI actual (si el usuario cambio de
  // estilo, tema, instrucciones, etc. despues de generar).
  const [savedNarrative, setSavedNarrative] = useState<CarouselNarrative | null>(null);

  // Edicion sutil con IA
  const [editPrompt, setEditPrompt] = useState('');
  const [editing, setEditing] = useState(false);

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
    // OpenAI (server-side, primario) no necesita key en el cliente.
    // Gemini es fallback — si no hay key, la cascada arranca y termina en OpenAI.

    // Hay input valido si: tema escrito, copies, custom text con H1, o imagenes de referencia.
    const hasAnyInput =
      userPrompt.trim().length > 0 ||
      copyList.length > 0 ||
      characterRefs.length > 0 ||
      styleRefs.length > 0 ||
      (genMode === 'texto_personalizado' && customText.h1.trim().length > 0);
    if (!hasAnyInput) {
      toast.error('Escribi un tema, sumi una imagen de referencia o completa el texto personalizado');
      return;
    }

    // Validate custom text for single image: solo H1 obligatorio
    if (!isCarousel && genMode === 'texto_personalizado') {
      if (!customText.h1.trim()) {
        toast.error('Completa al menos el H1 (titulo principal)'); return;
      }
    }
    if (isCarousel) {
      const invalid = slideConfigs.findIndex(
        cfg => cfg.textSource === 'personalizado' && !cfg.customText?.h1?.trim()
      );
      if (invalid >= 0) { toast.error(`Completa al menos el H1 (titulo) en slide ${invalid + 1}`); return; }

      // Carrusel con IA: sin tema + sin copies = 10 slides identicos.
      // Forzamos tema escrito o copies explicitos para que cada slide sea distinto.
      const allSlidesUsanIAInit = slideConfigs.every((c) => (c?.textSource ?? 'ia') === 'ia');
      if (
        copyList.length === 0 &&
        allSlidesUsanIAInit &&
        genMode === 'ia_completa' &&
        userPrompt.trim().length === 0
      ) {
        toast.error('Para un carrusel con IA escribi el tema o contexto — sino todos los slides salen iguales.');
        return;
      }
    }

    setGenerating(true);
    setImages([]);
    setPreviewIdx(0);
    setSavedNarrative(null);

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
        const result = await generateImageWithFallback(prompt, setProgress, refs, { geminiKey, format, quality });
        const imgs = [{ base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed }];
        setImages(imgs);
        setSlidePrompts([prompt]);
        setSlideRefsUsed([refs]);
        onImagesGenerated(imgs, mode, [prompt]);
        toast.success(`Imagen generada con ${result.modelName}`);
      } else {
        // ─── HILO NARRATIVO DEL CARRUSEL ─────────────────────────────────────
        // Pedimos PRIMERO una narrativa coherente: concepto visual unificado +
        // N variaciones de ESCENA distintas (plano/angulo/accion por slide) para
        // que el carrusel no salga como 10 slides identicas con el texto cambiado.
        // Corre SIEMPRE en carruseles (excepto mode='fondo' donde no hay composicion).
        // Si no hay copies/custom text, tambien genera los titulares.
        let narrative: CarouselNarrative | null = null;
        const allSlidesUsanIA = slideConfigs.every((c) => (c?.textSource ?? 'ia') === 'ia');
        const necesitaTitulos = copyList.length === 0 && allSlidesUsanIA;
        const necesitaNarrativa = mode !== 'fondo';

        if (necesitaNarrativa) {
          let narrativeError: string | null = null;
          try {
            setProgress({ modelName: 'Gemini (narrativa)', attempt: 1, total: 1, status: 'trying' });
            const narrPrompt = buildCarouselNarrativePrompt(
              userPrompt.trim(),
              totalSlides,
              effectiveAngulo,
              perfil,
              styleRefs.length > 0 ? undefined : estilo,
            );
            const text = await generateText({ prompt: narrPrompt });
            const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonStr = jsonMatch[0]
                .replace(/[\x00-\x1F\x7F]/g, (c) => (c === '\n' || c === '\r' || c === '\t' ? c : ''))
                .replace(/,\s*([}\]])/g, '$1');
              const parsed = JSON.parse(jsonStr) as CarouselNarrative;
              if (Array.isArray(parsed.slides) && parsed.slides.length >= totalSlides) {
                narrative = parsed;
              } else {
                narrativeError = `Narrativa devolvio ${parsed.slides?.length ?? 0} slides en vez de ${totalSlides}`;
              }
            } else {
              narrativeError = 'Narrativa no devolvio JSON valido';
            }
          } catch (err) {
            narrativeError = err instanceof Error ? err.message : String(err);
          }
          // Si no se pudo armar narrativa:
          //   - si necesitamos titulos (todo IA, sin copies), abortar (sino salen 10 slides identicas)
          //   - si ya tenemos titulos (copies/custom), continuar sin concepto visual — mejor que fallar
          if (!narrative) {
            if (necesitaTitulos) {
              throw new Error(
                `No se pudo armar el hilo narrativo del carrusel${narrativeError ? ` (${narrativeError})` : ''}. Probá de nuevo o simplifica el tema.`
              );
            } else {
              toast.warning(
                `No se pudo armar el hilo visual — las slides pueden salir menos variadas. ${narrativeError ?? ''}`.trim()
              );
            }
          }
        }

        const conceptoVisual: CarouselConceptoVisual | undefined = narrative?.concepto_visual;
        // Titulos por slide: prioridad customText → copy → narrativa IA
        const allSlideTitles: string[] = Array.from({ length: totalSlides }).map((_, i) => {
          const cfg = slideConfigs[i];
          if (cfg?.textSource === 'personalizado' && cfg.customText?.h1) return cfg.customText.h1;
          const copyTitle = copyList[i]?.titulo;
          if (copyTitle) return copyTitle;
          return narrative?.slides[i]?.titulo ?? '';
        });
        // Escenas por slide desde la narrativa (distincion visual por slide)
        const allSlideEscenas: string[] = Array.from({ length: totalSlides }).map(
          (_, i) => narrative?.slides[i]?.escena ?? '',
        );
        const hasEscenas = allSlideEscenas.some((e) => e.trim().length > 0);

        const prompts = Array.from({ length: totalSlides }).map((_, i) => {
          const copyForSlide = copyList[i] ?? null;
          const cfg = slideConfigs[i] ?? { textSource: 'ia' };
          const slideCustomText = cfg.textSource === 'personalizado' ? cfg.customText : undefined;
          // Prioridad: customText → copy explicito → titulo de la narrativa generada
          const slideTexto = slideCustomText
            ? slideCustomText.h1
            : copyForSlide?.titulo ?? narrative?.slides[i]?.titulo;

          return buildImagePrompt(copyForSlide, effectiveAngulo, perfil, {
            slideNumber: i + 1,
            totalSlides,
            slideTexto,
          }, {
            ...baseOpts,
            customText: slideCustomText,
            isCarousel: true,
            narrativeContext: {
              conceptoVisual,
              allSlideTitles: allSlideTitles.some((t) => t) ? allSlideTitles : undefined,
              previousSlideTitle: i > 0 ? allSlideTitles[i - 1] || undefined : undefined,
              nextSlideTitle: i < totalSlides - 1 ? allSlideTitles[i + 1] || undefined : undefined,
              slideEscena: allSlideEscenas[i] || undefined,
              allSlideEscenas: hasEscenas ? allSlideEscenas : undefined,
            },
          });
        });
        const results = await generateCarouselImages(prompts, (slideIdx, prog) => {
          setCurrentSlide(slideIdx);
          setProgress(prog);
        }, refs, { geminiKey, format, quality });
        const imgs = results.map((r) => ({ base64: r.imageBase64, mimeType: r.mimeType, modelUsed: r.modelUsed }));
        setImages(imgs);
        setSlidePrompts(prompts);
        setSlideRefsUsed(prompts.map(() => refs));
        setSavedNarrative(narrative);
        onImagesGenerated(imgs, mode, prompts);
        toast.success(narrative
          ? `${results.length} slides con hilo narrativo generadas`
          : `${results.length} imagenes de carrusel generadas`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [copyList, effectiveAngulo, perfil, geminiKey, onImagesGenerated, estilo, mode, genMode, instrucciones, characterRefs, styleRefs, customText, slideConfigs, format, quality, userPrompt, textSource, isCarousel, totalSlides]);

  // ─── Regenerar UNA sola slide ──────────────────────────────────────────────
  // Reconstruye el prompt desde el estado UI actual (estilo, tema, instrucciones,
  // refs, custom text). Asi si el usuario cambia de estilo despues de generar,
  // la regeneracion toma el nuevo estilo en vez de reusar el prompt viejo.
  const regenerateSingle = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= Math.max(1, totalSlides)) {
      toast.error('Indice de slide invalido');
      return;
    }

    // Refs actuales (puede haber cambiado si el usuario subio/quito imagenes)
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

    let prompt: string;
    if (!isCarousel) {
      const effectiveCustomText = genMode === 'texto_personalizado' ? customText : undefined;
      const copyForPrompt = copyList[0] ?? null;
      prompt = buildImagePrompt(copyForPrompt, effectiveAngulo, perfil, undefined, {
        ...baseOpts,
        customText: effectiveCustomText,
      });
    } else {
      // Carrusel: reusar narrativa guardada para mantener hilo visual/copy
      const copyForSlide = copyList[idx] ?? null;
      const cfg = slideConfigs[idx] ?? { textSource: 'ia' };
      const slideCustomText = cfg.textSource === 'personalizado' ? cfg.customText : undefined;
      const allSlideTitles: string[] = Array.from({ length: totalSlides }).map((_, j) => {
        const cfgJ = slideConfigs[j];
        if (cfgJ?.textSource === 'personalizado' && cfgJ.customText?.h1) return cfgJ.customText.h1;
        const copyTitle = copyList[j]?.titulo;
        if (copyTitle) return copyTitle;
        return savedNarrative?.slides[j]?.titulo ?? '';
      });
      const allSlideEscenas: string[] = Array.from({ length: totalSlides }).map(
        (_, j) => savedNarrative?.slides[j]?.escena ?? '',
      );
      const hasEscenas = allSlideEscenas.some((e) => e.trim().length > 0);
      const slideTexto = slideCustomText
        ? slideCustomText.h1
        : copyForSlide?.titulo ?? savedNarrative?.slides[idx]?.titulo;

      prompt = buildImagePrompt(copyForSlide, effectiveAngulo, perfil, {
        slideNumber: idx + 1,
        totalSlides,
        slideTexto,
      }, {
        ...baseOpts,
        customText: slideCustomText,
        isCarousel: true,
        narrativeContext: {
          conceptoVisual: savedNarrative?.concepto_visual,
          allSlideTitles: allSlideTitles.some((t) => t) ? allSlideTitles : undefined,
          previousSlideTitle: idx > 0 ? allSlideTitles[idx - 1] || undefined : undefined,
          nextSlideTitle: idx < totalSlides - 1 ? allSlideTitles[idx + 1] || undefined : undefined,
          slideEscena: allSlideEscenas[idx] || undefined,
          allSlideEscenas: hasEscenas ? allSlideEscenas : undefined,
        },
      });
    }

    setRegeneratingIdx(idx);
    try {
      const result = await generateImageWithFallback(prompt, setProgress, refs, { geminiKey, format, quality });
      // Guardar el prompt nuevo y las refs actuales para futuras regeneraciones
      setSlidePrompts(prev => { const next = [...prev]; next[idx] = prompt; return next; });
      setSlideRefsUsed(prev => { const next = [...prev]; next[idx] = refs; return next; });
      setImages(prev => {
        const next = [...prev];
        next[idx] = { base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed };
        onImagesGenerated(next, mode);
        return next;
      });
      toast.success(`Slide ${idx + 1} regenerada`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error regenerando slide ${idx + 1}: ${msg}`);
    } finally {
      setRegeneratingIdx(null);
      setProgress(null);
    }
  }, [
    totalSlides, isCarousel, characterRefs, styleRefs, estilo, mode, instrucciones,
    userPrompt, format, genMode, customText, copyList, effectiveAngulo, perfil,
    slideConfigs, savedNarrative, geminiKey, quality, onImagesGenerated,
  ]);

  // ─── Edicion sutil con IA ──────────────────────────────────────────────────
  const applyEdit = useCallback(async () => {
    if (!editPrompt.trim()) { toast.error('Describi el cambio que queres aplicar'); return; }
    if (images.length === 0) return;

    const idx = previewIdx;
    const baseImg = images[idx];
    setEditing(true);
    try {
      const result = await editImage(
        { base64: baseImg.base64, mimeType: baseImg.mimeType },
        editPrompt.trim(),
        setProgress,
        { geminiKey, format, quality },
      );
      setImages(prev => {
        const next = [...prev];
        next[idx] = { base64: result.imageBase64, mimeType: result.mimeType, modelUsed: result.modelUsed };
        onImagesGenerated(next, mode);
        return next;
      });
      setEditPrompt('');
      toast.success('Edicion aplicada');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error en la edicion: ${msg}`);
    } finally {
      setEditing(false);
      setProgress(null);
    }
  }, [geminiKey, editPrompt, images, previewIdx, mode, onImagesGenerated, format, quality]);

  return (
    <div className="space-y-3">
      {/* ─── Tema / contexto del contenido (input principal) ─── */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Tema o contexto del contenido <span className="text-[#FFFFFF]/25 normal-case font-normal tracking-normal">— opcional, no se usa como descripcion literal</span>
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          rows={3}
          placeholder="Ej: estres en profesionales de la salud, transicion de carrera a las 40, importancia del descanso. Si subis una referencia visual, ese estilo manda — esto solo orienta el angulo del contenido."
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

      {/* ─── Calidad de generacion (OpenAI gpt-image-2) ─── */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-2">
          Calidad de generacion
          <span className="text-[#FFFFFF]/25 normal-case font-normal tracking-normal"> — impacta costo y velocidad</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(IMAGE_QUALITY_OPTIONS) as [ImageQuality, typeof IMAGE_QUALITY_OPTIONS[ImageQuality]][]).map(([key, opt]) => {
            const isActive = quality === key;
            return (
              <button
                key={key}
                onClick={() => setQuality(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-[#F5A623]/15 border-[#F5A623]/40 text-[#F5A623]'
                    : 'border-[#FFFFFF]/10 text-[#FFFFFF]/40 hover:border-[#FFFFFF]/25 hover:text-[#FFFFFF]/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-[#FFFFFF]/25 mt-1">
          {IMAGE_QUALITY_OPTIONS[quality].descripcion} — {IMAGE_QUALITY_OPTIONS[quality].costoAprox}
        </p>
      </div>

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
            <label className="text-[10px] font-bold text-[#FFFFFF]/50 uppercase tracking-wider">H2 — Subtitulo (opcional)</label>
            <input type="text" value={customText.h2} onChange={(e) => setCustomText(prev => ({ ...prev, h2: e.target.value }))} placeholder="Subtitulo..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">H3 — Terciario (opcional)</label>
            <input type="text" value={customText.h3 ?? ''} onChange={(e) => setCustomText(prev => ({ ...prev, h3: e.target.value || undefined }))} placeholder="Texto adicional..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.15)] rounded-xl px-3 py-2.5 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">CTA — Boton (opcional)</label>
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
                  <label className="text-[10px] font-bold text-[#FFFFFF]/50 uppercase tracking-wider">H2 (opcional)</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.h2 ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'h2', e.target.value)} placeholder="Subtitulo..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 placeholder-[#FFFFFF]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">H3</label>
                  <input type="text" value={slideConfigs[activeConfigSlide]?.customText?.h3 ?? ''} onChange={(e) => updateSlideCustomText(activeConfigSlide, 'h3', e.target.value)} placeholder="Opcional..." className="w-full mt-1 bg-black/20 border border-[rgba(245,166,35,0.15)] rounded-xl px-3 py-2 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 placeholder-[#FFFFFF]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">CTA (opcional)</label>
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
                <div key={idx} className="relative shrink-0 group">
                  <button
                    onClick={() => setPreviewIdx(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${previewIdx === idx ? 'border-[#F5A623]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={base64ToDataUrl(img.base64, img.mimeType)} alt={`Pieza ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                  {slidePrompts[idx] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateSingle(idx); }}
                      disabled={regeneratingIdx !== null || generating || editing}
                      title={`Regenerar pieza ${idx + 1}`}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0F0F0F] border border-[#F5A623]/40 text-[#F5A623] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#F5A623]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {regeneratingIdx === idx
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RefreshCw className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)] max-w-sm mx-auto">
            <img src={base64ToDataUrl(images[previewIdx].base64, images[previewIdx].mimeType)} alt="Preview" className="w-full object-cover" style={{ aspectRatio: `${IMAGE_FORMAT_OPTIONS[format].width}/${IMAGE_FORMAT_OPTIONS[format].height}` }} />
            {images.length > 1 && slidePrompts[previewIdx] && (
              <button
                onClick={() => regenerateSingle(previewIdx)}
                disabled={regeneratingIdx !== null || generating || editing}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-xs text-[#F5A623] hover:bg-black/85 border border-[#F5A623]/30 transition-all disabled:opacity-40"
              >
                {regeneratingIdx === previewIdx
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Regenerando...</>
                  : <><RefreshCw className="w-3 h-3" /> Regenerar esta</>
                }
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#FFFFFF]/30 text-center">Modelo: {images[previewIdx].modelUsed}</p>

          {/* ─── Edicion sutil con IA (Nano Banana edit mode) ─── */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[rgba(245,166,35,0.15)] space-y-2">
            <div className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#F5A623]">
                Editar con IA {images.length > 1 ? `(pieza ${previewIdx + 1})` : ''}
              </span>
              <span className="text-[9px] text-[#FFFFFF]/30 normal-case font-normal">— retoque sutil, mantiene composicion</span>
            </div>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={2}
              placeholder="Ej: quita el logo de la esquina inferior derecha; cambia el color del boton a dorado; borra el icono pequeño del costado izquierdo"
              className="w-full bg-black/30 border border-[rgba(245,166,35,0.2)] rounded-xl p-2.5 text-[#FFFFFF] text-xs focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 placeholder-[#FFFFFF]/20 resize-none"
              disabled={editing || regeneratingIdx !== null || generating}
            />
            <div className="flex justify-end">
              <button
                onClick={applyEdit}
                disabled={editing || !editPrompt.trim() || regeneratingIdx !== null || generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/40 text-xs font-semibold hover:bg-[#F5A623]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aplicando edicion...</>
                  : <><Wand2 className="w-3.5 h-3.5" /> Aplicar edicion</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
