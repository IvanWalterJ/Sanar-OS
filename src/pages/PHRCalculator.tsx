import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Clock, TrendingUp, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface PHRData {
  tarifaConsulta: string;
  consultasSemana: string;
  horasTrabajoSemana: string;
  gastosFijos: string;
  gastosVariables: string;
  especialidad: string;
}

function loadPHRData(): { data: PHRData; analysis: string | null } {
  try {
    const saved = localStorage.getItem('sanare_phr');
    return saved ? JSON.parse(saved) : { data: { tarifaConsulta: '', consultasSemana: '', horasTrabajoSemana: '', gastosFijos: '', gastosVariables: '', especialidad: '' }, analysis: null };
  } catch {
    return { data: { tarifaConsulta: '', consultasSemana: '', horasTrabajoSemana: '', gastosFijos: '', gastosVariables: '', especialidad: '' }, analysis: null };
  }
}

export default function PHRCalculator() {
  const saved = loadPHRData();
  const [data, setData] = useState<PHRData>(saved.data);
  const [analysis, setAnalysis] = useState<string | null>(saved.analysis);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    localStorage.setItem('sanare_phr', JSON.stringify({ data, analysis }));
  }, [data, analysis]);

  const updateField = (field: keyof PHRData, value: string) => {
    setData({ ...data, [field]: value });
  };

  const tarifa = parseFloat(data.tarifaConsulta) || 0;
  const consultas = parseFloat(data.consultasSemana) || 0;
  const horas = parseFloat(data.horasTrabajoSemana) || 0;
  const fijos = parseFloat(data.gastosFijos) || 0;
  const variables = parseFloat(data.gastosVariables) || 0;

  const ingresoMensual = tarifa * consultas * 4;
  const gastosMensuales = fijos + variables;
  const ingresoNeto = ingresoMensual - gastosMensuales;
  const horasMensuales = horas * 4;
  const phr = horasMensuales > 0 ? ingresoNeto / horasMensuales : 0;
  const margenGanancia = ingresoMensual > 0 ? (ingresoNeto / ingresoMensual) * 100 : 0;

  const hasData = tarifa > 0 && consultas > 0 && horas > 0;

  const generateAnalysis = async () => {
    if (!hasData) return;
    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `Analiza estos números de un profesional de la salud (${data.especialidad || 'no especificada'}):
- Tarifa por consulta: $${tarifa}
- Consultas por semana: ${consultas}
- Horas de trabajo por semana: ${horas}
- Gastos fijos mensuales: $${fijos}
- Gastos variables mensuales: $${variables}
- Ingreso bruto mensual: $${ingresoMensual.toFixed(2)}
- Ingreso neto mensual: $${ingresoNeto.toFixed(2)}
- PHR (Precio Hora Real): $${phr.toFixed(2)}
- Margen de ganancia: ${margenGanancia.toFixed(1)}%`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `Eres un consultor financiero de Sanare OS especializado en profesionales de la salud. Analiza los números y genera un diagnóstico financiero en español. Incluye:

1. **Diagnóstico del PHR** — ¿Es saludable o preocupante? Compará con benchmarks del sector salud
2. **Cuello de Botella Principal** — ¿Qué está limitando su facturación?
3. **Estrategia de Precio** — ¿Debería subir tarifas? ¿Cuánto?
4. **Plan de Acción** — 3 pasos concretos para mejorar el PHR en 30 días
5. **Proyección** — Si implementa los cambios, cuánto podría facturar

Sé directo, usa números y ejemplos concretos. Formato markdown.`,
        }
      });

      const text = response.text || '';
      setAnalysis(text);
      toast.success('Análisis financiero generado');
    } catch (error) {
      console.error('Error generating PHR analysis:', error);
      toast.error('Error al generar el análisis. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-[#F0EAD8] mb-2">Calculadora PHR</h1>
        <p className="text-[#F0EAD8]/60">Descubrí cuánto vale realmente tu hora de trabajo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="card-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-medium text-[#F0EAD8] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#C8893A]" /> Tus Números
          </h3>

          <div>
            <label className="block text-xs text-[#F0EAD8]/60 mb-1">Especialidad</label>
            <input
              type="text"
              value={data.especialidad}
              onChange={(e) => updateField('especialidad', e.target.value)}
              placeholder="Ej: Nutricionista"
              className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#F0EAD8]/60 mb-1">Tarifa por Consulta ($)</label>
              <input
                type="number"
                value={data.tarifaConsulta}
                onChange={(e) => updateField('tarifaConsulta', e.target.value)}
                placeholder="50"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#F0EAD8]/60 mb-1">Consultas por Semana</label>
              <input
                type="number"
                value={data.consultasSemana}
                onChange={(e) => updateField('consultasSemana', e.target.value)}
                placeholder="20"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#F0EAD8]/60 mb-1">Horas de Trabajo por Semana</label>
            <input
              type="number"
              value={data.horasTrabajoSemana}
              onChange={(e) => updateField('horasTrabajoSemana', e.target.value)}
              placeholder="40"
              className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#F0EAD8]/60 mb-1">Gastos Fijos Mensuales ($)</label>
              <input
                type="number"
                value={data.gastosFijos}
                onChange={(e) => updateField('gastosFijos', e.target.value)}
                placeholder="1000"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#F0EAD8]/60 mb-1">Gastos Variables Mensuales ($)</label>
              <input
                type="number"
                value={data.gastosVariables}
                onChange={(e) => updateField('gastosVariables', e.target.value)}
                placeholder="500"
                className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
              />
            </div>
          </div>

          <button
            onClick={generateAnalysis}
            disabled={!hasData || generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C8893A] hover:bg-[#D9A04E] disabled:opacity-50 text-[#F0EAD8] text-sm font-medium transition-all shadow-lg shadow-[#C8893A]/20"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Analizar con IA</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="card-panel p-6 rounded-2xl">
            <h3 className="text-sm text-[#F0EAD8]/60 uppercase tracking-wider mb-4">Resultados en Tiempo Real</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[rgba(200,137,58,0.1)]">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#2DD4A0]" />
                  <span className="text-sm text-[#F0EAD8]/80">PHR (Precio Hora Real)</span>
                </div>
                <span className={`text-2xl font-light ${phr > 0 ? 'text-[#2DD4A0]' : 'text-[#F0EAD8]/40'}`}>
                  ${phr.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[rgba(200,137,58,0.1)]">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#C8893A]" />
                  <span className="text-sm text-[#F0EAD8]/80">Ingreso Bruto Mensual</span>
                </div>
                <span className="text-xl font-light text-[#F0EAD8]">${ingresoMensual.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[rgba(200,137,58,0.1)]">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#C8893A]" />
                  <span className="text-sm text-[#F0EAD8]/80">Ingreso Neto Mensual</span>
                </div>
                <span className={`text-xl font-light ${ingresoNeto > 0 ? 'text-[#F0EAD8]' : 'text-[#E85555]'}`}>
                  ${ingresoNeto.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[rgba(200,137,58,0.1)]">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#C8893A]" />
                  <span className="text-sm text-[#F0EAD8]/80">Margen de Ganancia</span>
                </div>
                <span className={`text-xl font-light ${margenGanancia > 30 ? 'text-[#2DD4A0]' : margenGanancia > 15 ? 'text-[#C8893A]' : 'text-[#E85555]'}`}>
                  {margenGanancia.toFixed(1)}%
                </span>
              </div>
            </div>

            {hasData && margenGanancia < 20 && (
              <div className="mt-4 p-3 rounded-xl bg-[#E85555]/10 border border-red-500/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E85555] shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">Tu margen es bajo. Considerá subir tarifas o reducir gastos operativos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {analysis && (
        <div className="card-panel p-8 rounded-2xl border-l-4 border-l-emerald-500 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#C8893A] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#F0EAD8]" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#F0EAD8]">Diagnóstico Financiero IA</h2>
              <p className="text-xs text-[#2DD4A0]">Análisis personalizado de tu PHR</p>
            </div>
          </div>
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-gray-100 prose-li:text-[#F0EAD8]/80 text-sm">
            <Markdown>{analysis}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
