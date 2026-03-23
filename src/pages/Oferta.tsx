import React, { useState, useEffect } from 'react';
import { Sparkles, Target, ArrowRight, CheckCircle2, LayoutTemplate, Download, ChevronLeft, Lock } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'input' | 'variants' | 'landing';

export default function Oferta() {
  const [step, setStep] = useState<Step>('input');
  const [description, setDescription] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [landingHtml, setLandingHtml] = useState<string>('');
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const loadingPhrases = step === 'input' ? [
    "Analizando tu paciente ideal...",
    "Estructurando una oferta irresistible...",
    "Aplicando sesgos cognitivos de alta conversión...",
    "Optimizando la psicología de precios...",
    "Calculando viabilidad de mercado..."
  ] : [
    "Diseñando una landing page premium...",
    "Ajustando el copy para maximizar ventas...",
    "Estructurando secciones de alta conversión...",
    "Aplicando estilos visuales y glassmorphism...",
    "Preparando tu sistema de adquisición..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setLoadingPhraseIndex(0);
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, step]);

  const handleGenerateVariants = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un experto en marketing y ventas high-ticket para profesionales de la salud. 
      El profesional describe su servicio así: "${description}".
      Genera 3 variantes de oferta (Conservadora, Media, Ambiciosa) para un programa de salud online.
      Asegúrate de que los precios estén en USD y sean realistas para un programa premium.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "conservadora, media, o ambiciosa" },
                name: { type: Type.STRING, description: "Nombre atractivo del programa" },
                subtitle: { type: Type.STRING, description: "Promesa principal en una línea" },
                price: { type: Type.NUMBER, description: "Precio en USD" },
                duration: { type: Type.NUMBER, description: "Duración en semanas" },
                score: { type: Type.NUMBER, description: "Viabilidad de mercado (0-100)" },
                includes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 3 a 5 entregables" },
                recommended: { type: Type.BOOLEAN, description: "Solo la opción 'media' debe ser true" }
              },
              required: ["id", "name", "subtitle", "price", "duration", "score", "includes", "recommended"]
            }
          }
        }
      });

      const generatedVariants = JSON.parse(response.text || "[]");
      
      const styledVariants = generatedVariants.map((v: any) => {
        if (v.id === 'conservadora') {
          return { ...v, color: 'border-blue-500/30 hover:border-blue-500', badge: 'text-blue-400 bg-blue-500/10' };
        } else if (v.id === 'media') {
          return { ...v, color: 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]', badge: 'text-purple-400 bg-purple-500/10', recommended: true };
        } else {
          return { ...v, color: 'border-emerald-500/30 hover:border-emerald-500', badge: 'text-emerald-400 bg-emerald-500/10' };
        }
      });

      setVariants(styledVariants);
      setStep('variants');
    } catch (error: any) {
      console.error(error);
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        alert("Has excedido el límite de uso de la IA (Error 429). Por favor, espera un momento e intenta de nuevo más tarde.");
      } else {
        alert("Hubo un error generando las variantes. Intenta de nuevo.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLanding = async (variant: any) => {
    setIsGenerating(true);
    setSelectedVariant(variant.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un experto en diseño web UI/UX premium, copywriting persuasivo de respuesta directa y estratega de ofertas high-ticket (estilo Alex Hormozi).
      Crea una Landing Page de altísima conversión (formato Long-Form) en HTML y Tailwind CSS (usando CDN) para este programa de salud:
      Nombre: ${variant.name}
      Promesa: ${variant.subtitle}
      Precio: $${variant.price} USD
      Incluye: ${variant.includes.join(', ')}
      
      Reglas de Copywriting (CRÍTICO - Usa la fórmula PAS y la Ecuación de Valor):
      1. Problema/Agitación (PAS): Conecta profundamente con los dolores actuales del paciente. Haz que sientan que los entiendes mejor que ellos mismos.
      2. Solución/Mecanismo Único: Presenta el programa como el vehículo perfecto y novedoso para salir de ese dolor.
      3. Ecuación de Valor (Hormozi): 
         - Aumenta el "Resultado Soñado" y la "Probabilidad Percibida de Éxito" (usa testimonios falsos realistas, garantías, autoridad).
         - Disminuye el "Tiempo de Retraso" y el "Esfuerzo/Sacrificio" (destaca la rapidez, el acompañamiento 1 a 1, lo fácil que es seguir el plan).
      4. Value Stacking: Al presentar el precio, desglosa el valor real de cada entregable para que el precio final ($${variant.price}) parezca una ganga absoluta.
      5. Urgencia/Escasez: Añade un bono de acción rápida o cupos limitados.

      Reglas de Diseño y Estructura (CRÍTICO):
      - Devuelve SOLO código HTML válido, sin markdown (\`\`\`html).
      - Tema Oscuro Premium: Fondo principal \`bg-[#0B0F19]\`, paneles con glassmorphism (\`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl\`).
      - Tipografía: Importa de Google Fonts (Inter para cuerpo, Playfair Display para títulos).
      - Acentos: Usa gradientes sutiles (ej. \`bg-gradient-to-r from-blue-500 to-purple-600\`) para botones y textos destacados.
      - Iconos: Usa SVGs limpios o Feather icons via CDN.
      
      Estructura Obligatoria de la Landing (Long-Form):
      1. Navbar minimalista (Logo texto y botón CTA).
      2. Hero Section: Pre-título llamativo, Titular gigante (Playfair) enfocado en el Resultado Soñado, subtítulo persuasivo, CTA principal vibrante, y "social proof" debajo del botón.
      3. Sección PAS (Problema/Agitación): "¿Te suena familiar esto?" con 3-4 tarjetas glassmorphism describiendo los dolores.
      4. La Epifanía / Solución: Presentación del programa "${variant.name}" como el puente entre su dolor y su deseo.
      5. Cómo Funciona (3 Pasos simples): Reduce el esfuerzo percibido.
      6. Lo que te llevas hoy (Value Stack): Lista de entregables (${variant.includes.join(', ')}), cada uno con un valor monetario percibido tachado, sumando un "Valor Total" muy superior al precio real.
      7. Testimonios / Casos de Éxito: 2-3 reseñas persuasivas.
      8. Garantía de Inversión de Riesgo: "Garantía de 30 días" o similar.
      9. Sección de Precios (Pricing): Tarjeta destacada con el precio real ($${variant.price} USD), anclaje de precio, y botón de pago gigante.
      10. FAQ (Preguntas Frecuentes): 3-4 preguntas para derribar objeciones.
      11. Footer minimalista.
      
      - Usa Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
      - El diseño debe verse exactamente como una landing page de un infoproducto high-ticket de lujo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      let html = response.text || "";
      html = html.replace(/```html/g, '').replace(/```/g, '').trim();
      
      setLandingHtml(html);
      setStep('landing');
    } catch (error: any) {
      console.error(error);
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        alert("Has excedido el límite de uso de la IA (Error 429). Por favor, espera un momento e intenta de nuevo más tarde.");
      } else {
        alert("Hubo un error generando la landing page.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([landingHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-sanare.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 h-full flex flex-col relative">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-md rounded-3xl"
          >
            <div className="flex flex-col items-center max-w-md text-center">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              
              <div className="h-16 relative w-full overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={loadingPhraseIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl font-medium text-white absolute inset-0 flex items-center justify-center"
                  >
                    {loadingPhrases[loadingPhraseIndex]}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <p className="text-sm text-gray-400 mt-4">La Inteligencia Artificial está trabajando. Esto puede tomar unos segundos.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Generador de Oferta Premium</h1>
        <p className="text-gray-400">Diseñá tu programa high-ticket con Inteligencia Artificial</p>
      </div>

      {step === 'input' && (
        <div className="glass-panel rounded-2xl p-8 max-w-3xl mx-auto w-full mt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Describí qué querés ofrecer</h2>
              <p className="text-sm text-gray-400">Cuanto más específico, mejor será la oferta generada.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Qué problema resolvés y a quién le ofrecés esto?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Soy nutricionista especializada en trastornos hormonales en mujeres de 35-50 años. Quiero hacer un programa de 8 semanas online donde las acompañe a regular su tiroides y mejorar su energía sin depender de medicación..."
                className="w-full h-40 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">Mínimo 50 caracteres</span>
                <span className={`text-xs ${description.length >= 50 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {description.length} caracteres
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerateVariants}
              disabled={description.length < 50 || isGenerating}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
            >
              <Target className="w-5 h-5" />
              <span>Generar 3 variantes de oferta con IA</span>
            </button>
          </div>
        </div>
      )}

      {step === 'variants' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setStep('input')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a editar
            </button>
            <div className="glass-panel px-4 py-2 rounded-lg border-purple-500/30">
              <p className="text-sm text-purple-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> IA recomienda la opción "Media"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
            {variants.map((variant) => (
              <div 
                key={variant.id}
                onClick={() => setSelectedVariant(variant.id)}
                className={`glass-panel rounded-2xl p-6 flex flex-col cursor-pointer transition-all duration-300 relative overflow-hidden ${variant.color} ${
                  selectedVariant === variant.id ? 'ring-2 ring-white/50 bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                }`}
              >
                {variant.recommended && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                )}
                
                <div className="mb-6">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${variant.badge}`}>
                    {variant.id === 'conservadora' ? 'Opción Conservadora' : variant.id === 'media' ? 'Opción Media' : 'Opción Ambiciosa'}
                  </span>
                  <h3 className="text-xl font-medium text-white mt-4 mb-1">{variant.name}</h3>
                  <p className="text-sm text-gray-400 h-10">{variant.subtitle}</p>
                </div>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-light text-white">${variant.price}</span>
                    <span className="text-sm text-gray-500">USD</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{variant.duration} semanas de duración</p>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  <p className="text-xs font-medium text-gray-300 uppercase tracking-wider">Incluye:</p>
                  <ul className="space-y-2">
                    {variant.includes.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 mb-4">
                    <span className="text-xs text-gray-500">Viabilidad de mercado</span>
                    <span className={`text-sm font-medium ${variant.score > 80 ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {variant.score}/100
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateLanding(variant);
                    }}
                    disabled={isGenerating}
                    className="relative w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 overflow-hidden group transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                      <div className="relative h-full w-8 bg-white/30" />
                    </div>
                    <LayoutTemplate className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Generar Landing</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'landing' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500 min-h-0">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setStep('variants')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a variantes
            </button>
            <div className="flex gap-3">
              <button onClick={downloadHtml} className="px-4 py-2 rounded-lg glass-panel text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Descargar HTML
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm text-white transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
                Deploy en Vercel <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border-white/20">
            <div className="h-10 bg-black/40 border-b border-white/10 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto px-24 py-1 rounded-md bg-white/5 text-xs text-gray-400 font-mono flex items-center gap-2">
                <Lock className="w-3 h-3" /> tu-clinica-digital.sanare.os
              </div>
            </div>
            <div className="flex-1 bg-white overflow-hidden">
              <iframe 
                srcDoc={landingHtml} 
                className="w-full h-full border-none"
                title="Landing Page Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
