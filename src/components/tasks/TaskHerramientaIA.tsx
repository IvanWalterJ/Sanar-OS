/**
 * TaskHerramientaIA.tsx
 * Inline herramienta IA component for the roadmap task flow.
 * Shows form fields → generates with AI (or saves directly if usa_ia=false) → user edits → saves to ADN.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Loader2, RotateCcw, CheckCircle2, Edit3, Sparkles, Save,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import type { ProfileV2 } from '../../lib/supabase';
import { getHerramienta, type CampoInput, type Herramienta } from '../../lib/herramientas';
import type { RoadmapMeta } from '../../lib/roadmapSeed';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

interface TaskHerramientaIAProps {
  meta: RoadmapMeta;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  outputExistente?: string;
  onSaveADN: (outputTexto: string) => void;
  isCompleted: boolean;
}

type Modo = 'form' | 'generando' | 'revision' | 'edicion' | 'guardado';

export default function TaskHerramientaIA({
  meta, perfil, geminiKey, outputExistente, onSaveADN, isCompleted,
}: TaskHerramientaIAProps) {
  const herramienta = meta.herramienta_id ? getHerramienta(meta.herramienta_id) : null;
  const inputs = herramienta?.inputs ?? [];
  const usaIA = herramienta ? (herramienta as any).usa_ia !== false : true;

  const [modo, setModo] = useState<Modo>(
    isCompleted && outputExistente ? 'guardado' : 'form'
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState(outputExistente || '');
  const [editOutput, setEditOutput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const outputRef = useRef<HTMLDivElement>(null);

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ─── Generate with AI ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!herramienta || !geminiKey) return;

    if (usaIA) {
      setModo('generando');
      try {
        const prompt = herramienta.promptTemplate(formValues, perfil ?? {});
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        const text = response.text ?? '';
        setOutput(text);
        setModo('revision');
        setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        toast.error('Error al generar. Intentá de nuevo.');
        setModo('form');
      }
    } else {
      // No AI — just save the form values as the output
      const combined = inputs.map(inp => {
        const val = formValues[inp.id] || '';
        return `## ${inp.label}\n${val}`;
      }).join('\n\n');
      setOutput(combined);
      setModo('revision');
    }
  };

  // ─── Save to ADN ──────────────────────────────────────────────────────────
  const handleSave = () => {
    const finalOutput = modo === 'edicion' ? editOutput : output;
    setOutput(finalOutput);
    setModo('guardado');
    onSaveADN(finalOutput);
    toast.success('Guardado en tu ADN');
  };

  // ─── Regenerate ───────────────────────────────────────────────────────────
  const handleRegenerate = () => {
    setModo('form');
    setOutput('');
  };

  // ─── Render field ─────────────────────────────────────────────────────────
  const renderField = (campo: CampoInput) => {
    const value = formValues[campo.id] || '';

    if (campo.tipo === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={e => handleFieldChange(campo.id, e.target.value)}
          placeholder={campo.placeholder}
          rows={4}
          className="w-full input-field resize-y min-h-[100px]"
        />
      );
    }

    if (campo.tipo === 'select' && campo.opciones) {
      return (
        <select
          value={value}
          onChange={e => handleFieldChange(campo.id, e.target.value)}
          className="w-full custom-select"
        >
          <option value="">Seleccioná...</option>
          {campo.opciones!.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={campo.tipo === 'number' ? 'number' : 'text'}
        value={value}
        onChange={e => handleFieldChange(campo.id, e.target.value)}
        placeholder={campo.placeholder}
        className="w-full input-field"
      />
    );
  };

  // Check if form has enough data to submit
  const requiredFieldsFilled = inputs.length === 0 || inputs.some(inp => (formValues[inp.id] || '').trim().length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#2DD4A0]/15 text-[#2DD4A0] border border-[#2DD4A0]/25 tracking-wider">
            HERRAMIENTA {usaIA ? 'IA' : ''}
          </span>
          {modo === 'guardado' && (
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#2DD4A0]/15 text-[#2DD4A0] border border-[#2DD4A0]/25 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Guardado en ADN
            </span>
          )}
        </div>
        <h3 className="text-lg font-medium text-[#F5F0E1]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {meta.titulo}
        </h3>
        <p className="text-sm text-[#F5F0E1]/60 mt-1">{meta.descripcion}</p>
      </div>

      {/* ─── FORM MODE ─────────────────────────────────────────────────────── */}
      {modo === 'form' && (
        <div className="space-y-5">
          {inputs.length > 0 ? (
            <>
              {inputs.length <= 5 ? (
                // Simple form — all fields visible
                inputs.map(campo => (
                  <div key={campo.id}>
                    <label className="block text-xs text-[#F5F0E1]/60 mb-1.5 font-medium">
                      {campo.label}
                    </label>
                    {renderField(campo)}
                  </div>
                ))
              ) : (
                // Complex form — collapsible sections (group by 3s)
                Array.from({ length: Math.ceil(inputs.length / 3) }).map((_, groupIdx) => {
                  const groupInputs = inputs.slice(groupIdx * 3, (groupIdx + 1) * 3);
                  const isExpanded = expandedSections.has(groupIdx);
                  return (
                    <div key={groupIdx} className="card-panel border border-[rgba(212,162,78,0.15)]">
                      <button
                        onClick={() => toggleSection(groupIdx)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className="text-sm font-medium text-[#F5F0E1]/80">
                          {groupInputs[0]?.label?.split(' ').slice(0, 3).join(' ')}...
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[#F5F0E1]/40" />
                          : <ChevronDown className="w-4 h-4 text-[#F5F0E1]/40" />
                        }
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {groupInputs.map(campo => (
                            <div key={campo.id}>
                              <label className="block text-xs text-[#F5F0E1]/60 mb-1.5 font-medium">
                                {campo.label}
                              </label>
                              {renderField(campo)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            // No inputs — herramienta uses previous ADN data
            <div className="card-panel p-5 border border-[#D4A24E]/15 bg-[#D4A24E]/[0.03]">
              <p className="text-sm text-[#F5F0E1]/70">
                Esta herramienta usa los datos que ya completaste en pasos anteriores para generar el resultado.
              </p>
              {meta.requiere_datos_de && meta.requiere_datos_de.length > 0 && (
                <p className="text-xs text-[#F5F0E1]/40 mt-2">
                  Datos de: {meta.requiere_datos_de.join(', ')}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!requiredFieldsFilled}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {usaIA ? (
              <>
                <Sparkles className="w-4 h-4" />
                Generar con IA
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── GENERATING ────────────────────────────────────────────────────── */}
      {modo === 'generando' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4A24E] animate-spin mb-4" />
          <p className="text-sm text-[#F5F0E1]/60">Generando con IA...</p>
          <p className="text-xs text-[#F5F0E1]/30 mt-1">Esto puede tomar unos segundos</p>
        </div>
      )}

      {/* ─── REVIEW MODE ───────────────────────────────────────────────────── */}
      {modo === 'revision' && (
        <div className="space-y-5" ref={outputRef}>
          <div className="card-panel p-5 border border-[rgba(212,162,78,0.2)]">
            <p className="text-[10px] text-[#D4A24E] uppercase tracking-widest font-bold mb-3">
              {usaIA ? 'Resultado generado' : 'Tu contenido'}
            </p>
            <div className="text-sm text-[#F5F0E1]/90 leading-relaxed prose prose-invert max-w-none prose-a:text-[#D4A24E]">
              <Markdown>{output}</Markdown>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setEditOutput(output); setModo('edicion'); }}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Editar
            </button>
            {usaIA && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#F5F0E1]/50 hover:text-[#F5F0E1] transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Rehacer
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Guardar en mi ADN
            </button>
          </div>
        </div>
      )}

      {/* ─── EDIT MODE ─────────────────────────────────────────────────────── */}
      {modo === 'edicion' && (
        <div className="space-y-5">
          <textarea
            value={editOutput}
            onChange={e => setEditOutput(e.target.value)}
            rows={15}
            className="w-full input-field resize-y min-h-[200px] font-mono text-sm"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setModo('revision')}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              Cancelar edición
            </button>
            <button
              onClick={handleSave}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Guardar en mi ADN
            </button>
          </div>
        </div>
      )}

      {/* ─── SAVED MODE ────────────────────────────────────────────────────── */}
      {modo === 'guardado' && (
        <div className="space-y-5">
          <div className="card-panel p-5 border border-[#2DD4A0]/20 bg-[#2DD4A0]/[0.03]">
            <p className="text-[10px] text-[#2DD4A0] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Guardado en tu ADN
            </p>
            <div className="text-sm text-[#F5F0E1]/80 leading-relaxed prose prose-invert max-w-none prose-a:text-[#D4A24E]">
              <Markdown>{output}</Markdown>
            </div>
          </div>

          <button
            onClick={() => { setEditOutput(output); setModo('edicion'); }}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" /> Editar resultado
          </button>
        </div>
      )}
    </div>
  );
}
