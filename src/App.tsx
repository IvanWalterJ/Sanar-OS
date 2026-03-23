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
import { X, User, Bell, Shield, CreditCard } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

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
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'roadmap' && <Roadmap />}
          {currentPage === 'coach' && <Coach />}
          {currentPage === 'metrics' && <Metrics />}
          {currentPage === 'oferta' && <Oferta />}
          {currentPage === 'mensajes' && <Mensajes />}
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
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-medium text-sm">
                  <User className="w-4 h-4" /> Perfil
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors text-sm">
                  <Bell className="w-4 h-4" /> Notificaciones
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors text-sm">
                  <Shield className="w-4 h-4" /> Seguridad
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors text-sm">
                  <CreditCard className="w-4 h-4" /> Facturación
                </button>
              </div>

              {/* Settings Content */}
              <div className="w-2/3 p-6 overflow-y-auto">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
