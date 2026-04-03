import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { toast } from 'sonner';

interface WelcomeWizardProps {
  profile: Profile;
  onComplete: () => void;
}

type Step = 'password' | 'profile' | 'welcome';

const ESPECIALIDADES = [
  'Psicólogo/a',
  'Nutricionista',
  'Odontólogo/a',
  'Kinesiólogo/a',
  'Coach',
  'Terapeuta',
  'Médico/a',
  'Otro',
];

export default function WelcomeWizard({ profile, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState<Step>('password');

  // Step 1 — password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Step 2 — profile
  const [especialidad, setEspecialidad] = useState(profile.especialidad ?? '');
  const [ingresosMensuales, setIngresosMensuales] = useState('');
  const [horasSemana, setHorasSemana] = useState('');
  const [frustracion, setFrustracion] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  async function handlePasswordSubmit() {
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (!supabase) { setStep('profile'); return; }

    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStep('profile');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cambiando contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleProfileSubmit() {
    if (!supabase) { setStep('welcome'); return; }

    setSavingProfile(true);
    try {
      const updates: Record<string, unknown> = {};
      if (especialidad) updates.especialidad = especialidad;

      await supabase.from('profiles').update(updates).eq('id', profile.id);

      // Guardar métricas iniciales en user_metrics si aplica
      if (ingresosMensuales || horasSemana) {
        const semanaKey = new Date().toISOString().split('T')[0];
        await supabase.from('metricas_semana').upsert({
          user_id: profile.id,
          semana: semanaKey,
          ingreso_mensual: parseFloat(ingresosMensuales) || 0,
          horas_semana: parseFloat(horasSemana) || 0,
          frustracion_principal: frustracion || null,
        }, { onConflict: 'user_id,semana', ignoreDuplicates: false }).select();
      }

      setStep('welcome');
    } catch {
      // No bloqueamos el flujo si falla
      setStep('welcome');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleComplete() {
    if (!supabase) { onComplete(); return; }
    await supabase.from('profiles').update({ onboarding_completed: true, status: 'ACTIVE' }).eq('id', profile.id);
    onComplete();
  }

  const nombreCorto = profile.nombre.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 selection:bg-blue-500/30">
      {/* Background glows */}
      <div className="absolute top-0 left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {(['password', 'profile', 'welcome'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-indigo-500' :
                (s === 'password' && step !== 'password') || (s === 'profile' && step === 'welcome')
                  ? 'w-4 bg-indigo-500/40'
                  : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: PASSWORD ── */}
        {step === 'password' && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <span className="text-xl">🔐</span>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Hola, {nombreCorto}</h1>
              <p className="text-sm text-gray-400">Para empezar, elegí una contraseña personal. La contraseña temporal que te enviamos ya no va a funcionar.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirmar contraseña</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Repetí la contraseña"
                  className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'border-emerald-500/50'
                      : 'border-white/10 focus:border-indigo-500/50'
                  }`}
                />
              </div>
            </div>

            {/* Password strength hint */}
            {newPassword.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[1,2,3].map(i => (
                    <div key={i} className={`h-1 w-8 rounded-full transition-colors ${
                      newPassword.length >= i * 4 ? 'bg-emerald-500' : 'bg-white/10'
                    }`} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">
                  {newPassword.length < 4 ? 'Muy corta' : newPassword.length < 8 ? 'Casi...' : 'OK'}
                </span>
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              disabled={savingPwd || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full mt-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continuar</>}
            </button>
          </div>
        )}

        {/* ── STEP 2: PROFILE ── */}
        {step === 'profile' && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-xl">👤</span>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Contanos sobre vos</h1>
              <p className="text-sm text-gray-400">Esta info nos ayuda a personalizar tu hoja de ruta y el Coach IA.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">¿Cuál es tu profesión?</label>
                <div className="flex flex-wrap gap-2">
                  {ESPECIALIDADES.map(esp => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => setEspecialidad(esp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        especialidad === esp
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-white/[0.04] text-gray-400 border border-white/10 hover:border-white/20 hover:text-gray-200'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ingresos mensuales (USD)</label>
                  <input
                    type="number"
                    value={ingresosMensuales}
                    onChange={e => setIngresosMensuales(e.target.value)}
                    placeholder="Ej: 2000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Horas/semana trabajadas</label>
                  <input
                    type="number"
                    value={horasSemana}
                    onChange={e => setHorasSemana(e.target.value)}
                    placeholder="Ej: 40"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">¿Cuál es tu mayor frustración hoy?</label>
                <textarea
                  value={frustracion}
                  onChange={e => setFrustracion(e.target.value)}
                  placeholder="Ej: No sé cómo conseguir pacientes, no tengo tiempo para redes..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('welcome')}
                className="px-5 py-3 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
              >
                Saltar
              </button>
              <button
                onClick={handleProfileSubmit}
                disabled={savingProfile}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continuar</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: WELCOME ── */}
        {step === 'welcome' && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-white mb-3">¡Bienvenido/a, {nombreCorto}!</h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Ya estás dentro. Tu Driver Lead es <span className="text-indigo-400 font-semibold">Paolis</span> — podés escribirle en cualquier momento desde el Chat.
            </p>

            {/* Quick overview */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: '🗺️', label: 'Hoja de Ruta', desc: 'Tu camino paso a paso' },
                { icon: '🤖', label: 'Coach IA', desc: 'Disponible 24/7' },
                { icon: '💬', label: 'Chat con Paolis', desc: 'Acompañamiento real' },
              ].map(item => (
                <div key={item.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-xs font-semibold text-white mb-1">{item.label}</p>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-4 h-4" /> Empezar mi programa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
