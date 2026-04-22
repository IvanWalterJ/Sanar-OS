import React, { useState, useCallback, useRef } from 'react';
import { FileText, Image as ImageIcon, Eye, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import CopyGenerator from './CopyGenerator';
import ImagenGenerator from './ImagenGenerator';
import CreativoPreviewAuto from './CreativoPreviewAuto';
import { saveCreativo, updateCreativo, uploadCreativeImage, upsertCreativoAsset } from '../../lib/campanasStorage';
import type { Campana, CopyGenerado, AnguloCreativo, TipoCreativo, Creativo } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

type StudioTab = 'copy' | 'imagen' | 'preview';

interface Props {
  campana: Campana;
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  onBack: () => void;
  onSaved: (creativo: Creativo) => void;
}

const TABS: { id: StudioTab; label: string; icon: React.ElementType }[] = [
  { id: 'copy', label: 'Copy', icon: FileText },
  { id: 'imagen', label: 'Imagen', icon: ImageIcon },
  { id: 'preview', label: 'Preview', icon: Eye },
];

export default function CreativoStudio({ campana, userId, perfil, geminiKey, onBack, onSaved }: Props) {
  const [tab, setTab] = useState<StudioTab>('copy');
  const [copies, setCopies] = useState<CopyGenerado[]>([]);
  const [angulo, setAngulo] = useState<AnguloCreativo>('directo');
  const [tipo, setTipo] = useState<TipoCreativo>('imagen_single');
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentCreativoId, setCurrentCreativoId] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);

  const handleCopyGenerated = useCallback(
    (newCopies: CopyGenerado[], newAngulo: AnguloCreativo, newTipo: TipoCreativo) => {
      setCopies(newCopies);
      setAngulo(newAngulo);
      setTipo(newTipo);
      setImages([]); // Reset images when copy changes
      setCurrentCreativoId(null); // nuevo copy = nuevo creativo en proxima generacion
      setSaved(false);
    },
    [],
  );

  // ─── Auto-guardado en historial ────────────────────────────────────────
  const persistCreativo = useCallback(
    async (
      imgs: { base64: string; mimeType: string; modelUsed: string }[],
      prompts?: string[],
    ) => {
      if (!userId || copies.length === 0 || imgs.length === 0) return;
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      setSaving(true);
      const isFirstSave = currentCreativoId === null;
      try {
        let creativoId = currentCreativoId;

        if (!creativoId) {
          const creativo = await saveCreativo({
            usuario_id: userId,
            campana_id: campana.id,
            tipo,
            angulo,
            texto_principal: copies[0].texto_principal,
            titulo: copies[0].titulo,
            descripcion: copies[0].descripcion,
            cta_texto: copies[0].cta_texto,
            nombre: `${campana.nombre} - ${angulo}`,
            estado: 'generado',
            prompt_imagen: prompts && prompts.length > 0 ? JSON.stringify(prompts) : undefined,
          });
          if (!creativo) throw new Error('No se pudo guardar el creativo');
          creativoId = creativo.id;
          setCurrentCreativoId(creativoId);
          onSaved(creativo);
        } else if (prompts && prompts.length > 0) {
          await updateCreativo(creativoId, { prompt_imagen: JSON.stringify(prompts) });
        }

        for (let i = 0; i < imgs.length; i++) {
          const uploaded = await uploadCreativeImage(userId, creativoId, i + 1, imgs[i].base64, imgs[i].mimeType);
          if (uploaded) {
            await upsertCreativoAsset({
              creativo_id: creativoId,
              usuario_id: userId,
              slide_orden: i + 1,
              storage_path: uploaded.storagePath,
              public_url: uploaded.publicUrl,
              width: 1080,
              height: 1080,
              mime_type: imgs[i].mimeType,
            });
          }
        }

        setSaved(true);
        if (isFirstSave) toast.success('Creativo guardado en historial');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(`Error al guardar: ${msg}`);
      } finally {
        setSaving(false);
        saveInFlightRef.current = false;
      }
    },
    [userId, copies, angulo, tipo, campana, currentCreativoId, onSaved],
  );

  const handleImagesGenerated = useCallback(
    (
      imgs: { base64: string; mimeType: string; modelUsed: string }[],
      _mode?: string,
      prompts?: string[],
    ) => {
      setImages(imgs);
      setSaved(false);
      void persistCreativo(imgs, prompts);
    },
    [persistCreativo],
  );

  const canPreview = copies.length > 0 && images.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic' }}>
              Studio de Creativos
            </h2>
            <p className="text-sm text-[#FFFFFF]/40">{campana.nombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20 text-xs">
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5A623]" /><span className="text-[#FFFFFF]/60">Guardando en historial…</span></>
          ) : saved ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /><span className="text-[#FFFFFF]/70">Guardado en historial</span></>
          ) : copies.length === 0 ? (
            <span className="text-[#FFFFFF]/40">Generá el copy primero</span>
          ) : (
            <span className="text-[#FFFFFF]/40">Se guarda automáticamente al generar la imagen</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141414] p-1 rounded-xl border border-[rgba(245,166,35,0.1)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const disabled = t.id === 'preview' && !canPreview;
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setTab(t.id)}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#F5A623]/15 text-[#F5A623]'
                  : disabled
                    ? 'text-[#FFFFFF]/15 cursor-not-allowed'
                    : 'text-[#FFFFFF]/40 hover:text-[#FFFFFF]/60 hover:bg-[#FFFFFF]/5'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-[#1C1C1C] border border-[rgba(245,166,35,0.15)] rounded-2xl p-6">
        {tab === 'copy' && (
          <CopyGenerator
            perfil={perfil ?? {}}
            geminiKey={geminiKey}
            objetivo={campana.objetivo}
            onCopyGenerated={handleCopyGenerated}
          />
        )}

        {tab === 'imagen' && (
          <ImagenGenerator
            copies={copies}
            angulo={angulo}
            perfil={perfil ?? {}}
            geminiKey={geminiKey}
            onImagesGenerated={handleImagesGenerated}
          />
        )}

        {tab === 'preview' && canPreview && (
          <div className="space-y-4">
            {/* Slide selector for carousel */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                      activeSlide === idx
                        ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                        : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30'
                    }`}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>
            )}

            <CreativoPreviewAuto
              image={images[activeSlide]}
              copy={copies[activeSlide] ?? copies[0]}
              slideIndex={images.length > 1 ? activeSlide : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
