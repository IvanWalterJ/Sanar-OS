/**
 * CreativosView.tsx — Generador de creativos con sub-tabs:
 * Imagen / Carrusel / Portada YouTube / Historial.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ImageIcon, Loader2, CheckCircle2, Sparkles,
  Layers, Youtube, FolderOpen, Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import ImagenGenerator from './ImagenGenerator';
import CreativoGallery from './CreativoGallery';
import CreativoDetalle from './CreativoDetalle';
import ManualMarcaView from './ManualMarcaView';
import {
  saveCreativo,
  updateCreativo,
  uploadCreativeImage,
  upsertCreativoAsset,
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

type SubTab = 'imagen' | 'carrusel' | 'youtube' | 'historial' | 'manual_marca';

interface TabConfig {
  id: SubTab;
  label: string;
  icon: typeof ImageIcon;
  // Los siguientes cuatro campos son del generador de imagenes. La tab
  // 'manual_marca' no invoca al generador, por eso son opcionales.
  tipo?: TipoCreativo;
  format?: ImageFormat;
  slideCount?: number;
  lockFormat?: boolean;
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
  {
    id: 'manual_marca',
    label: 'Manual de marca',
    icon: Palette,
    eyebrow: 'Manual de marca',
    descripcion: 'Paleta, tipografia y reglas que mandan sobre cualquier estilo o referencia al generar imagenes.',
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
  const [, setImageMode] = useState<ImageMode>('completa');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentCreativoId, setCurrentCreativoId] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);

  // Perfil local para que el Manual de Marca actualice los prompts del
  // generador sin recargar la pagina. Se resincroniza cuando cambia la prop.
  const [perfilLocal, setPerfilLocal] = useState<Partial<ProfileV2> | undefined>(perfil);
  useEffect(() => { setPerfilLocal(perfil); }, [perfil]);
  const handleManualSaved = useCallback((patch: Partial<ProfileV2>) => {
    setPerfilLocal((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);

  // Historial state
  const [creativos, setCreativos] = useState<Creativo[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [selectedCreativo, setSelectedCreativo] = useState<Creativo | null>(null);

  const config = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  // Reset preview cuando cambias de tab (nuevo tab = nuevo creativo si genera)
  useEffect(() => {
    setImages([]);
    setSaved(false);
    setCurrentCreativoId(null);
  }, [activeTab]);

  // Cambio de angulo dentro de un mismo tab = nuevo creativo en proxima generacion
  useEffect(() => {
    setCurrentCreativoId(null);
    setSaved(false);
  }, [angulo]);

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

  // ─── Auto-guardado en historial ─────────────────────────────────────────
  // Se dispara automaticamente cuando ImagenGenerator entrega nuevas imagenes.
  // Primera llamada: crea el creativo y sube todos los slides.
  // Llamadas posteriores (regen o edit de una slide): upsert en la misma fila.
  const persistCreativo = useCallback(
    async (
      imgs: { base64: string; mimeType: string; modelUsed: string }[],
      prompts?: string[],
    ) => {
      if (!userId || imgs.length === 0) return;
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      setSaving(true);
      const isFirstSave = currentCreativoId === null;
      try {
        const dims = IMAGE_FORMAT_OPTIONS[config.format ?? '1:1'];
        let creativoId = currentCreativoId;

        if (!creativoId) {
          const creativo = await saveCreativo({
            usuario_id: userId,
            tipo: config.tipo ?? 'imagen_single',
            angulo,
            texto_principal: '',
            titulo: `${config.label} ${angulo}`,
            descripcion: '',
            cta_texto: '',
            nombre: `${config.label} ${angulo} — ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`,
            estado: 'generado',
            prompt_imagen: prompts && prompts.length > 0 ? JSON.stringify(prompts) : undefined,
          });
          if (!creativo) throw new Error('No se pudo guardar el creativo');
          creativoId = creativo.id;
          setCurrentCreativoId(creativoId);
        } else if (prompts && prompts.length > 0) {
          // Actualiza los prompts almacenados si cambio la generacion completa
          await updateCreativo(creativoId, { prompt_imagen: JSON.stringify(prompts) });
        }

        for (let i = 0; i < imgs.length; i++) {
          const uploaded = await uploadCreativeImage(
            userId,
            creativoId,
            i + 1,
            imgs[i].base64,
            imgs[i].mimeType,
          );
          if (uploaded) {
            await upsertCreativoAsset({
              creativo_id: creativoId,
              usuario_id: userId,
              slide_orden: i + 1,
              storage_path: uploaded.storagePath,
              public_url: uploaded.publicUrl,
              width: dims.width,
              height: dims.height,
              mime_type: imgs[i].mimeType,
            });
          }
        }

        setSaved(true);
        if (isFirstSave) toast.success(`${config.label} guardado en historial`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(`Error al guardar: ${msg}`);
      } finally {
        setSaving(false);
        saveInFlightRef.current = false;
      }
    },
    [userId, angulo, config, currentCreativoId],
  );

  const handleImagesGenerated = useCallback(
    (
      newImages: { base64: string; mimeType: string; modelUsed: string }[],
      mode: ImageMode,
      prompts?: string[],
    ) => {
      setImages(newImages);
      setImageMode(mode);
      setSaved(false);
      void persistCreativo(newImages, prompts);
    },
    [persistCreativo],
  );

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

      {/* MANUAL DE MARCA */}
      {activeTab === 'manual_marca' && (
        <ManualMarcaView
          userId={userId}
          perfil={perfilLocal}
          onSaved={handleManualSaved}
        />
      )}

      {/* GENERADORES (imagen / carrusel / youtube) */}
      {activeTab !== 'historial' && activeTab !== 'manual_marca' && (
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
              perfil={perfilLocal ?? {}}
              geminiKey={geminiKey}
              initialFormat={config.format ?? '1:1'}
              initialSlideCount={config.slideCount ?? 1}
              lockFormat={config.lockFormat ?? false}
              onImagesGenerated={handleImagesGenerated}
            />
          </div>

          {/* Estado del auto-guardado */}
          {images.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs">
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5A623]" /> <span className="text-[#FFFFFF]/60">Guardando en historial…</span></>
                ) : saved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> <span className="text-[#FFFFFF]/70">Guardado automaticamente en historial</span></>
                ) : (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5A623]" /> <span className="text-[#FFFFFF]/60">Preparando…</span></>
                )}
              </div>
              <button
                onClick={() => setActiveTab('historial')}
                className="text-[11px] font-semibold text-[#F5A623] hover:underline"
              >
                Ver historial →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
