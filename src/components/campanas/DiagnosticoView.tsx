/**
 * DiagnosticoView.tsx — Diagnostico de campana con metricas + IA
 */
import React, { useState, useCallback } from 'react';
import { BarChart3, Loader2, Copy, CheckCircle2, Sparkles } from 'lucide-react';
import { streamText } from '../../lib/aiProvider';
import type { ProfileV2 } from '../../lib/supabase';
import type { DiagnosticoInput } from '../../lib/campanasTypes';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface Props {
  perfil: Partial<ProfileV2>;
}

export default function DiagnosticoView({ perfil }: Props) {
  const [form, setForm] = useState<DiagnosticoInput>({
    nombre_campana: '',
    rubro: perfil.especialidad ?? '',
    gasto: 0,
    clicks: 0,
    leads: 0,
    ctr: 0,
    impresiones: 0,
    dias: 0,
    problema_observado: '',
  });
  const [output, setOutput] = useState('');
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const updateField = <K extends keyof DiagnosticoInput>(key: K, value: DiagnosticoInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiagnosticar = useCallback(async () => {
    if (!form.nombre_campana.trim()) {
      toast.error('Ingresa el nombre de la campana.');
      return;
    }
    setGenerando(true);
    setOutput('');

    const cpl = form.leads > 0 ? (form.gasto / form.leads).toFixed(2) : 'N/A';
    const cpc = form.clicks > 0 ? (form.gasto / form.clicks).toFixed(2) : 'N/A';

    const prompt = `Eres un experto en Meta Ads especializado en campanas para profesionales de la salud.

Tu tarea es DIAGNOSTICAR una campana activa y dar recomendaciones accionables.

=== DATOS DEL PROFESIONAL ===
- Nombre: ${perfil.nombre ?? 'Profesional'}
- Especialidad: ${perfil.especialidad ?? form.rubro}
- Nicho: ${perfil.nicho ?? 'salud'}

=== CAMPANA A DIAGNOSTICAR ===
- Nombre: ${form.nombre_campana}
- Rubro: ${form.rubro}

=== METRICAS ACTUALES ===
- Gasto total: $${form.gasto} USD
- Clicks: ${form.clicks}
- Leads / Resultados: ${form.leads}
- CTR: ${form.ctr}%
- Impresiones: ${form.impresiones}
- Dias activa: ${form.dias}

=== METRICAS CALCULADAS ===
- CPC (costo por click): $${cpc}
- CPL (costo por lead): $${cpl}
- Gasto diario promedio: $${form.dias > 0 ? (form.gasto / form.dias).toFixed(2) : 'N/A'}

${form.problema_observado ? `=== PROBLEMA OBSERVADO POR EL USUARIO ===\n${form.problema_observado}` : ''}

=== FORMATO DE RESPUESTA ===
Responde con las siguientes secciones:

## Diagnostico General
(Estado general de la campana: buena, regular, necesita ajustes urgentes)

## Metricas Clave — Analisis
(Analiza cada metrica vs benchmarks del nicho salud. Indica si esta por encima, en rango, o por debajo)

## Problemas Detectados
(Lista especifica de problemas, ordenados por impacto)

## Plan de Accion
(Pasos concretos a seguir, ordenados por prioridad. Ser ESPECIFICO con acciones en Meta Ads Manager)

## Benchmarks de Referencia
(Metricas tipicas para campanas del nicho salud para que el usuario pueda comparar)

Escribe en espanol, tono directo y profesional. Se especifico con los numeros.`;

    try {
      let textoCompleto = '';
      for await (const chunk of streamText({ prompt })) {
        textoCompleto += chunk;
        setOutput(textoCompleto);
      }
    } catch {
      toast.error('Error al diagnosticar. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  }, [form, perfil]);

  const handleCopiar = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopiado(true);
    toast.success('Diagnostico copiado.');
    setTimeout(() => setCopiado(false), 2000);
  }, [output]);

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Optimizacion - Carga manual de metricas
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          Diagnosticar{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            campana
          </span>
        </h2>
        <p className="text-xs text-[#FFFFFF]/40 mt-1">
          Cargas los numeros de Meta Ads Manager y la IA diagnostica que falla y da el plan exacto.
        </p>
      </div>

      {/* Form */}
      <div className="card-panel p-5 space-y-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Cliente / campana
            </label>
            <input
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20"
              placeholder="Ej: Dra. Garcia — Leads Mayo"
              value={form.nombre_campana}
              onChange={(e) => updateField('nombre_campana', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
              Rubro y ciudad
            </label>
            <input
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20"
              placeholder="Ej: Psicologa, Buenos Aires"
              value={form.rubro}
              onChange={(e) => updateField('rubro', e.target.value)}
            />
          </div>
        </div>

        {/* Metricas */}
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFFFFF]/30">
            Metricas actuales
          </span>
          <div className="flex-1 h-px bg-[rgba(245,166,35,0.1)]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            { key: 'gasto' as const, label: 'Gasto total ($)', placeholder: '0', sub: 'USD gastados', step: '0.01' },
            { key: 'clicks' as const, label: 'Clicks', placeholder: '0', sub: 'clicks totales', step: undefined },
            { key: 'leads' as const, label: 'Leads / Resultados', placeholder: '0', sub: 'conversiones', step: undefined },
            { key: 'ctr' as const, label: 'CTR (%)', placeholder: '0.00', sub: 'click-through rate', step: '0.01' },
            { key: 'impresiones' as const, label: 'Impresiones', placeholder: '0', sub: 'veces mostrado', step: undefined },
            { key: 'dias' as const, label: 'Dias activa', placeholder: '0', sub: 'dias corriendo', step: undefined },
          ]).map((m) => (
            <div key={m.key} className="card-panel p-3 text-center">
              <span className="block text-[9px] font-bold tracking-wider uppercase text-[#FFFFFF]/30 mb-2">
                {m.label}
              </span>
              <input
                type="number"
                step={m.step}
                className="w-full bg-transparent border-b border-[#FFFFFF]/10 text-[#FFFFFF] text-lg text-center outline-none focus:border-[#F5A623]/50 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
                placeholder={m.placeholder}
                value={form[m.key] || ''}
                onChange={(e) => updateField(m.key, parseFloat(e.target.value) || 0)}
              />
              <span className="block text-[9px] text-[#FFFFFF]/20 mt-1">{m.sub}</span>
            </div>
          ))}
        </div>

        {/* Problema observado */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF]/40 mb-1.5">
            Que observas que no funciona? (opcional)
          </label>
          <textarea
            className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/30 transition-all resize-none placeholder-[#FFFFFF]/20"
            rows={2}
            placeholder="Ej: Muchos clicks pero nadie completa el formulario"
            value={form.problema_observado ?? ''}
            onChange={(e) => updateField('problema_observado', e.target.value)}
          />
        </div>

        <button
          onClick={handleDiagnosticar}
          disabled={generando || !form.nombre_campana.trim()}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {generando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Diagnosticando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Diagnosticar campana</>
          )}
        </button>
      </div>

      {/* Output */}
      {(output || generando) && (
        <div className="card-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {generando && <div className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />}
              <span className="text-xs font-bold tracking-wider uppercase text-[#F5A623]">
                Diagnostico IA
              </span>
            </div>
            {output && !generando && (
              <button
                onClick={handleCopiar}
                className="flex items-center gap-1.5 text-xs text-[#FFFFFF]/50 hover:text-[#FFFFFF] bg-[#FFFFFF]/5 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <div className="bg-black/20 rounded-xl p-4">
            {output ? (
              <div className="prose prose-invert prose-sm max-w-none text-[#FFFFFF]/85 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-[#FFFFFF] [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-1 [&_p]:my-2 [&_hr]:border-[rgba(245,166,35,0.2)]">
                <Markdown>{output}</Markdown>
              </div>
            ) : (
              <span className="text-[#FFFFFF]/40 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Analizando metricas...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
