import { useState } from 'react';
import { X, Loader2, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { ExtractedProfile, MigrationStep1Data } from '../../lib/migrationTypes';
import { extractFromText } from '../../lib/migrationExtractor';

interface MigrationWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ['Datos básicos', 'Información del cliente', 'Revisar campos', 'Confirmar'];

const REVIEW_TABS = [
  { key: 'historia', label: 'Historia' },
  { key: 'matriz', label: 'Matriz' },
  { key: 'metodo', label: 'Método' },
  { key: 'identidad', label: 'Identidad' },
] as const;

type ReviewTab = typeof REVIEW_TABS[number]['key'];

const FIELD_LABEL: Record<keyof ExtractedProfile, string> = {
  historia_300: 'Historia (300 palabras)',
  historia_150: 'Historia corta (150 palabras)',
  historia_50: 'Historia breve (50 palabras)',
  proposito: 'Propósito / Misión',
  legado: 'Legado',
  nicho: 'Nicho de mercado',
  posicionamiento: 'Posicionamiento único',
  por_que_oficial: '"Por qué" oficial',
  matriz_a: 'Matriz A — Dolores actuales',
  matriz_b: 'Matriz B — Obstáculos',
  matriz_c: 'Matriz C — Visión del resultado',
  metodo_nombre: 'Nombre del método',
  metodo_pasos: 'Pasos del método',
  oferta_high: 'Oferta Premium',
  oferta_mid: 'Oferta Estándar',
  oferta_low: 'Oferta de Entrada',
  lead_magnet: 'Lead Magnet',
  identidad_colores: 'Colores de marca',
  identidad_tipografia: 'Tipografías',
  identidad_logo: 'Logo / Identidad visual',
  identidad_tono: 'Tono de comunicación',
};

const TAB_FIELDS: Record<ReviewTab, (keyof ExtractedProfile)[]> = {
  historia: ['historia_300', 'historia_150', 'historia_50', 'proposito', 'legado', 'nicho', 'posicionamiento', 'por_que_oficial'],
  matriz: ['matriz_a', 'matriz_b', 'matriz_c'],
  metodo: ['metodo_nombre', 'metodo_pasos', 'oferta_high', 'oferta_mid', 'oferta_low', 'lead_magnet'],
  identidad: ['identidad_colores', 'identidad_tipografia', 'identidad_logo', 'identidad_tono'],
};

const INPUT_CLASS = 'w-full bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-2.5 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/20 focus:outline-none focus:border-[#F5A623]/50 transition-colors';
const LABEL_CLASS = 'block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5';

export default function MigrationWizard({ onClose, onSuccess }: MigrationWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1
  const [form, setForm] = useState<MigrationStep1Data>({
    nombre: '', email: '', password: '', plan: 'DWY', especialidad: '',
    fecha_inicio: new Date().toISOString().split('T')[0], pilar_actual: 0,
  });

  // Step 2
  const [textoLibre, setTextoLibre] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [iaUsada, setIaUsada] = useState(false);

  // Step 3
  const [extracted, setExtracted] = useState<ExtractedProfile>({});
  const [aiFields, setAiFields] = useState<Set<keyof ExtractedProfile>>(new Set());
  const [activeTab, setActiveTab] = useState<ReviewTab>('historia');

  // Step 4
  const [creating, setCreating] = useState(false);

  function setFormField<K extends keyof MigrationStep1Data>(key: K, value: MigrationStep1Data[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setExtractedField(key: keyof ExtractedProfile, value: string) {
    setExtracted(prev => ({ ...prev, [key]: value }));
    setAiFields(prev => { const next = new Set(prev); next.delete(key); return next; });
  }

  function canGoNext(): boolean {
    if (step === 0) return !!(form.nombre.trim() && form.email.trim() && form.password.trim());
    if (step === 1) return true;
    if (step === 2) return true;
    return false;
  }

  async function handleExtract() {
    if (!textoLibre.trim()) return;
    setExtracting(true);
    try {
      const result = await extractFromText(textoLibre.trim());
      setExtracted(result);
      setAiFields(new Set(Object.keys(result) as (keyof ExtractedProfile)[]));
      setIaUsada(true);
      toast.success('Información extraída correctamente');
      setStep(2);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al extraer información');
    } finally {
      setExtracting(false);
    }
  }

  async function handleCreate() {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) return;
    setCreating(true);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tempClient = createClient(url, key, {
        auth: {
          persistSession: false,
          storageKey: 'temp_auth_migration',
          storage: { getItem: () => null, setItem: () => null, removeItem: () => null },
        },
      });

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: form.email.trim(),
        password: form.password.trim(),
        options: { data: { nombre: form.nombre.trim() } },
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('No se pudo crear el usuario');

      await new Promise(r => setTimeout(r, 1500));

      const profileUpdate: Record<string, unknown> = {
        especialidad: form.especialidad.trim() || null,
        plan: form.plan,
        fecha_inicio: form.fecha_inicio,
        status: 'ACTIVE',
        onboarding_completed: true,
        pilar_actual: form.pilar_actual,
        // ADN extraído
        ...Object.fromEntries(
          (Object.entries(extracted) as [keyof ExtractedProfile, string][])
            .filter(([, v]) => v && v.trim())
            .map(([k, v]) => [k, v.trim()])
        ),
      };

      if (supabase) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', signUpData.user.id);
        if (updateError) throw updateError;
      }

      toast.success(`Cliente ${form.nombre} migrado exitosamente`);
      onSuccess();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creando cliente');
    } finally {
      setCreating(false);
    }
  }

  const extractedCount = Object.values(extracted).filter(v => v && (v as string).trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(245,166,35,0.1)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#FFFFFF]">Migrar cliente existente</h2>
            <p className="text-[11px] text-[#FFFFFF]/40 mt-0.5">Paso {step + 1} de {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-[rgba(245,166,35,0.08)] flex-shrink-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 ${i <= step ? 'text-[#F5A623]' : 'text-[#FFFFFF]/20'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i < step ? 'bg-[#F5A623] text-black' : i === step ? 'border-2 border-[#F5A623] text-[#F5A623]' : 'border border-[#FFFFFF]/20 text-[#FFFFFF]/20'}`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-[10px] font-semibold hidden sm:block whitespace-nowrap">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-[#F5A623]/40' : 'bg-[#FFFFFF]/10'}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── PASO 1: Datos básicos ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={LABEL_CLASS}>Nombre completo *</label>
                  <input type="text" value={form.nombre} onChange={e => setFormField('nombre', e.target.value)}
                    placeholder="Ej: María González" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setFormField('email', e.target.value)}
                    placeholder="cliente@ejemplo.com" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Contraseña temporal *</label>
                  <input type="password" value={form.password} onChange={e => setFormField('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Plan</label>
                  <select value={form.plan} onChange={e => setFormField('plan', e.target.value as MigrationStep1Data['plan'])} className={INPUT_CLASS}>
                    <option value="DWY">DWY</option>
                    <option value="DFY">DFY</option>
                    <option value="IMPLEMENTACION">Implementación</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Especialidad</label>
                  <input type="text" value={form.especialidad} onChange={e => setFormField('especialidad', e.target.value)}
                    placeholder="Ej: Nutricionista" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Fecha de inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setFormField('fecha_inicio', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Pilar actual (0–11)</label>
                  <input type="number" min={0} max={11} value={form.pilar_actual} onChange={e => setFormField('pilar_actual', Number(e.target.value))} className={INPUT_CLASS} />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 2: Fuente de información ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[#FFFFFF]/60">
                Pegá toda la información disponible sobre el cliente: historia, método, ofertas, descripción de marca, etc.
                La IA extraerá los campos automáticamente.
              </p>
              <div>
                <label className={LABEL_CLASS}>Información del cliente</label>
                <textarea
                  value={textoLibre}
                  onChange={e => setTextoLibre(e.target.value)}
                  placeholder="Pegá aquí cualquier texto con información sobre el cliente: bio, propuesta de valor, descripción de servicios, historia personal, etc."
                  rows={12}
                  className={`${INPUT_CLASS} resize-none`}
                />
                <p className="text-[10px] text-[#FFFFFF]/30 mt-1">{textoLibre.length} caracteres</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExtract}
                  disabled={!textoLibre.trim() || extracting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-40 text-black text-sm font-bold transition-all"
                >
                  {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {extracting ? 'Extrayendo con IA...' : 'Extraer con IA'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[rgba(245,166,35,0.2)] text-sm text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors"
                >
                  Continuar sin IA
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Revisión de campos ── */}
          {step === 2 && (
            <div className="space-y-4">
              {iaUsada && extractedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0" />
                  <p className="text-[11px] text-[#F5A623]">
                    IA extrajo {extractedCount} campos. Revisá y corregí lo que necesites.
                  </p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-[#0A0A0A] rounded-xl p-1">
                {REVIEW_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-[#F5A623] text-black'
                        : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Fields per tab */}
              <div className="space-y-3">
                {TAB_FIELDS[activeTab].map(fieldKey => {
                  const isAi = aiFields.has(fieldKey);
                  const isLong = ['historia_300', 'historia_150', 'metodo_pasos'].includes(fieldKey);
                  return (
                    <div key={fieldKey}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className={LABEL_CLASS.replace('mb-1.5', '')}>{FIELD_LABEL[fieldKey]}</label>
                        {isAi && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623]">IA</span>
                        )}
                      </div>
                      <textarea
                        value={(extracted[fieldKey] as string) ?? ''}
                        onChange={e => setExtractedField(fieldKey, e.target.value)}
                        rows={isLong ? 5 : 2}
                        placeholder={`Completar manualmente...`}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PASO 4: Confirmar ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#FFFFFF]">Resumen de la migración</h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div><span className="text-[#FFFFFF]/40">Nombre:</span> <span className="text-[#FFFFFF] font-medium">{form.nombre}</span></div>
                  <div><span className="text-[#FFFFFF]/40">Email:</span> <span className="text-[#FFFFFF] font-medium">{form.email}</span></div>
                  <div><span className="text-[#FFFFFF]/40">Plan:</span> <span className="text-[#F5A623] font-bold">{form.plan}</span></div>
                  <div><span className="text-[#FFFFFF]/40">Pilar inicial:</span> <span className="text-[#FFFFFF] font-medium">P{form.pilar_actual}</span></div>
                  <div><span className="text-[#FFFFFF]/40">Fecha inicio:</span> <span className="text-[#FFFFFF] font-medium">{form.fecha_inicio}</span></div>
                  <div><span className="text-[#FFFFFF]/40">Especialidad:</span> <span className="text-[#FFFFFF] font-medium">{form.especialidad || '—'}</span></div>
                </div>
                <div className="border-t border-[rgba(245,166,35,0.1)] pt-3">
                  <p className="text-[11px] text-[#FFFFFF]/40">
                    Campos ADN completados: <span className="text-[#F5A623] font-bold">{extractedCount}</span> de {Object.keys(FIELD_LABEL).length}
                    {iaUsada && <span className="ml-2 text-[#F5A623]/60">(extraídos con IA)</span>}
                  </p>
                </div>
              </div>

              <div className="bg-[#F5A623]/5 border border-[#F5A623]/20 rounded-xl px-4 py-3">
                <p className="text-[11px] text-[#F5A623]/80">
                  Se creará la cuenta con acceso directo a la plataforma. El cliente no necesitará completar el onboarding desde cero.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-[rgba(245,166,35,0.1)] flex-shrink-0">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext() || (step === 1 && extracting)}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-40 text-black text-sm font-bold transition-all"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-black text-sm font-bold transition-all"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {creating ? 'Creando cuenta...' : 'Crear cliente migrado'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
