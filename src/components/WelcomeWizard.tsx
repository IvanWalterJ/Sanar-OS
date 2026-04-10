import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, Sparkles, Map, Bot, MessageSquare, BookOpen, LockKeyhole, UserCircle, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { toast } from 'sonner';

interface WelcomeWizardProps {
  profile: Profile;
  onComplete: (firstPage?: string) => void;
}

type Step = 'password' | 'profile' | 'welcome' | 'guide';

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

const STEPS: Step[] = ['password', 'profile', 'welcome', 'guide'];

export default function WelcomeWizard({ profile, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState<Step>('password');

  // Step 1 — password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Step 2 — profile
  const [especialidad, setEspecialidad] = useState(profile.especialidad ?? '');
  const [especialidadOtro, setEspecialidadOtro] = useState('');
  const [ingresosMensuales, setIngresosMensuales] = useState('');
  const [horasSemana, setHorasSemana] = useState('');
  const [frustracion, setFrustracion] = useState('');
  const [energia, setEnergia] = useState(5);
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
    setSavingProfile(true);
    try {
      const espFinal = especialidad === 'Otro' && especialidadOtro.trim()
        ? especialidadOtro.trim()
        : especialidad;

      if (supabase) {
        // Guardar especialidad en perfil
        if (espFinal) {
          await supabase.from('profiles').update({ especialidad: espFinal }).eq('id', profile.id);
        }

        // Guardar energía y frustración como primera entrada del diario
        const hoy = new Date().toISOString().split('T')[0];
        await supabase.from('diario_entradas').insert({
          user_id: profile.id,
          fecha: hoy,
          respuestas: {
            q1: frustracion.trim() ? `[Onboarding] ${frustracion.trim()}` : '',
            q2: '',
            q3: energia,
            q4: '',
            q5: '',
          },
        });
      }
      setStep('welcome');
    } catch {
      // No bloqueamos el flujo si algo falla
      setStep('welcome');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleComplete(firstPage?: string) {
    if (supabase) {
      await supabase.from('profiles')
        .update({ onboarding_completed: true, status: 'ACTIVE' })
        .eq('id', profile.id);
    }
    onComplete(firstPage);
  }

  const nombreCorto = profile.nombre.split(' ')[0];
  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 selection:bg-[#F5A623]/30">
      <div className="absolute top-0 left-[-10%] w-[500px] h-[500px] bg-[#F5A623]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-[#FFB94D]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8 sticky top-0 pt-2 pb-2 z-10">
          {STEPS.map((s, idx) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-[#F5A623]' :
                idx < currentStepIndex ? 'w-4 bg-[#F5A623]/40' : 'w-4 bg-[#F5A623]/10'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: PASSWORD ── */}
        {step === 'password' && (
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#F5A623] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(245,166,35,0.3)]">
                <LockKeyhole className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h1 className="text-2xl font-semibold text-[#FFFFFF] mb-2">Hola, {nombreCorto}</h1>
              <p className="text-sm text-[#FFFFFF]/60 leading-relaxed">
                Para empezar, elegí una contraseña personal. La contraseña temporal que te enviamos ya no va a funcionar después de esto.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-black/40 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 pr-12 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FFFFFF]/40 hover:text-[#FFFFFF]/80 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">Confirmar contraseña</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Repetí la contraseña"
                  className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm text-[#FFFFFF] focus:outline-none transition-colors ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/50 focus:border-red-500/70'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'border-emerald-500/50'
                      : 'border-[rgba(245,166,35,0.2)] focus:border-[#F5A623]/50'
                  }`}
                />
              </div>
            </div>

            {newPassword.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 w-8 rounded-full transition-colors ${newPassword.length >= i * 4 ? 'bg-[#22C55E]' : 'bg-[#F5A623]/10'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-[#FFFFFF]/40">
                  {newPassword.length < 4 ? 'Muy corta' : newPassword.length < 8 ? 'Casi...' : <span className="flex items-center gap-0.5">Lista <CheckCircle2 className="w-3 h-3 text-[#22C55E] inline" /></span>}
                </span>
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              disabled={savingPwd || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full mt-6 py-3.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-[#0A0A0A] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/20"
            >
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continuar</>}
            </button>
          </div>
        )}

        {/* ── STEP 2: PROFILE ── */}
        {step === 'profile' && (
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F5A623] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(245,166,35,0.3)]">
                <UserCircle className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h1 className="text-2xl font-semibold text-[#FFFFFF] mb-2">Contanos sobre vos</h1>
              <p className="text-sm text-[#FFFFFF]/60 leading-relaxed">
                Esta info le sirve a tu acompañante para conocerte mejor desde el día 1 y que el Coach IA te dé respuestas más precisas.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">¿Cuál es tu profesión?</label>
                <div className="flex flex-wrap gap-2">
                  {ESPECIALIDADES.map(esp => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => setEspecialidad(esp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        especialidad === esp
                          ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40'
                          : 'bg-[#141414] text-[#FFFFFF]/60 border border-[rgba(245,166,35,0.2)] hover:border-[rgba(245,166,35,0.3)] hover:text-[#FFFFFF]/90'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
                {especialidad === 'Otro' && (
                  <input
                    type="text"
                    autoFocus
                    value={especialidadOtro}
                    onChange={e => setEspecialidadOtro(e.target.value)}
                    placeholder="¿Cuál es tu profesión?"
                    className="mt-3 w-full bg-black/40 border border-[#F5A623]/30 rounded-xl px-4 py-2.5 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/60 transition-colors"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">
                  ¿Cómo está tu energía hoy? <span className="text-[#FFFFFF]/30 normal-case font-normal">(1 = agotado/a · 10 = con todo)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEnergia(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        n <= energia
                          ? 'bg-amber-500 text-[#0A0A0A] shadow-sm shadow-amber-500/30'
                          : 'bg-[#141414] text-[#FFFFFF]/30 border border-[rgba(245,166,35,0.2)] hover:border-[rgba(245,166,35,0.3)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">
                  ¿Cuál es tu mayor frustración hoy en tu práctica? <span className="text-[#FFFFFF]/30 normal-case font-normal">(opcional)</span>
                </label>
                <textarea
                  value={frustracion}
                  onChange={e => setFrustracion(e.target.value)}
                  placeholder="Ej: No sé cómo conseguir pacientes nuevos sin depender de referidos, siento que trabajo mucho y gano poco..."
                  rows={3}
                  className="w-full bg-black/40 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-colors resize-none"
                />
                <p className="text-[10px] text-[#FFFFFF]/30 mt-1.5">Tu coach va a leer esto para entenderte desde el inicio.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">Ingresos mensuales (USD)</label>
                  <input
                    type="number"
                    value={ingresosMensuales}
                    onChange={e => setIngresosMensuales(e.target.value)}
                    placeholder="Ej: 2000"
                    className="w-full bg-black/40 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-2">Horas/semana</label>
                  <input
                    type="number"
                    value={horasSemana}
                    onChange={e => setHorasSemana(e.target.value)}
                    placeholder="Ej: 40"
                    className="w-full bg-black/40 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('welcome')}
                className="px-5 py-3 rounded-xl text-sm text-[#FFFFFF]/40 hover:text-[#FFFFFF]/80 transition-colors"
              >
                Saltar
              </button>
              <button
                onClick={handleProfileSubmit}
                disabled={savingProfile}
                className="flex-1 py-3 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-[#0A0A0A] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/20"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continuar</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: WELCOME ── */}
        {step === 'welcome' && (
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-3xl p-8 shadow-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="w-16 h-16 rounded-2xl bg-[#22C55E] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-[#FFFFFF]" />
            </div>

            <h1 className="text-2xl font-semibold text-[#FFFFFF] mb-3">¡Bienvenido/a, {nombreCorto}!</h1>
            <p className="text-sm text-[#FFFFFF]/60 leading-relaxed mb-2">
              Ya estás dentro del programa.
            </p>
            <p className="text-sm text-[#FFFFFF]/80 leading-relaxed mb-6">
              <span className="text-[#F5A623] font-semibold">Nuestro equipo</span> te acompaña en todo el proceso — seguimos tu progreso, respondemos tus dudas y te guiamos paso a paso. Podés escribirnos en cualquier momento desde el Chat.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Map, label: 'Hoja de Ruta', desc: 'Tu camino paso a paso' },
                { icon: Bot, label: 'Coach IA', desc: 'Disponible 24/7' },
                { icon: MessageSquare, label: 'Chat directo', desc: 'Soporte siempre' },
              ].map(item => (
                <div key={item.label} className="bg-[#141414] border border-[rgba(245,166,35,0.1)] rounded-2xl p-4">
                  <div className="mb-2"><item.icon className="w-6 h-6 text-[#F5A623]" /></div>
                  <p className="text-xs font-semibold text-[#FFFFFF] mb-1">{item.label}</p>
                  <p className="text-[10px] text-[#FFFFFF]/40">{item.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('guide')}
              className="w-full py-4 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] text-[#0A0A0A] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/20"
            >
              <ArrowRight className="w-4 h-4" /> Ver cómo empezar
            </button>
          </div>
        )}

        {/* ── STEP 4: GUIDE ── */}
        {step === 'guide' && (
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Rocket className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <h1 className="text-xl font-semibold text-[#FFFFFF] mb-2">¿Por dónde empezar?</h1>
              <p className="text-sm text-[#FFFFFF]/60">Estos son tus primeros 3 pasos concretos:</p>
            </div>

            <div className="space-y-3 mb-8">
              {([
                {
                  num: '1',
                  icon: Map,
                  title: 'Abrí tu Hoja de Ruta',
                  desc: 'Ahí están todos los pilares del programa. Mirá en qué pilar empezás y completá la primera tarea.',
                  styles: {
                    card: 'bg-[#F5A623]/5 border-[#F5A623]/20 hover:bg-[#F5A623]/10',
                    icon: 'bg-[#F5A623]/20',
                    iconColor: 'text-[#F5A623]',
                    step: 'text-[#F5A623]/60',
                    title: 'text-[#F5A623]',
                    arrow: 'text-[#F5A623]/40 group-hover:text-[#F5A623]',
                  },
                  page: 'roadmap',
                },
                {
                  num: '2',
                  icon: MessageSquare,
                  title: 'Escribinos al Chat',
                  desc: 'Mandá un mensaje presentándote. Ya tenemos tu información y te vamos a responder lo antes posible.',
                  styles: {
                    card: 'bg-[#F5A623]/5 border-[#F5A623]/20 hover:bg-[#F5A623]/10',
                    icon: 'bg-[#F5A623]/20',
                    iconColor: 'text-[#F5A623]',
                    step: 'text-[#F5A623]/60',
                    title: 'text-[#F5A623]',
                    arrow: 'text-[#F5A623]/40 group-hover:text-[#F5A623]',
                  },
                  page: 'mensajes',
                },
                {
                  num: '3',
                  icon: Bot,
                  title: 'Probá el Coach IA',
                  desc: 'Hacele cualquier pregunta sobre tu negocio. Está entrenado para el contexto de profesionales de la salud.',
                  styles: {
                    card: 'bg-[#F5A623]/5 border-[#F5A623]/20 hover:bg-[#F5A623]/10',
                    icon: 'bg-[#F5A623]/20',
                    iconColor: 'text-[#F5A623]',
                    step: 'text-[#F5A623]/60',
                    title: 'text-[#F5A623]',
                    arrow: 'text-[#F5A623]/40 group-hover:text-[#F5A623]',
                  },
                  page: 'coach',
                },
              ] as const).map(item => (
                <button
                  key={item.num}
                  onClick={() => handleComplete(item.page)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all group ${item.styles.card}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.styles.icon}`}>
                      <item.icon className={`w-4 h-4 ${item.styles.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${item.styles.step}`}>Paso {item.num}</span>
                      <p className={`text-sm font-semibold mb-0.5 mt-0.5 ${item.styles.title}`}>{item.title}</p>
                      <p className="text-xs text-[#FFFFFF]/40 leading-relaxed">{item.desc}</p>
                    </div>
                    <ArrowRight className={`w-4 h-4 transition-colors shrink-0 mt-2 ${item.styles.arrow}`} />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleComplete('dashboard')}
              className="w-full py-3 rounded-xl bg-[#F5A623]/5 border border-[rgba(245,166,35,0.2)] hover:bg-[#F5A623]/10 text-[#FFFFFF]/60 hover:text-[#FFFFFF] text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Ir al dashboard primero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
