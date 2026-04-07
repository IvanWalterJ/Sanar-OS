/**
 * TaskWorkModal.tsx
 * Modal de trabajo de tarea — integra la herramienta IA directamente,
 * con flujo Aprobar / Rehacer / Editar y exportación a PDF.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Loader2, RotateCcw, CheckCircle2, Edit3, Download,
  Copy, Star, Clock, ChevronDown, ChevronUp, FileText, Sparkles,
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { supabase, isSupabaseReady } from '../lib/supabase';
import type { ProfileV2 } from '../lib/supabase';
import { getHerramienta, type CampoInput } from '../lib/herramientas';
import { toast } from 'sonner';
import type { RoadmapMeta } from '../lib/roadmapSeed';
import Markdown from 'react-markdown';

type EstadoPilar = 'completado' | 'en_progreso' | 'bloqueado';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TareaConContexto extends RoadmapMeta {
  pilarNumero: number;
  pilarTitulo: string;
}

interface Props {
  tarea: TareaConContexto;
  pilarEstado: EstadoPilar;
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  outputExistente?: string;
  onClose: () => void;
  onApprove: (outputTexto: string) => void;
}

type Modo = 'form' | 'generando' | 'revision' | 'edicion' | 'aprobado';

// ─── Helper: descargar PDF ────────────────────────────────────────────────────

async function descargarPDF(titulo: string, texto: string, nombreUsuario: string) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const margenIzq = 20;
  const margenDer = 190;
  const anchoTexto = margenDer - margenIzq;
  let y = 20;

  // ── Header ──
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 140);
  doc.text('Tu Clínica Digital — Método CLÍNICA', margenIzq, y);
  doc.text(new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }), margenDer, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(60, 60, 80);
  doc.line(margenIzq, y, margenDer, y);
  y += 10;

  // ── Título ──
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 50);
  const tituloLines = doc.splitTextToSize(titulo, anchoTexto) as string[];
  doc.text(tituloLines, margenIzq, y);
  y += tituloLines.length * 8 + 4;

  // ── Usuario ──
  if (nombreUsuario) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    doc.text(`Profesional: ${nombreUsuario}`, margenIzq, y);
    y += 8;
  }

  doc.setDrawColor(200, 200, 215);
  doc.line(margenIzq, y, margenDer, y);
  y += 10;

  // ── Contenido ──
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 60);

  const parrafos = texto.split('\n');
  for (const parrafo of parrafos) {
    if (parrafo.startsWith('##')) {
      // Encabezado de sección
      y += 3;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 100);
      const lines = doc.splitTextToSize(parrafo.replace(/^#+\s*/, ''), anchoTexto) as string[];
      doc.text(lines, margenIzq, y);
      y += lines.length * 6 + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 60);
    } else if (parrafo.startsWith('**') && parrafo.endsWith('**')) {
      doc.setFont('helvetica', 'bold');
      const lines = doc.splitTextToSize(parrafo.replace(/\*\*/g, ''), anchoTexto) as string[];
      doc.text(lines, margenIzq, y);
      y += lines.length * 6;
      doc.setFont('helvetica', 'normal');
    } else if (parrafo.trim() === '') {
      y += 3;
    } else {
      const lines = doc.splitTextToSize(parrafo, anchoTexto) as string[];
      doc.text(lines, margenIzq, y);
      y += lines.length * 6;
    }

    // Nueva página si es necesario
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Footer ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 180);
    doc.text(`Página ${i} de ${pageCount}`, margenDer, 287, { align: 'right' });
  }

  doc.save(`${titulo.replace(/[^a-z0-9áéíóúüñ\s]/gi, '').trim()}.pdf`);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TaskWorkModal({
  tarea, pilarEstado, userId, perfil, geminiKey,
  outputExistente, onClose, onApprove,
}: Props) {
  const herramienta = tarea.herramienta_id ? getHerramienta(tarea.herramienta_id) : null;

  const [modo, setModo] = useState<Modo>(() => outputExistente ? 'revision' : 'form');
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

  const [output, setOutput] = useState(outputExistente ?? '');
  const [outputEditado, setOutputEditado] = useState(outputExistente ?? '');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [showInputs, setShowInputs] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll al output cuando aparece
  useEffect(() => {
    if (modo === 'revision' || modo === 'generando') {
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }, [modo]);

  const camposCompletos = herramienta
    ? herramienta.inputs.filter((c) => c.required).every((c) => inputs[c.id]?.trim())
    : true;

  // ── Generar con Gemini ──────────────────────────────────────────────────────
  const handleGenerar = useCallback(async () => {
    if (!camposCompletos) { toast.error('Completá todos los campos requeridos.'); return; }
    if (!geminiKey) { toast.error('Falta la GEMINI_API_KEY.'); return; }
    if (!herramienta) return;

    setModo('generando');
    setOutput('');

    try {
      const prompt = herramienta.promptTemplate(inputs, perfil ?? {});
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      let textoCompleto = '';
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      for await (const chunk of stream) {
        textoCompleto += chunk.text ?? '';
        setOutput(textoCompleto);
      }

      setOutputEditado(textoCompleto);
      setModo('revision');
      setShowInputs(false);
    } catch {
      toast.error('Error al generar. Intentá de nuevo.');
      setModo('form');
    }
  }, [camposCompletos, geminiKey, herramienta, inputs, perfil]);

  // ── Aprobar y guardar ───────────────────────────────────────────────────────
  const handleAprobar = useCallback(async () => {
    const textoFinal = modo === 'edicion' ? outputEditado : output;
    if (!textoFinal) return;

    setGuardando(true);
    try {
      const outputData = {
        texto: textoFinal,
        inputs,
        aprobado_en: new Date().toISOString(),
      };

      if (isSupabaseReady() && supabase && userId) {
        // Guardar en hoja_de_ruta.output_generado + marcar completada
        await supabase.from('hoja_de_ruta').upsert(
          {
            usuario_id: userId,
            pilar_numero: tarea.pilarNumero,
            meta_codigo: tarea.codigo,
            completada: true,
            es_estrella: tarea.es_estrella,
            output_generado: outputData,
            fecha_completada: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'usuario_id,pilar_numero,meta_codigo' },
        );

        // Backup en herramientas_outputs si tiene herramienta
        if (tarea.herramienta_id) {
          await supabase.from('herramientas_outputs').upsert(
            { usuario_id: userId, herramienta_id: tarea.herramienta_id, output: outputData, version: 1 },
            { onConflict: 'usuario_id,herramienta_id' },
          );
        }
      }

      // Backup localStorage
      if (tarea.herramienta_id) {
        localStorage.setItem(`tcd_herramienta_${tarea.herramienta_id}`, JSON.stringify(outputData));
      }

      setModo('aprobado');
      toast.success('¡Documento aprobado y guardado!');
      onApprove(textoFinal);
    } catch {
      toast.error('Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [modo, output, outputEditado, inputs, userId, tarea, onApprove]);

  const handleCopiar = useCallback(() => {
    const texto = modo === 'edicion' ? outputEditado : output;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [modo, output, outputEditado]);

  const handleRehacer = () => {
    setOutput('');
    setOutputEditado('');
    setModo('form');
    setShowInputs(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 mb-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-[rgba(212,162,78,0.1)]">
          <div className="flex-1 pr-4">
            <p className="text-[10px] text-[#D4A24E] uppercase tracking-widest font-bold mb-1">
              Pilar {tarea.pilarNumero} — {tarea.pilarTitulo}
            </p>
            <h2 className="text-lg font-semibold text-[#F5F0E1] leading-snug">{tarea.titulo}</h2>
            <p className="text-xs text-[#F5F0E1]/60 mt-1 leading-relaxed">{tarea.descripcion}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="flex items-center gap-1 text-[10px] text-[#F5F0E1]/40">
                <Clock className="w-3 h-3" /> {tarea.tiempo_estimado}
              </span>
              {tarea.es_estrella && (
                <span className="flex items-center gap-1 text-[10px] text-[#D4A24E] bg-[#D4A24E]/10 border border-[#D4A24E]/20 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-[#D4A24E]" /> Tarea estrella
                </span>
              )}
              {herramienta && (
                <span className="text-[10px] text-[#D4A24E] bg-[#D4A24E]/10 border border-[#D4A24E]/20 px-2 py-0.5 rounded-full font-mono">
                  {herramienta.id} — {herramienta.titulo}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-[#F5F0E1]/40 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">

          {/* Sin herramienta: completar manualmente */}
          {!herramienta && (
            <div className="py-8 text-center space-y-4">
              <FileText className="w-10 h-10 text-[#F5F0E1]/30 mx-auto" />
              <p className="text-sm text-[#F5F0E1]/80">Esta tarea no tiene herramienta IA asignada.</p>
              <p className="text-xs text-[#F5F0E1]/40">Completá la actividad según las instrucciones y marcá la tarea como lista desde la Hoja de Ruta.</p>
            </div>
          )}

          {/* Con herramienta: form + output */}
          {herramienta && (
            <>
              {/* Toggle inputs */}
              {(modo === 'revision' || modo === 'edicion' || modo === 'aprobado') && (
                <button
                  onClick={() => setShowInputs((v) => !v)}
                  className="flex items-center gap-2 text-xs text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors"
                >
                  {showInputs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showInputs ? 'Ocultar inputs' : 'Modificar inputs'}
                </button>
              )}

              {/* Formulario de inputs */}
              {showInputs && modo !== 'aprobado' && (
                <div className="space-y-4">
                  {herramienta.inputs.map((campo: CampoInput) => (
                    <div key={campo.id}>
                      <label className="block text-xs font-medium text-[#F5F0E1]/60 mb-1.5 uppercase tracking-wider">
                        {campo.label}
                        {campo.required && <span className="text-[#E85555] ml-1">*</span>}
                        {campo.precargar && inputs[campo.id] && (
                          <span className="ml-2 text-[10px] text-[#2DD4A0] normal-case tracking-normal">(de tu perfil)</span>
                        )}
                      </label>
                      {campo.tipo === 'textarea' ? (
                        <textarea
                          rows={3}
                          className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-xl p-3 text-[#F5F0E1] text-sm focus:border-[#D4A24E]/50 resize-none transition-all placeholder-[#F5F0E1]/30 outline-none"
                          placeholder={campo.placeholder}
                          value={inputs[campo.id] ?? ''}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [campo.id]: e.target.value }))}
                        />
                      ) : campo.tipo === 'select' ? (
                        <CustomSelect
                          value={inputs[campo.id] ?? ''}
                          onChange={(val) => setInputs((prev) => ({ ...prev, [campo.id]: val }))}
                          options={(campo.opciones ?? []).map((op) => ({ value: op, label: op }))}
                        />
                      ) : (
                        <input
                          type={campo.tipo === 'number' ? 'number' : 'text'}
                          className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-xl p-3 text-[#F5F0E1] text-sm focus:border-[#D4A24E]/50 transition-all placeholder-[#F5F0E1]/30 outline-none"
                          placeholder={campo.placeholder}
                          value={inputs[campo.id] ?? ''}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [campo.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleGenerar}
                    disabled={modo === 'generando' || !camposCompletos}
                    className="w-full py-3 rounded-xl bg-[#D4A24E] hover:bg-[#E2B865] disabled:opacity-50 text-[#0A0804] font-medium transition-all flex justify-center items-center gap-2"
                  >
                    {modo === 'generando'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                      : <><Sparkles className="w-4 h-4" /> Generar {herramienta.outputLabel}</>}
                  </button>
                </div>
              )}

              {/* Output */}
              {(modo === 'generando' || modo === 'revision' || modo === 'edicion' || modo === 'aprobado') && (
                <div ref={outputRef} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F5F0E1]/60 uppercase tracking-widest">
                      {modo === 'aprobado' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[#2DD4A0]" /> Documento aprobado</span> : herramienta.outputLabel}
                    </h3>
                    {(modo === 'revision' || modo === 'edicion' || modo === 'aprobado') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopiar}
                          className="flex items-center gap-1.5 text-xs text-[#F5F0E1]/60 hover:text-[#F5F0E1] bg-[#D4A24E]/5 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2DD4A0]" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiado ? 'Copiado' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => descargarPDF(tarea.titulo, modo === 'edicion' ? outputEditado : output, perfil?.nombre ?? '')}
                          className="flex items-center gap-1.5 text-xs text-[#F5F0E1]/60 hover:text-[#F5F0E1] bg-[#D4A24E]/5 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Modo edición */}
                  {modo === 'edicion' ? (
                    <textarea
                      className="w-full bg-black/20 border border-[#D4A24E]/40 rounded-xl p-4 text-sm text-[#F5F0E1]/90 leading-relaxed font-mono resize-none outline-none focus:border-[#D4A24E]/60 transition-colors"
                      rows={16}
                      value={outputEditado}
                      onChange={(e) => setOutputEditado(e.target.value)}
                    />
                  ) : (
                    <div className={`bg-black/20 rounded-xl p-4 min-h-32 max-h-96 overflow-y-auto ${modo === 'aprobado' ? 'border border-[#2DD4A0]/20' : ''}`}>
                      {output ? (
                        <div className="prose prose-invert prose-sm max-w-none text-[#F5F0E1]/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-[#F5F0E1] [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-1 [&_p]:my-2 [&_hr]:border-[rgba(212,162,78,0.2)]">
                          <Markdown>{output}</Markdown>
                        </div>
                      ) : (
                        <span className="text-[#F5F0E1]/40 flex items-center gap-2 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" /> Generando...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer con acciones ── */}
        <div className="flex items-center justify-between p-6 border-t border-[rgba(212,162,78,0.1)] gap-3">
          {modo === 'aprobado' ? (
            <>
              <p className="text-xs text-[#2DD4A0] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tarea completada y guardada
              </p>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[#D4A24E]/10 hover:bg-[#D4A24E]/15 text-[#F5F0E1] text-sm font-medium transition-colors">
                Cerrar
              </button>
            </>
          ) : modo === 'revision' ? (
            <>
              <button onClick={handleRehacer} className="flex items-center gap-2 text-sm text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors">
                <RotateCcw className="w-4 h-4" /> Rehacer
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setOutputEditado(output); setModo('edicion'); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4A24E]/5 hover:bg-[#D4A24E]/10 text-[#F5F0E1] text-sm transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2DD4A0] hover:bg-[#2DD4A0]/80 disabled:opacity-50 text-[#0A0804] text-sm font-bold transition-colors shadow-lg shadow-[#2DD4A0]/20"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar
                </button>
              </div>
            </>
          ) : modo === 'edicion' ? (
            <>
              <button onClick={() => setModo('revision')} className="text-sm text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors">
                Cancelar edición
              </button>
              <button
                onClick={handleAprobar}
                disabled={guardando || !outputEditado.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2DD4A0] hover:bg-[#2DD4A0]/80 disabled:opacity-50 text-[#0A0804] text-sm font-bold transition-colors shadow-lg shadow-[#2DD4A0]/20"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Aprobar y guardar
              </button>
            </>
          ) : (
            <button onClick={onClose} className="text-sm text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
