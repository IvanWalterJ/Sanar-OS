/**
 * CreativosView.tsx — Generacion directa de copies + imagenes con IA
 * Flujo: elegir objetivo → generar copies → generar imagenes → guardar
 */
import React, { useState, useCallback } from 'react';
import {
  ImageIcon, Target, MessageSquare, Users, Loader2,
  CheckCircle2, Sparkles, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import CopyGenerator from './CopyGenerator';
import ImagenGenerator from './ImagenGenerator';
import { saveCreativo, uploadCreativeImage, saveCreativoAsset } from '../../lib/campanasStorage';
import { OBJETIVO_LABELS } from '../../lib/campanasTypes';
import type {
  ObjetivoCampana, AnguloCreativo, TipoCreativo, CopyGenerado,
} from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

const OBJETIVO_ICONS: Record<ObjetivoCampana, React.ComponentType<{ className?: string }>> = {
  trafico_perfil: Target,
  mensajes_retargeting: MessageSquare,
  clientes_potenciales: Users,
};

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function CreativosView({ userId, perfil, geminiKey }: Props) {
  const [objetivo, setObjetivo] = useState<ObjetivoCampana>('trafico_perfil');
  const [copies, setCopies] = useState<CopyGenerado[]>([]);
  const [angulo, setAngulo] = useState<AnguloCreativo>('contraintuitivo');
  const [tipo, setTipo] = useState<TipoCreativo>('imagen_single');
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyGenerated = useCallback((newCopies: CopyGenerado[], newAngulo: AnguloCreativo, newTipo: TipoCreativo) => {
    setCopies(newCopies);
    setAngulo(newAngulo);
    setTipo(newTipo);
    setImages([]);
    setSaved(false);
  }, []);

  const handleImagesGenerated = useCallback((newImages: { base64: string; mimeType: string; modelUsed: string }[]) => {
    setImages(newImages);
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || copies.length === 0) return;
    setSaving(true);
    try {
      const creativo = await saveCreativo({
        usuario_id: userId,
        tipo,
        angulo,
        texto_principal: copies[0].texto_principal,
        titulo: copies[0].titulo,
        descripcion: copies[0].descripcion,
        cta_texto: copies[0].cta_texto,
        nombre: `Creativo ${angulo} — ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`,
        estado: 'generado',
        prompt_imagen: images.length > 0 ? 'Generated with Nano Banana cascade' : undefined,
      });

      if (!creativo) throw new Error('No se pudo guardar el creativo');

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
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [userId, copies, images, tipo, angulo]);

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Generador directo
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          Creativos{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            con IA
          </span>
        </h2>
        <p className="text-xs text-[#FFFFFF]/40 mt-1">
          Genera copies e imagenes listos para Meta Ads en un solo flujo.
        </p>
      </div>

      {/* Paso 1 — Tipo de campaña */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 rounded-full bg-[#F5A623]/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-[#F5A623]">1</span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
            Tipo de campaña
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(OBJETIVO_LABELS) as ObjetivoCampana[]).map((obj) => {
            const Icon = OBJETIVO_ICONS[obj];
            const label = OBJETIVO_LABELS[obj];
            const isActive = objetivo === obj;
            return (
              <button
                key={obj}
                onClick={() => setObjetivo(obj)}
                className={`card-panel p-4 text-left transition-all hover:-translate-y-0.5 ${
                  isActive ? 'border-[#F5A623]/50 bg-[#F5A623]/5' : 'hover:border-[#F5A623]/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  isActive ? 'bg-[#F5A623]/15' : 'bg-[#FFFFFF]/5'
                }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40'}`} />
                </div>
                <div className={`text-sm font-semibold mb-1 ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]'}`}>
                  {label.titulo}
                </div>
                <div className="text-[10px] text-[#FFFFFF]/30 leading-relaxed">
                  {label.descripcion}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Paso 2 — Generar copies */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            copies.length > 0 ? 'bg-[#22C55E]/20' : 'bg-[#F5A623]/20'
          }`}>
            {copies.length > 0
              ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
              : <span className="text-[9px] font-bold text-[#F5A623]">2</span>
            }
          </div>
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
            Generar copies
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        <CopyGenerator
          perfil={perfil ?? {}}
          geminiKey={geminiKey}
          objetivo={objetivo}
          onCopyGenerated={handleCopyGenerated}
        />
      </div>

      {/* Paso 3 — Generar imagenes (solo si hay copies) */}
      {copies.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              images.length > 0 ? 'bg-[#22C55E]/20' : 'bg-[#F5A623]/20'
            }`}>
              {images.length > 0
                ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                : <span className="text-[9px] font-bold text-[#F5A623]">3</span>
              }
            </div>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
              Generar imagenes
            </span>
            <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
          </div>

          <ImagenGenerator
            copies={copies}
            angulo={angulo}
            perfil={perfil ?? {}}
            geminiKey={geminiKey}
            onImagesGenerated={handleImagesGenerated}
          />
        </div>
      )}

      {/* Guardar */}
      {copies.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Guardado</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar creativo</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
