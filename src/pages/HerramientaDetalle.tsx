/**
 * HerramientaDetalle.tsx — Pantalla genérica de herramienta IA
 * Cada herramienta del Grupo A-E usa este componente
 */
import React, { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Copy, CheckCircle2, Save, RotateCcw } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { ProfileV2 } from '../lib/supabase';
import { getHerramienta, type CampoInput } from '../lib/herramientas';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import CustomSelect from '../components/CustomSelect';

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  herramientaId: string;
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  onVolver: () => void;
}

export default function HerramientaDetalle({ herramientaId, userId, perfil, geminiKey, onVolver }: Props) {
  const herramienta = getHerramienta(herramientaId);

  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    if (!herramienta) return {};
    const inicial: Record<string, string> = {};
    herramienta.inputs.forEach((campo) => {
      if (campo.precargar && perfil) {
        const valor = perfil[campo.precargar as keyof ProfileV2];
        inicial[campo.id] = typeof valor === 'string' ? valor : '';
      } else {
        inicial[campo.id] = campo.opciones?.[0] ?? '';
      }
    });
    return inicial;
  });

  const [output, setOutput] = useState<string>('');
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [outputGuardado, setOutputGuardado] = useState(false);

  if (!herramienta) {
    return (
      <div className="text-[#F0EAD8]/60 text-sm p-6">
        Herramienta no encontrada: {herramientaId}
      </div>
    );
  }

  const setInput = (id: string, valor: string) => {
    setInputs((prev) => ({ ...prev, [id]: valor }));
  };

  const camposCompletos = herramienta.inputs
    .filter((c) => c.required)
    .every((c) => inputs[c.id]?.trim());

  // ─── Generar output con Gemini ─────────────────────────────────────────────
  const handleGenerar = useCallback(async () => {
    if (!camposCompletos) {
      toast.error('Completá todos los campos requeridos.');
      return;
    }
    if (!geminiKey) {
      toast.error('Falta la GEMINI_API_KEY.');
      return;
    }

    setGenerando(true);
    setOutput('');

    try {
      const prompt = herramienta.promptTemplate(inputs, perfil ?? {});

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      // Streaming
      let textoCompleto = '';
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      for await (const chunk of stream) {
        textoCompleto += chunk.text ?? '';
        setOutput(textoCompleto);
      }

      setOutputGuardado(false);
    } catch {
      toast.error('Error al generar. Intentá de nuevo.');
    } finally {
      setGenerando(false);
    }
  }, [camposCompletos, geminiKey, herramienta, inputs, perfil]);

  // ─── Guardar en Supabase ───────────────────────────────────────────────────
  const handleGuardar = useCallback(async () => {
    if (!output || !userId) return;
    setGuardando(true);
    try {
      const outputData = { texto: output, inputs, generado_en: new Date().toISOString() };

      if (isSupabaseReady() && supabase) {
        await supabase.from('herramientas_outputs').upsert(
          {
            usuario_id: userId,
            herramienta_id: herramientaId,
            output: outputData,
            version: 1,
          },
          { onConflict: 'usuario_id,herramienta_id' },
        );
      }

      // Siempre guardamos en localStorage como backup
      const key = `tcd_herramienta_${herramientaId}`;
      localStorage.setItem(key, JSON.stringify(outputData));

      setOutputGuardado(true);
      toast.success('Output guardado en tu perfil.');
    } catch {
      toast.error('Error al guardar. El output sigue disponible.');
    } finally {
      setGuardando(false);
    }
  }, [output, userId, herramientaId, inputs]);

  const handleCopiar = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [output]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* Breadcrumb */}
      <button
        onClick={onVolver}
        className="flex items-center gap-2 text-sm text-[#F0EAD8]/60 hover:text-[#F0EAD8] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la Biblioteca
      </button>

      {/* Cabecera */}
      <div className="card-panel p-5 rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{herramienta.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#C8893A]/10 text-[#F0EAD8]/60 px-2 py-0.5 rounded font-mono">
                {herramienta.id}
              </span>
              <span className="text-[10px] text-[#F0EAD8]/40">Grupo {herramienta.grupo}</span>
            </div>
            <h1 className="text-lg font-light text-[#F0EAD8] mt-0.5">{herramienta.titulo}</h1>
            <p className="text-sm text-[#F0EAD8]/60">{herramienta.descripcion}</p>
          </div>
        </div>

        {/* Indicador de datos precargados */}
        {herramienta.inputs.some((c) => c.precargar && perfil?.[c.precargar as keyof ProfileV2]) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#2DD4A0] bg-[#2DD4A0]/10 border border-[#2DD4A0]/20 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Campos pre-completados con tu perfil — revisá y ajustá si es necesario
          </div>
        )}
      </div>

      {/* Formulario de inputs */}
      <div className="card-panel p-5 rounded-2xl space-y-5">
        <h2 className="text-sm font-medium text-[#F0EAD8]/80">Inputs</h2>

        {herramienta.inputs.map((campo: CampoInput) => (
          <div key={campo.id}>
            <label className="block text-xs font-medium text-[#F0EAD8]/60 mb-1.5 uppercase tracking-wider">
              {campo.label}
              {campo.required && <span className="text-red-400 ml-1">*</span>}
              {campo.precargar && inputs[campo.id] && (
                <span className="ml-2 text-[10px] text-[#2DD4A0] normal-case tracking-normal">
                  (precargado de tu perfil)
                </span>
              )}
            </label>

            {campo.tipo === 'textarea' ? (
              <textarea
                rows={3}
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl p-3 text-[#F0EAD8] text-sm focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/30 resize-none transition-all placeholder-[#F0EAD8]/30"
                placeholder={campo.placeholder}
                value={inputs[campo.id] ?? ''}
                onChange={(e) => setInput(campo.id, e.target.value)}
              />
            ) : campo.tipo === 'select' ? (
              <CustomSelect
                value={inputs[campo.id] ?? ''}
                onChange={(val) => setInput(campo.id, val)}
                options={(campo.opciones ?? []).map((op) => ({ value: op, label: op }))}
              />
            ) : campo.tipo === 'number' ? (
              <input
                type="number"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl p-3 text-[#F0EAD8] text-sm focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/30 transition-all"
                placeholder={campo.placeholder}
                value={inputs[campo.id] ?? ''}
                onChange={(e) => setInput(campo.id, e.target.value)}
              />
            ) : (
              <input
                type="text"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl p-3 text-[#F0EAD8] text-sm focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/30 transition-all"
                placeholder={campo.placeholder}
                value={inputs[campo.id] ?? ''}
                onChange={(e) => setInput(campo.id, e.target.value)}
              />
            )}
          </div>
        ))}

        <button
          onClick={handleGenerar}
          disabled={generando || !camposCompletos}
          className="w-full py-3.5 rounded-xl bg-[#C8893A] hover:bg-[#D9A04E] disabled:opacity-50 text-[#0E0B07] font-medium transition-all flex justify-center items-center gap-2"
        >
          {generando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
          ) : (
            <><span>✨</span> Generar {herramienta.outputLabel}</>
          )}
        </button>
      </div>

      {/* Output */}
      {(output || generando) && (
        <div className="card-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#F0EAD8]/80">{herramienta.outputLabel}</h2>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button
                    onClick={handleCopiar}
                    className="flex items-center gap-1.5 text-xs text-[#F0EAD8]/60 hover:text-[#F0EAD8] bg-[#C8893A]/5 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2DD4A0]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={guardando || outputGuardado}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-colors ${
                      outputGuardado
                        ? 'text-[#2DD4A0] bg-[#2DD4A0]/10 border border-[#2DD4A0]/20'
                        : 'text-[#F0EAD8]/60 hover:text-[#F0EAD8] bg-[#C8893A]/5'
                    }`}
                  >
                    {guardando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : outputGuardado ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {outputGuardado ? 'Guardado' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => { setOutput(''); setOutputGuardado(false); }}
                    className="flex items-center gap-1.5 text-xs text-[#F0EAD8]/40 hover:text-[#F0EAD8] bg-[#C8893A]/3 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Regenerar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-black/20 rounded-xl p-4 min-h-24">
            {output ? (
              <div className="prose prose-invert prose-sm max-w-none text-[#F0EAD8]/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-[#F0EAD8] [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-1 [&_p]:my-2 [&_hr]:border-[rgba(200,137,58,0.2)]">
                <Markdown>{output}</Markdown>
              </div>
            ) : (
              <span className="text-[#F0EAD8]/40 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Generando...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
