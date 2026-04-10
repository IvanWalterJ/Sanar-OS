import React, { useState } from 'react';
import { ArrowLeft, Download, Trash2, ChevronLeft, ChevronRight, Copy, Check, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ANGULO_LABELS, TIPO_LABELS } from '../../lib/campanasTypes';
import { deleteCreativo, downloadImage, updateCreativo } from '../../lib/campanasStorage';
import type { Creativo } from '../../lib/campanasTypes';

interface Props {
  creativo: Creativo;
  userId?: string;
  onBack: () => void;
  onDeleted: () => void;
}

export default function CreativoDetalle({ creativo, userId, onBack, onDeleted }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const assets = creativo.assets ?? [];
  const isCarousel = assets.length > 1;

  const handleDelete = async () => {
    if (!userId || !window.confirm('Eliminar este creativo y todas sus imagenes?')) return;
    await deleteCreativo(creativo.id, userId);
    toast.success('Creativo eliminado');
    onDeleted();
  };

  const handleDownload = () => {
    const asset = assets[activeSlide];
    if (asset) {
      downloadImage(asset.public_url, `${creativo.nombre ?? 'creativo'}-slide${activeSlide + 1}.png`);
    }
  };

  const handleDownloadAll = () => {
    for (const asset of assets) {
      downloadImage(asset.public_url, `${creativo.nombre ?? 'creativo'}-slide${asset.slide_orden}.png`);
    }
    toast.success(`${assets.length} imagenes descargadas`);
  };

  const handleCopyCopy = () => {
    const text = `TEXTO PRINCIPAL:\n${creativo.texto_principal}\n\nTITULO:\n${creativo.titulo}\n\nDESCRIPCION:\n${creativo.descripcion ?? ''}\n\nCTA:\n${creativo.cta_texto ?? ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (estado: 'aprobado' | 'descartado') => {
    await updateCreativo(creativo.id, { estado });
    toast.success(`Creativo marcado como ${estado}`);
  };

  const prev = () => setActiveSlide((i) => (i > 0 ? i - 1 : assets.length - 1));
  const next = () => setActiveSlide((i) => (i < assets.length - 1 ? i + 1 : 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#FFFFFF]">{creativo.nombre ?? creativo.titulo}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5A623]/10 text-[#F5A623]">
                {ANGULO_LABELS[creativo.angulo].titulo}
              </span>
              <span className="text-xs text-[#FFFFFF]/30">{TIPO_LABELS[creativo.tipo]}</span>
              <span className="text-xs text-[#FFFFFF]/20">
                {new Date(creativo.created_at).toLocaleDateString('es')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange('aprobado')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/15 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
          </button>
          <button
            onClick={() => handleStatusChange('descartado')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/15 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Descartar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/5 hover:bg-[#EF4444]/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image viewer */}
        <div className="space-y-3">
          {assets.length > 0 ? (
            <>
              <div className="relative rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)]">
                <img
                  src={assets[activeSlide]?.public_url}
                  alt={`Slide ${activeSlide + 1}`}
                  className="w-full aspect-square object-cover"
                />

                {isCarousel && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#FFFFFF] hover:bg-black/80 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#FFFFFF] hover:bg-black/80 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {assets.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlide(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            activeSlide === idx ? 'bg-[#F5A623] w-4' : 'bg-[#FFFFFF]/40'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails for carousel */}
              {isCarousel && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {assets.map((asset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeSlide === idx ? 'border-[#F5A623]' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={asset.public_url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Download buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/15 transition-colors border border-[#F5A623]/20"
                >
                  <Download className="w-4 h-4" />
                  {isCarousel ? `Descargar Slide ${activeSlide + 1}` : 'Descargar Imagen'}
                </button>
                {isCarousel && (
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#FFFFFF]/60 bg-[#FFFFFF]/5 hover:bg-[#FFFFFF]/10 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Todas ({assets.length})
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-square bg-[#141414] rounded-xl border border-[rgba(245,166,35,0.1)] flex items-center justify-center">
              <p className="text-sm text-[#FFFFFF]/20">Sin imagenes</p>
            </div>
          )}
        </div>

        {/* Copy details */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.15)] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[#FFFFFF]">Copy del Anuncio</h3>
              <button
                onClick={handleCopyCopy}
                className="flex items-center gap-1 text-xs text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar todo'}
              </button>
            </div>

            <div>
              <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Texto Principal</label>
              <p className="text-sm text-[#FFFFFF]/80 mt-1 whitespace-pre-line leading-relaxed">
                {creativo.texto_principal}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Titulo</label>
                <p className="text-sm font-medium text-[#FFFFFF] mt-1">{creativo.titulo}</p>
              </div>
              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">CTA</label>
                <p className="text-sm font-medium text-[#F5A623] mt-1">{creativo.cta_texto}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Descripcion</label>
              <p className="text-sm text-[#FFFFFF]/60 mt-1">{creativo.descripcion}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.1)] rounded-xl p-4">
            <h3 className="text-xs font-medium text-[#FFFFFF]/40 mb-3">Metadata</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#FFFFFF]/30">Angulo</span>
                <span className="text-[#FFFFFF]/60">{ANGULO_LABELS[creativo.angulo].titulo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FFFFFF]/30">Tipo</span>
                <span className="text-[#FFFFFF]/60">{TIPO_LABELS[creativo.tipo]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FFFFFF]/30">Estado</span>
                <span className={`font-medium ${
                  creativo.estado === 'aprobado' ? 'text-[#22C55E]' :
                  creativo.estado === 'descartado' ? 'text-[#EF4444]' : 'text-[#F5A623]'
                }`}>
                  {creativo.estado.charAt(0).toUpperCase() + creativo.estado.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FFFFFF]/30">Creado</span>
                <span className="text-[#FFFFFF]/60">
                  {new Date(creativo.created_at).toLocaleString('es')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
