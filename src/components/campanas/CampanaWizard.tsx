import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WizardStepObjetivo from './WizardStepObjetivo';
import WizardStepAudiencia from './WizardStepAudiencia';
import WizardStepGuia from './WizardStepGuia';
import { CAMPANA_FORM_INITIAL, OBJETIVO_LABELS } from '../../lib/campanasTypes';
import type { CampanaFormState } from '../../lib/campanasTypes';
import type { Campana } from '../../lib/campanasTypes';
import type { ProfileV2 } from '../../lib/supabase';
import { saveCampana, updateCampana } from '../../lib/campanasStorage';

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  onComplete: (campana: Campana) => void;
  onCancel: () => void;
}

const STEPS = ['Objetivo', 'Audiencia', 'Guia IA'];

export default function CampanaWizard({ userId, perfil, geminiKey, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampanaFormState>(() => {
    const initial = { ...CAMPANA_FORM_INITIAL };
    if (perfil?.nicho) initial.nicho = perfil.nicho;
    if (perfil?.adn_nicho) initial.nicho = perfil.adn_nicho;
    return initial;
  });
  const [guia, setGuia] = useState('');
  const [saving, setSaving] = useState(false);

  const canNext = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return form.nombre.trim().length > 0;
    if (step === 2) return guia.length > 0;
    return false;
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error('Sesion no disponible');
      return;
    }

    setSaving(true);
    try {
      const campana = await saveCampana({
        usuario_id: userId,
        nombre: form.nombre,
        objetivo: form.objetivo,
        nicho: form.nicho || undefined,
        ubicacion: form.ubicacion || undefined,
        edad_min: form.edad_min,
        edad_max: form.edad_max,
        genero: form.genero,
        intereses: form.intereses.length > 0 ? form.intereses : undefined,
        presupuesto_diario: form.presupuesto_diario ? Number(form.presupuesto_diario) : undefined,
        duracion_dias: form.duracion_dias,
        monto_inversion_filtro: form.monto_inversion_filtro ? Number(form.monto_inversion_filtro) : undefined,
        url_landing: form.url_landing || undefined,
        url_vsl: form.url_vsl || undefined,
        guia_configuracion: guia,
        estado: 'configurada',
      });

      if (campana) {
        toast.success('Campana creada correctamente');
        onComplete(campana);
      } else {
        toast.error('Error al guardar la campana');
      }
    } catch {
      toast.error('Error inesperado al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic' }}>
            Nueva Campana
          </h2>
          <p className="text-sm text-[#FFFFFF]/40 mt-0.5">
            {OBJETIVO_LABELS[form.objetivo].titulo}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, idx) => (
          <React.Fragment key={idx}>
            <button
              onClick={() => idx < step && setStep(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                idx === step
                  ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                  : idx < step
                    ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 cursor-pointer hover:bg-[#22C55E]/15'
                    : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30 border border-[#FFFFFF]/10'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                idx < step ? 'bg-[#22C55E]/20' : idx === step ? 'bg-[#F5A623]/20' : 'bg-[#FFFFFF]/10'
              }`}>
                {idx < step ? <Check className="w-3 h-3" /> : idx + 1}
              </span>
              {label}
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${idx < step ? 'bg-[#22C55E]/30' : 'bg-[#FFFFFF]/10'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#1C1C1C] border border-[rgba(245,166,35,0.15)] rounded-2xl p-6">
        {step === 0 && (
          <WizardStepObjetivo value={form.objetivo} onChange={(objetivo) => setForm({ ...form, objetivo })} />
        )}
        {step === 1 && (
          <WizardStepAudiencia form={form} onChange={setForm} />
        )}
        {step === 2 && (
          <WizardStepGuia
            form={form}
            perfil={perfil ?? {}}
            geminiKey={geminiKey}
            userId={userId}
            guia={guia}
            onGuiaChange={setGuia}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : onCancel()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Anterior' : 'Cancelar'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!canNext() || saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar y Crear Creativos'}
          </button>
        )}
      </div>
    </div>
  );
}
