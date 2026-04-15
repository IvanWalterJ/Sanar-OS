/**
 * CreativosView.tsx — Generador de creativos con sub-tabs:
 * Imagen / Carrusel / Portada YouTube / Historial.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  ImageIcon, Loader2, CheckCircle2, Save, Pencil, Sparkles,
  Layers, Youtube, FolderOpen, Image as ImageLucide,
} from 'lucide-react';
import { toast } from 'sonner';
import ImagenGenerator from './ImagenGenerator';
import CreativoEditor from './CreativoEditor';
import CreativoGallery from './CreativoGallery';
import CreativoDetalle from './CreativoDetalle';
import {
  saveCreativo,
  uploadCreativeImage,
  saveCreativoAsset,
  fetchCreativos,
} from '../../lib/campanasStorage';
import type {
  AnguloCreativo,
  ImageMode,
  TipoCreativo,
  ImageFormat,
  Creativo,
} from '../../lib/campanasTypes';
import { IMAGE_FORMAT_OPTIONS } from '../../lib/campanasTypes';
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

type SubTab = 'imagen' | 'carrusel' | 'youtube' | 'historial';

interface TabConfig {
  id: SubTab;
  label: string;
  icon: typeof ImageIcon;
  tipo: TipoCreativo;
  format: ImageFormat;
  slideCount: number;
  lockFormat: boolean;
  eyebrow: string;
  descripcion: string;
}

const TABS: TabConfig[] = [
  {
    id: 'imagen',
    label: 'Imagen',
    icon: ImageIcon,
    tipo: 'imagen_single',
    format: '1:1',
    slideCount: 1,
    lockFormat: false,
    eyebrow: 'Generador de imagen',
    descripcion: 'Crea una imagen unica para feed, story o anuncio.',
  },
  {
    id: 'carrusel',
    label: 'Carrusel',
    icon: Layers,
    tipo: 'carrusel',
    format: '1:1',
    slideCount: 5,
    lockFormat: false,
    eyebrow: 'Generador de carrusel',
    descripcion: 'Genera secuencias de varias slides con narrativa visual coherente.',
  },
  {
    id: 'youtube',
    label: 'Portada YouTube',
    icon: Youtube,
    tipo: 'yt_thumbnail',
    format: 'yt_thumbnail',
    slideCount: 1,
    lockFormat: true,
    eyebrow: 'Generador de portada',
    descripcion: 'Thumbnails 1280x720 optimizadas para CTR en YouTube.',
  },
  {
    id: 'historial',
    label: 'Historial',
    icon: FolderOpen,
    tipo: 'imagen_single',
    format: '1:1',
    slideCount: 1,
    lockFormat: false,
    eyebrow: 'Historial',
    descripcion: 'Todos los creativos generados para este cliente.',
  },
];

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function CreativosView({ userId, perfil, geminiKey }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('imagen');
  const [angulo, setAngulo] = useState<AnguloCreativo>('directo');
  const [images, setImages] = useState<{ base64: string; mimeType: string; modelUsed: string }[]>([]);
  const [imageMode, setImageMode] = useState<ImageMode>('completa');
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Historial state
  const [creativos, setCreativos] = useState<Creativo[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [selectedCreativo, setSelectedCreativo] = useState<Creativo | null>(null);

  const config = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  // Reset preview cuando cambias de tab
  useEffect(() => {
    setImages([]);
    setShowEditor(false);
    setSaved(false);
  }, [activeTab]);

  const loadHistorial = useCallback(async () => {
    if (!userId) return;
    setLoadingHist(true);
    try {
      const list = await fetchCreativos(userId);
      setCreativos(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al cargar historial: ${msg}`);
    } finally {
      setLoadingHist(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistorial();
    }
  }, [activeTab, loadHistorial]);

  const handleImagesGenerated = useCallback(
    (newImages: { base64: string; mimeType: string; modelUsed: string }[], mode: ImageMode) => {
      setImages(newImages);
      setImageMode(mode);
      setSaved(false);
      if (mode === 'fondo') setShowEditor(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!userId || images.length === 0) return;
    setSaving(true);
    try {
      const dims = IMAGE_FORMAT_OPTIONS[config.format];
      const tipoLabel = config.label.toLowerCase();
      const creativo = await saveCreativo({
        usuario_id: userId,
        tipo: config.tipo,
        angulo,
        texto_principal: '',
        titulo: `${config.label} ${angulo}`,
        descripcion: '',
        cta_texto: '',
        nombre: `${config.label} ${angulo} — ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`,
        estado: 'generado',
        prompt_imagen: `Generated as ${tipoLabel} with Nano Banana cascade`,
      });

      if (!creativo) throw new Error('No se pudo guardar el creativo');

      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadCreativeImage(
          userId,
          creativo.id,
          i + 1,
          images[i].base64,
          images[i].mimeType,
        );
        if (uploaded) {
          await saveCreativoAsset({
            creativo_id: creativo.id,
            usuario_id: userId,
            slide_orden: i + 1,
            storage_path: uploaded.storagePath,
            public_url: uploaded.publicUrl,
            width: dims.width,
            height: dims.height,
            mime_type: images[i].mimeType,
          });
        }
      }

      toast.success(`${config.label} guardado correctamente`);
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [userId, images, angulo, config]);

  const HeaderIcon = config.icon;

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5A623]/15 flex items-center justify-center">
          <HeaderIcon className="w-5 h-5 text-[#F5A623]" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-0.5">
            {config.eyebrow}
          </p>
          <h2 className="text-xl font-light text-[#FFFFFF]">
            Creativos{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
              con IA
            </span>
          </h2>
          <p className="text-[11px] text-[#FFFFFF]/40 mt-1">{config.descripcion}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[rgba(245,166,35,0.15)] pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/40'
                  : 'bg-transparent text-[#FFFFFF]/50 border-[#FFFFFF]/8 hover:border-[#F5A623]/25 hover:text-[#FFFFFF]/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* HISTORIAL */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          {selectedCreativo ? (
            <CreativoDetalle
              creativo={selectedCreativo}
              userId={userId}
              onBack={() => setSelectedCreativo(null)}
              onDeleted={() => {
                setSelectedCreativo(null);
                loadHistorial();
              }}
            />
          ) : loadingHist ? (
            <div className="flex items-center justify-center py-16 text-[#FFFFFF]/40 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...
            </div>
          ) : (
            <CreativoGallery
              creativos={creativos}
              userId={userId}
              onSelect={(c) => setSelectedCreativo(c)}
              onRefresh={loadHistorial}
            />
          )}
        </div>
      )}

      {/* GENERADORES (imagen / carrusel / youtube) */}
      {activeTab !== 'historial' && (
        <>
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

          {/* Generador (re-monta segun tab gracias al key) */}
          <div className="card-panel p-5">
            <ImagenGenerator
              key={activeTab}
              angulo={angulo}
              perfil={perfil ?? {}}
              geminiKey={geminiKey}
              initialFormat={config.format}
              initialSlideCount={config.slideCount}
              lockFormat={config.lockFormat}
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
                  <><Save className="w-4 h-4" /> Guardar {config.label.toLowerCase()}</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
