import React, { useState, useCallback } from 'react';
import { FileText, Image as ImageIcon, Eye, Loader2, Check, ArrowLeft, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import CopyGenerator from './CopyGenerator';
import ImagenGenerator from './ImagenGenerator';
import CreativoPreviewAuto from './CreativoPreviewAuto';
import CreativoEditor from './CreativoEditor';
import { saveCreativo, uploadCreativeImage, saveCreativoAsset } from '../../lib/campanasStorage';
import type { Campana, CopyGenerado, AnguloCreativo, TipoCreativo, Creativo } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

type StudioTab = 'copy' | 'imagen' | 'preview';
type PreviewMode = 'auto' | 'editor';

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('auto');
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleCopyGenerated = useCallback(
    (newCopies: CopyGenerado[], newAngulo: AnguloCreativo, newTipo: TipoCreativo) => {
      setCopies(newCopies);
      setAngulo(newAngulo);
      setTipo(newTipo);
      setImages([]); // Reset images when copy changes
    },
    [],
  );

  const handleImagesGenerated = useCallback(
    (imgs: { base64: string; mimeType: string; modelUsed: string }[], mode?: string) => {
      setImages(imgs);
      if (mode === 'fondo') setPreviewMode('editor');
    },
    [],
  );

  const handleSave = async () => {
    if (!userId || copies.length === 0) return;

    setSaving(true);
    try {
      // Save creativo record
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
        prompt_imagen: images.length > 0 ? 'Generated with Nano Banana cascade' : undefined,
      });

      if (!creativo) throw new Error('No se pudo guardar el creativo');

      // Upload images if available
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const uploaded = await uploadCreativeImage(userId, creativo.id, i + 1, images[i].base64, images[i].mimeType);
          if (uploaded) {
            await saveCreativoAsset({
              creativo_id: creativo.id,
              usuario_id: userId,
              slide_orden: i + 1,
              storage_path: uploaded.storagePath,
              public_url: uploaded.publicUrl,
              width: 1080,
              height: 1080,
              mime_type: images[i].mimeType,
            });
          }
        }
      }

      toast.success('Creativo guardado correctamente');
      onSaved(creativo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

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

        <button
          onClick={handleSave}
          disabled={saving || copies.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar Creativo'}
        </button>
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
            {/* Mode selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode('auto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === 'auto'
                    ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                    : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/40 border border-transparent hover:text-[#FFFFFF]/60'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Overlay Automatico
              </button>
              <button
                onClick={() => setPreviewMode('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === 'editor'
                    ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                    : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/40 border border-transparent hover:text-[#FFFFFF]/60'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Editor
              </button>
            </div>

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

            {/* Preview component */}
            {previewMode === 'auto' ? (
              <CreativoPreviewAuto
                image={images[activeSlide]}
                copy={copies[activeSlide] ?? copies[0]}
                slideIndex={images.length > 1 ? activeSlide : undefined}
              />
            ) : (
              <CreativoEditor
                image={images[activeSlide]}
                copy={copies[activeSlide] ?? copies[0]}
                slideIndex={images.length > 1 ? activeSlide : undefined}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
