/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Coach from './pages/Coach';
import Metrics from './pages/Metrics';
import Oferta from './pages/Oferta';
import Mensajes from './pages/Mensajes';
import Onboarding from './pages/Onboarding';
import PHRCalculator from './pages/PHRCalculator';
import ContentGenerator from './pages/ContentGenerator';
import DiarioDirector from './pages/DiarioDirector';
import { X, User, Bell, Shield, CreditCard } from 'lucide-react';

type SettingsTab = 'perfil' | 'notificaciones' | 'seguridad' | 'facturacion';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('perfil');

  return (
    <div className="flex h-screen bg-[#0B0F19] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onOpenSettings={() => setShowSettings(true)} 
      />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Topbar setCurrentPage={setCurrentPage} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide">
          <div className="p-6">
            {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}
            {currentPage === 'roadmap' && <Roadmap />}
            {currentPage === 'coach' && <Coach />}
            {currentPage === 'metrics' && <Metrics />}
            {currentPage === 'oferta' && <Oferta />}
            {currentPage === 'mensajes' && <Mensajes />}
            {currentPage === 'onboarding' && <Onboarding />}
            {currentPage === 'phr' && <PHRCalculator />}
            {currentPage === 'contenido' && <ContentGenerator />}
            {currentPage === 'diario' && <DiarioDirector />}
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
              <div className="w-1/3 border-r border-white/10 p-4 space-y-2 bg-white/[0.02]">
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

              {/* Settings Content */}
              <div className="w-2/3 p-6 overflow-y-auto">
                {settingsTab === 'perfil' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">Información Personal</h3>
                      <div className="flex items-center gap-4 mb-6">
                        <img src="https://i.pravatar.cc/150?img=32" alt="Profile" className="w-16 h-16 rounded-full border border-white/20" />
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                          Cambiar Foto
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                          <input type="text" defaultValue="Dra. Marcela S." className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Correo Electrónico</label>
                          <input type="email" defaultValue="marcela@ejemplo.com" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Especialidad</label>
                          <input type="text" defaultValue="Nutricionista" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                      <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'notificaciones' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-white mb-4">Preferencias de Notificaciones</h3>
                    {['Alertas de métricas semanales', 'Mensajes del equipo', 'Recordatorios de tareas', 'Actualizaciones del programa'].map((item, i) => (
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Contraseña Actual</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Nueva Contraseña</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50" />
                      </div>
                    </div>
                    <button className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">
                      Actualizar Contraseña
                    </button>
                  </div>
                )}

                {settingsTab === 'facturacion' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-white mb-4">Facturación</h3>
                    <div className="glass-panel p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Plan Actual</span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Tu Clínica Digital — Core</span>
                      </div>
                      <p className="text-xs text-gray-500">Próxima facturación: 15 de abril, 2026</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                      <p className="text-sm text-gray-300 mb-2">Método de Pago</p>
                      <p className="text-sm text-white">•••• •••• •••• 4242</p>
                      <p className="text-xs text-gray-500 mt-1">Visa · Expira 12/27</p>
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
