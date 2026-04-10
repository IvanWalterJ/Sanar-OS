import React, { useState, useCallback } from 'react';
import { Loader2, Sparkles, Copy, Check, RotateCcw, Image as ImageIcon, Layers } from 'lucide-react';
import { generateText } from '../../lib/aiProvider';
import { toast } from 'sonner';
import { buildCopyPrompt } from '../../lib/campanasPrompts';
import { ANGULO_LABELS, TIPO_LABELS } from '../../lib/campanasTypes';
import type { AnguloCreativo, TipoCreativo, CopyGenerado, ObjetivoCampana } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  perfil: Partial<ProfileV2>;
  geminiKey?: string;
  objetivo: ObjetivoCampana;
  onCopyGenerated: (copies: CopyGenerado[], angulo: AnguloCreativo, tipo: TipoCreativo) => void;
}

const ANGULOS: AnguloCreativo[] = ['contraintuitivo', 'directo', 'emocional', 'curiosidad', 'autoridad', 'dolor', 'deseo'];

export default function CopyGenerator({ perfil, geminiKey, objetivo, onCopyGenerated }: Props) {
  const [angulo, setAngulo] = useState<AnguloCreativo>('directo');
  const [tipo, setTipo] = useState<TipoCreativo>('imagen_single');
  const [slideCount, setSlideCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [copies, setCopies] = useState<CopyGenerado[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setCopies([]);

    try {
      const prompt = buildCopyPrompt(angulo, tipo, perfil, objetivo, tipo === 'carrusel' ? slideCount : undefined);
      const text = await generateText({ prompt });
      // Extraer JSON del response (puede venir envuelto en ```json ... ```)
      const jsonMatch = text.match(/\[[\s\S]*\]/) ?? text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON del response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const result: CopyGenerado[] = Array.isArray(parsed) ? parsed : [parsed];

      setCopies(result);
      onCopyGenerated(result, angulo, tipo);
      toast.success(`Copy generado (${ANGULO_LABELS[angulo].titulo})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error generando copy: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [angulo, tipo, slideCount, perfil, geminiKey, objetivo, onCopyGenerated]);

  const handleCopyCopy = (idx: number) => {
    const c = copies[idx];
    const text = `TEXTO PRINCIPAL:\n${c.texto_principal}\n\nTITULO:\n${c.titulo}\n\nDESCRIPCION:\n${c.descripcion}\n\nCTA:\n${c.cta_texto}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tipo selector */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-2 font-medium">Tipo de Creativo</label>
        <div className="flex gap-2">
          {(['imagen_single', 'carrusel'] as TipoCreativo[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tipo === t
                  ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                  : 'bg-[#141414] text-[#FFFFFF]/50 border border-[rgba(245,166,35,0.15)] hover:border-[rgba(245,166,35,0.3)]'
              }`}
            >
              {t === 'imagen_single' ? <ImageIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              {TIPO_LABELS[t]}
            </button>
          ))}
          {tipo === 'carrusel' && (
            <div className="flex items-center gap-2 ml-2">
              <label className="text-xs text-[#FFFFFF]/40">Slides:</label>
              <input
                type="number"
                min={3}
                max={10}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-16 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-2 py-1.5 text-sm text-[#FFFFFF] text-center focus:outline-none focus:border-[#F5A623]/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Angulo selector */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-2 font-medium">Angulo de Comunicacion</label>
        <div className="flex flex-wrap gap-2">
          {ANGULOS.map((a) => (
            <button
              key={a}
              onClick={() => setAngulo(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                angulo === a
                  ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                  : 'bg-[#141414] text-[#FFFFFF]/40 border border-[rgba(245,166,35,0.1)] hover:text-[#FFFFFF]/60 hover:border-[rgba(245,166,35,0.25)]'
              }`}
              title={ANGULO_LABELS[a].descripcion}
            >
              {ANGULO_LABELS[a].titulo}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#FFFFFF]/30 mt-1.5">{ANGULO_LABELS[angulo].descripcion}</p>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating}
        className="btn-primary flex items-center gap-2 disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? 'Generando copy...' : copies.length > 0 ? 'Regenerar Copy' : 'Generar Copy'}
      </button>

      {/* Results */}
      {copies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#FFFFFF]/40">
              {copies.length === 1 ? 'Copy generado' : `${copies.length} slides generados`}
              {' '}— {ANGULO_LABELS[angulo].titulo}
            </span>
          </div>

          {copies.map((c, idx) => (
            <div key={idx} className="bg-[#141414] border border-[rgba(245,166,35,0.15)] rounded-xl p-5 space-y-3">
              {copies.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#F5A623]">Slide {idx + 1}</span>
                  <button
                    onClick={() => handleCopyCopy(idx)}
                    className="flex items-center gap-1 text-xs text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedIdx === idx ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Texto Principal</label>
                <p className="text-sm text-[#FFFFFF]/80 mt-1 whitespace-pre-line leading-relaxed">{c.texto_principal}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Titulo</label>
                  <p className="text-sm font-medium text-[#FFFFFF] mt-1">{c.titulo}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">CTA</label>
                  <p className="text-sm font-medium text-[#F5A623] mt-1">{c.cta_texto}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-wider">Descripcion</label>
                <p className="text-sm text-[#FFFFFF]/60 mt-1">{c.descripcion}</p>
              </div>

              {copies.length === 1 && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleCopyCopy(0)}
                    className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
                  >
                    {copiedIdx === 0 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIdx === 0 ? 'Copiado' : 'Copiar todo'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
