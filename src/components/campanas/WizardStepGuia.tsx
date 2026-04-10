import React, { useState, useCallback } from 'react';
import { Loader2, Sparkles, Copy, Check, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { buildGuiaCampanaPrompt } from '../../lib/campanasPrompts';
import { getUserKnowledgeBase } from '../../lib/userKnowledgeBase';
import type { CampanaFormState } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  form: CampanaFormState;
  perfil: Partial<ProfileV2>;
  geminiKey?: string;
  userId?: string;
  guia: string;
  onGuiaChange: (guia: string) => void;
}

export default function WizardStepGuia({ form, perfil, geminiKey, userId, guia, onGuiaChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateGuia = useCallback(async () => {
    if (!geminiKey) {
      toast.error('API key de Gemini no configurada');
      return;
    }

    setGenerating(true);
    onGuiaChange('');

    try {
      const kb = await getUserKnowledgeBase(userId);
      const prompt = buildGuiaCampanaPrompt(form, perfil, kb);
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      let fullText = '';
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      for await (const chunk of stream) {
        const text = chunk.text ?? '';
        fullText += text;
        onGuiaChange(fullText);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error generando guia: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [form, perfil, geminiKey, userId, onGuiaChange]);

  const handleCopy = () => {
    navigator.clipboard.writeText(guia);
    setCopied(true);
    toast.success('Guia copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#FFFFFF] mb-1">Guia de Configuracion</h3>
        <p className="text-sm text-[#FFFFFF]/50">
          La IA genera un paso a paso detallado para configurar tu campana en Meta Ads Manager
        </p>
      </div>

      {!guia && !generating && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#F5A623]" />
          </div>
          <p className="text-[#FFFFFF]/60 mb-6 text-sm">
            Genera la guia personalizada basada en tu campana y perfil
          </p>
          <button onClick={generateGuia} className="btn-primary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Generar Guia con IA
          </button>
        </div>
      )}

      {generating && !guia && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin mx-auto mb-4" />
          <p className="text-[#FFFFFF]/60 text-sm">Generando guia personalizada...</p>
        </div>
      )}

      {guia && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {generating && <Loader2 className="w-4 h-4 text-[#F5A623] animate-spin" />}
              <span className="text-xs text-[#FFFFFF]/40">{generating ? 'Generando...' : 'Guia generada'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#FFFFFF]/60 hover:text-[#FFFFFF] bg-[#FFFFFF]/5 hover:bg-[#FFFFFF]/10 transition-colors disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={generateGuia}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F5A623]/60 hover:text-[#F5A623] bg-[#F5A623]/5 hover:bg-[#F5A623]/10 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Regenerar
              </button>
            </div>
          </div>

          <div className="bg-[#141414] border border-[rgba(245,166,35,0.15)] rounded-xl p-6 max-h-[500px] overflow-y-auto scrollbar-hide">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#F5A623] prose-strong:text-[#FFFFFF] prose-li:text-[#FFFFFF]/70">
              <Markdown>{guia}</Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
