/**
 * CreativosView.tsx — Generacion directa de imagenes con IA (sin paso de copy).
 * Flujo simplificado: elegir angulo (opcional) → generar imagen → guardar.
 */
import { useState, useCallback } from 'react';
import {
  ImageIcon, Loader2, CheckCircle2, Save, Pencil, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import ImagenGenerator from './ImagenGenerator';
import { saveCreativo, uploadCreativeImage, saveCreativoAsset } from '../../lib/campanasStorage';
import type { AnguloCreativo, ImageMode } from '../../lib/campanasTypes';
import CreativoEditor from './CreativoEditor';
import type { ProfileV2 } from '../../lib/supabase';

const ANGULOS: { id: AnguloCreativo; label: string; descripcion: string }[] = [
  { id: 'directo', label: 'Directo', descripcion: 'Claro y profesional' },
  { id: 'contraintuitivo', label: 'Contraintuitivo', descripcion: 'Disruptivo, sorprende' },
  { id: 'emocional', label: 'Emocional', descripcion: 'Conecta con sentimientos' },
  { id: 'curiosidad', label: 'Curiosidad', descripcion: 'Genera pregunta' },
  { id: 'autoridad', label: 'Autoridad', descripcion: 'Credibilidad premium' },
  { id: 'dolor', label: 'Dolor', descripcion: 'Problema actual' },
  { id: 'deseo', label: 'Deseo', descripcion: 'Resultado ideal' },
];

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function CreativosView({ userId, perfil, geminiKey }: Props) {
  const [angulo, setAngulo] = useState<AnguloCreativo>('directo');
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [imageMode, setImageMode] = useState<ImageMode>('completa');
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImagesGenerated = useCallback((newImages: { base64: string; mimeType: string; modelUsed: string }[], mode: ImageMode) => {
    setImages(newImages);
    setImageMode(mode);
    setSaved(false);
    if (mode === 'fondo') setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || images.length === 0) return;
    setSaving(true);
    try {
      const creativo = await saveCreativo({
        usuario_id: userId,
        tipo: 'imagen_single',
        angulo,
        texto_principal: '',
        titulo: `Creativo ${angulo}`,
        descripcion: '',
        cta_texto: '',
        nombre: `Creativo ${angulo} — ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`,
        estado: 'generado',
        prompt_imagen: 'Generated with Nano Banana cascade',
      });

      if (!creativo) throw new Error('No se pudo guardar el creativo');

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

      toast.success('Creativo guardado correctamente');
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [userId, images, angulo]);

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5A623]/15 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-[#F5A623]" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-0.5">
            Generador de imagenes
          </p>
          <h2 className="text-xl font-light text-[#FFFFFF]">
            Creativos{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
              con IA
            </span>
          </h2>
        </div>
      </div>

      {/* Angulo de comunicacion (opcional) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FFFFFF]/40" />
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/50">
            Angulo de comunicacion
          </span>
          <span className="text-[9px] text-[#FFFFFF]/25">— opcional, orienta el tono visual</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {ANGULOS.map((a) => {
            const isActive = angulo === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAngulo(a.id)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-[#F5A623]/50 bg-[#F5A623]/10'
                    : 'border-[#FFFFFF]/5 hover:border-[#F5A623]/25 hover:bg-[#FFFFFF]/[0.02]'
                }`}
              >
                <div className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/80'}`}>
                  {a.label}
                </div>
                <div className="text-[9px] text-[#FFFFFF]/30 mt-0.5 leading-tight">{a.descripcion}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generador de imagenes */}
      <div className="card-panel p-5">
        <ImagenGenerator
          angulo={angulo}
          perfil={perfil ?? {}}
          geminiKey={geminiKey}
          onImagesGenerated={handleImagesGenerated}
        />
      </div>

      {/* Editor */}
      {images.length > 0 && showEditor && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 rounded-full bg-[#F5A623]/20 flex items-center justify-center">
              <Pencil className="w-3 h-3 text-[#F5A623]" />
            </div>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
              Editar texto
            </span>
            <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
          </div>
          <CreativoEditor
            image={{ base64: images[0].base64, mimeType: images[0].mimeType }}
            copy={{
              texto_principal: '',
              titulo: '',
              descripcion: '',
              cta_texto: '',
            }}
          />
        </div>
      )}

      {images.length > 0 && !showEditor && imageMode === 'completa' && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 text-xs text-[#FFFFFF]/50 hover:text-[#F5A623] transition-colors px-4 py-2 rounded-xl border border-[#FFFFFF]/10 hover:border-[#F5A623]/30"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar texto sobre la imagen
          </button>
        </div>
      )}

      {/* Guardar */}
      {images.length > 0 && (
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
