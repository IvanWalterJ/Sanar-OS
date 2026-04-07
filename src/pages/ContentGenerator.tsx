import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, Check, Calendar, Lightbulb, FileText } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

type ContentType = 'ideas' | 'borradores' | 'calendario';

interface ContentState {
  ideas: string | null;
  borradores: string | null;
  calendario: string | null;
}

function loadContent(): ContentState {
  try {
    const saved = localStorage.getItem('sanare_content_v2');
    return saved ? JSON.parse(saved) : { ideas: null, borradores: null, calendario: null };
  } catch { return { ideas: null, borradores: null, calendario: null }; }
}

function buildPrompt(type: ContentType, specialty: string, audience: string): string {
  const sp = specialty || 'profesional de la salud';
  const au = audience || 'pacientes potenciales';

  if (type === 'ideas') {
    return (
      'Genera 30 ideas de contenido para redes sociales para un profesional de la salud especialista en ' +
      sp + '. Su audiencia objetivo es: ' + au + '.\n\n' +
      'Organiza las ideas en 4 categorias:\n' +
      'EDUCATIVO (10 ideas): Ensenhar sobre la especialidad\n' +
      'AUTORIDAD (10 ideas): Posicionarse como experto\n' +
      'CONEXION (5 ideas): Humanizar y generar confianza\n' +
      'VENTA SUAVE (5 ideas): Llevar a la consulta o servicio\n\n' +
      'Para cada idea incluye: titulo del post + formato sugerido (reel, carrusel, historia, texto).'
    );
  }

  if (type === 'borradores') {
    return (
      'Escribe 3 borradores completos de posts de Instagram para un profesional de la salud especialista en ' +
      sp + '. Audiencia objetivo: ' + au + '.\n\n' +
      'Para cada borrador incluye:\n' +
      '1. HOOK: La primera linea que frena el scroll\n' +
      '2. CUERPO: Contenido educativo y valioso de 5 a 7 lineas\n' +
      '3. CTA: Llamada a la accion clara\n' +
      '4. HASHTAGS: 10 hashtags relevantes\n' +
      '5. FORMATO: Reel, carrusel, o texto\n\n' +
      'Haz que suenen profesionales pero cercanos.'
    );
  }

  // calendario
  return (
    'Crea un calendario editorial de 4 semanas para un profesional de la salud especialista en ' +
    sp + '. Audiencia: ' + au + '.\n\n' +
    'Formato semanal:\n' +
    'Lunes: Contenido educativo\n' +
    'Miercoles: Contenido de autoridad o caso clinico\n' +
    'Viernes: Contenido de conexion o personal\n\n' +
    'Para cada dia incluye: tema especifico + formato (reel, carrusel o historia) + hora sugerida de publicacion.\n' +
    'Agrega tambien una estrategia de stories diarias.'
  );
}

const TABS: { id: ContentType; label: string; icon: React.ElementType }[] = [
  { id: 'ideas', label: '30 Ideas', icon: Lightbulb },
  { id: 'borradores', label: 'Borradores', icon: FileText },
  { id: 'calendario', label: 'Calendario', icon: Calendar },
];

export default function ContentGenerator() {
  const [activeTab, setActiveTab] = useState<ContentType>('ideas');
  const [specialty, setSpecialty] = useState('');
  const [audience, setAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<ContentState>(loadContent);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const onboarding = localStorage.getItem('sanare_onboarding');
      if (onboarding) {
        const parsed = JSON.parse(onboarding);
        if (parsed.answers?.[1]) setSpecialty(parsed.answers[1]);
        if (parsed.answers?.[4]) setAudience(parsed.answers[4]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('sanare_content_v2', JSON.stringify(content));
  }, [content]);

  const generateContent = async () => {
    if (!specialty.trim()) {
      toast.error('Ingresá tu especialidad para generar contenido');
      return;
    }
    setGenerating(true);

    const prompt = buildPrompt(activeTab, specialty.trim(), audience.trim());

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction:
            'Eres un estratega de contenido digital de Sanare OS especializado en marketing para profesionales de la salud. Genera contenido en espanol, practico y accionable. Usa formato markdown con encabezados y listas.',
        },
      });

      const text = response.text;
      if (!text) throw new Error('Respuesta vacía del servidor');

      setContent((prev) => ({ ...prev, [activeTab]: text }));
      toast.success('Contenido generado exitosamente');
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error('Error al generar contenido. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const copyContent = () => {
    const current = content[activeTab];
    if (!current) return;
    navigator.clipboard.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Contenido copiado al portapapeles');
  };

  const currentContent = content[activeTab];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-[#F0EAD8] mb-2">Generador de Contenido</h1>
        <p className="text-[#F0EAD8]/60">Creá contenido estratégico para redes sociales con IA</p>
      </div>

      {/* Config panel */}
      <div className="card-panel p-6 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#F0EAD8]/60 mb-1">Tu Especialidad</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ej: Nutricionista, Dermatóloga..."
              className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[#F0EAD8]/60 mb-1">Audiencia Objetivo</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ej: Mujeres 30-50 años con sobrepeso..."
              className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-lg px-4 py-2.5 text-[#F0EAD8] text-sm focus:outline-none focus:border-[#C8893A]/50"
            />
          </div>
        </div>

        {/* Tab selector + Generate button in same row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === t.id
                    ? 'bg-[#C8893A]/20 text-[#C8893A] border-[#C8893A]/30'
                    : 'bg-[#C8893A]/5 text-[#F0EAD8]/60 hover:bg-[#C8893A]/10 hover:text-[#F0EAD8]/90 border-transparent'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {content[t.id] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Generado" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={generateContent}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C8893A] hover:bg-[#D9A04E] disabled:opacity-50 text-[#F0EAD8] text-sm font-medium transition-all shadow-lg shadow-[#C8893A]/20 sm:ml-auto"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar {TABS.find((t) => t.id === activeTab)?.label}</>
            )}
          </button>
        </div>
      </div>

      {/* Content display */}
      {generating ? (
        <div className="card-panel p-12 rounded-2xl flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-[#C8893A] animate-spin" />
          <p className="text-[#F0EAD8]/60 text-sm">Generando contenido con IA...</p>
        </div>
      ) : currentContent ? (
        <div className="card-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-[#F0EAD8]">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyContent}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8893A]/10 hover:bg-[#C8893A]/20 text-sm text-[#F0EAD8]/80 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-[#2DD4A0]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={generateContent}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8893A]/20 hover:bg-[#C8893A]/30 text-sm text-[#C8893A] transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Regenerar
              </button>
            </div>
          </div>
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-gray-100 prose-li:text-[#F0EAD8]/80 text-sm">
            <Markdown>{currentContent}</Markdown>
          </div>
        </div>
      ) : (
        <div className="card-panel p-12 rounded-2xl text-center">
          <Sparkles className="w-10 h-10 text-[#C8893A]/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#F0EAD8] mb-2">
            Generá tu {TABS.find((t) => t.id === activeTab)?.label}
          </h3>
          <p className="text-sm text-[#F0EAD8]/60">
            Completá tu especialidad y hacé clic en{' '}
            <span className="text-[#C8893A] font-medium">Generar</span> para crear contenido con IA.
          </p>
        </div>
      )}
    </div>
  );
}
