/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Coach from './pages/Coach';
import Metrics from './pages/Metrics';
import Mensajes from './pages/Mensajes';
import DiarioDirector from './pages/DiarioDirector';
import Biblioteca from './pages/Biblioteca';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { X, User, Bell, Shield, CreditCard, LogOut } from 'lucide-react';
import { supabase, isSupabaseReady, type Profile as SupabaseProfile } from './lib/supabase';
import { signOut, syncProfileToLocalStorage } from './lib/auth';
import { toast } from 'sonner';

type SettingsTab = 'perfil' | 'notificaciones' | 'seguridad' | 'facturacion';

interface Profile {
  nombre: string;
  email: string;
  especialidad: string;
  fecha_inicio: string;
  plan: 'DWY' | 'DFY';
}

function loadProfile(): Profile {
  try {
    const saved = localStorage.getItem('tcd_profile');
    if (saved) return JSON.parse(saved);
  } catch { /* noop */ }
  const today = new Date().toISOString().split('T')[0];
  return { nombre: 'Profesional', email: '', especialidad: '', fecha_inicio: today, plan: 'DWY' };
}

type AuthState = 'loading' | 'logged_out' | 'logged_in';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('perfil');
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [profileDraft, setProfileDraft] = useState<Profile>(loadProfile);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [profileLoading, setProfileLoading] = useState(false);
  const [supabaseProfile, setSupabaseProfile] = useState<SupabaseProfile | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  // ─── Auth init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady() || !supabase) {
      // No Supabase configured — skip auth, go straight to app (dev mode)
      const existing = localStorage.getItem('tcd_profile');
      if (!existing) localStorage.setItem('tcd_profile', JSON.stringify(profile));
      setAuthState('logged_in');
      return;
    }

    // Safety valve: never leave user stuck on spinner
    const safetyTimer = setTimeout(() => {
      setAuthState(prev => prev === 'loading' ? 'logged_out' : prev);
    }, 5000);

    // Single source of truth — handles page load (INITIAL_SESSION) + login + logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        clearTimeout(safetyTimer);
        setSupabaseProfile(null);
        setAuthState('logged_out');
        return;
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        setProfileLoading(true);
        await loadSupabaseProfile(session.user.id);
        clearTimeout(safetyTimer);
        setProfileLoading(false);
        setAuthState('logged_in');
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function loadSupabaseProfile(userId: string) {
    if (!supabase) return;
    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 4000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && data) {
        setSupabaseProfile(data as SupabaseProfile);
        syncProfileToLocalStorage(data as SupabaseProfile);
        const p: Profile = {
          nombre: data.nombre,
          email: data.email,
          especialidad: data.especialidad ?? '',
          fecha_inicio: data.fecha_inicio,
          plan: data.plan,
        };
        setProfile(p);
        setProfileDraft(p);
      } else {
        console.warn('loadSupabaseProfile: no data or timeout.', error?.message);
      }
    } catch (err) {
      console.error('loadSupabaseProfile exception:', err);
    }
  }

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [currentPage]);

  const openSettings = () => {
    setProfileDraft(loadProfile());
    setShowSettings(true);
  };

  const saveProfile = async () => {
    localStorage.setItem('tcd_profile', JSON.stringify(profileDraft));
    setProfile(profileDraft);

    // Also update in Supabase if available
    if (supabase && supabaseProfile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre: profileDraft.nombre,
          especialidad: profileDraft.especialidad,
          fecha_inicio: profileDraft.fecha_inicio,
          plan: profileDraft.plan,
        })
        .eq('id', supabaseProfile.id);

      if (error) {
        toast.error('Error al guardar en la nube. Los cambios se guardaron localmente.');
      }
    }

    setShowSettings(false);
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('tcd_profile');
    setShowSettings(false);
    setAuthState('logged_out');
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (authState === 'loading' || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Not logged in ──────────────────────────────────────────────────────────
  if (authState === 'logged_out') {
    return <Login onLogin={() => { /* noop: onAuthStateChange handles state */ }} />;
  }

  // ─── Admin view ─────────────────────────────────────────────────────────────
  if (supabaseProfile?.rol === 'admin') {
    return <Admin adminProfile={supabaseProfile} onSignOut={handleSignOut} />;
  }

  // ─── Main app ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0B0F19] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onOpenSettings={openSettings}
        onSignOut={handleSignOut}
        messageBadge={unreadMessages}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Topbar setCurrentPage={setCurrentPage} />
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide">
          <div className="p-6">
            {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} userId={supabaseProfile?.id} />}
            {currentPage === 'roadmap' && <Roadmap userId={supabaseProfile?.id} />}
            {currentPage === 'coach' && <Coach userId={supabaseProfile?.id} />}
            {currentPage === 'metrics' && <Metrics userId={supabaseProfile?.id} />}
            {currentPage === 'mensajes' && <Mensajes userId={supabaseProfile?.id} onUnreadChange={setUnreadMessages} />}
            {currentPage === 'diario' && <DiarioDirector userId={supabaseProfile?.id} />}
            {currentPage === 'biblioteca' && <Biblioteca userId={supabaseProfile?.id} />}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-medium text-white">Ajustes de la Cuenta</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Settings Sidebar */}
              <div className="w-1/3 border-r border-white/10 p-4 space-y-2 bg-white/[0.02] flex flex-col">
                <div className="flex-1 space-y-2">
                  {([
                    { id: 'perfil' as SettingsTab, label: 'Perfil', icon: User },
                    { id: 'notificaciones' as SettingsTab, label: 'Notificaciones', icon: Bell },
                    { id: 'seguridad' as SettingsTab, label: 'Seguridad', icon: Shield },
                    { id: 'facturacion' as SettingsTab, label: 'Facturación', icon: CreditCard },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                        settingsTab === tab.id
                          ? 'bg-blue-500/10 text-blue-400 font-medium'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>
                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors mt-auto"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>

              {/* Settings Content */}
              <div className="w-2/3 p-6 overflow-y-auto">
                {settingsTab === 'perfil' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">Información Personal</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            value={profileDraft.nombre}
                            onChange={e => setProfileDraft({ ...profileDraft, nombre: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            value={profileDraft.email}
                            disabled
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-600 mt-1">El email no se puede cambiar desde aquí</p>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Especialidad</label>
                          <input
                            type="text"
                            value={profileDraft.especialidad}
                            onChange={e => setProfileDraft({ ...profileDraft, especialidad: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Fecha de inicio del programa</label>
                          <input
                            type="date"
                            value={profileDraft.fecha_inicio}
                            onChange={e => setProfileDraft({ ...profileDraft, fecha_inicio: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plan</label>
                          <select
                            value={profileDraft.plan}
                            onChange={e => setProfileDraft({ ...profileDraft, plan: e.target.value as 'DWY' | 'DFY' })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                          >
                            <option value="DWY">DWY — Do it With You</option>
                            <option value="DFY">DFY — Done For You</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                      <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={saveProfile} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'notificaciones' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-white mb-4">Preferencias de Notificaciones</h3>
                    {['Recordatorios del diario', 'Mensajes del equipo', 'Recordatorios de tareas', 'Resumen semanal'].map((item, i) => (
                      <label key={i} className="flex items-center justify-between py-3 border-b border-white/5">
                        <span className="text-sm text-gray-300">{item}</span>
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-500" />
                      </label>
                    ))}
                  </div>
                )}

                {settingsTab === 'seguridad' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-white mb-4">Seguridad</h3>
                    <p className="text-sm text-gray-400">Para cambiar tu contraseña, pedile a tu coach que te envíe un email de restablecimiento.</p>
                  </div>
                )}

                {settingsTab === 'facturacion' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-white mb-4">Facturación</h3>
                    <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Plan Actual</span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                          Tu Clínica Digital — {profile.plan}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Programa de 90 días</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
