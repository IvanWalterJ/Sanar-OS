import React from 'react';
import { TrendingUp, CheckCircle2, Clock, ChevronRight, MoreVertical, Play, MessageSquare, Target } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Sem 1', value: 1200 },
  { name: 'Sem 2', value: 1900 },
  { name: 'Sem 3', value: 1500 },
  { name: 'Sem 4', value: 2800 },
  { name: 'Sem 5', value: 2400 },
  { name: 'Sem 6', value: 3500 },
  { name: 'Sem 7', value: 4200 },
];

export default function Dashboard({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">Buenos días,</p>
          <h1 className="text-3xl font-light tracking-tight text-white">Dra. Marcela S.</h1>
        </div>
        <div className="flex gap-2">
          <div onClick={() => setCurrentPage('metrics')} className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:bg-white/5 transition-colors">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>Última Semana</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Progress Card */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-8 relative z-10">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ingreso Mensual</p>
            <div className="px-2 py-1 rounded bg-white/5 text-xs text-gray-300 border border-white/10">
              Marzo
            </div>
          </div>
          <div className="mb-8 relative z-10">
            <h2 className="text-4xl font-light text-white mb-2">$4,500 <span className="text-lg text-gray-500">USD</span></h2>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progreso hacia objetivo</span>
              <span>$10,000 USD</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-[45%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            </div>
          </div>
        </div>

        {/* Spaces / Modules */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-medium text-gray-200">Módulos Activos</h3>
            <button onClick={() => setCurrentPage('roadmap')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => setCurrentPage('coach')} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-200">Sanare Coach</p>
              <p className="text-xs text-gray-500 mt-1">Asistente IA 24/7</p>
            </div>
            <div onClick={() => setCurrentPage('oferta')} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-200">Generador</p>
              <p className="text-xs text-gray-500 mt-1">Oferta Premium</p>
            </div>
          </div>
        </div>

        {/* Team / Patients */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-200 mb-6">Pacientes Activos</h3>
          <div className="space-y-4">
            {[
              { name: 'Alisa Snow', program: 'Programa 8 Semanas', img: 'https://i.pravatar.cc/150?img=1' },
              { name: 'Karl Coleman', program: 'Consulta Inicial', img: 'https://i.pravatar.cc/150?img=11' },
              { name: 'William Cooper', program: 'Programa 8 Semanas', img: 'https://i.pravatar.cc/150?img=12' },
              { name: 'Erick Snow', program: 'Seguimiento', img: 'https://i.pravatar.cc/150?img=13' },
            ].map((patient, i) => (
              <div key={i} onClick={() => setCurrentPage('mensajes')} className="flex items-center gap-3 group cursor-pointer">
                <img src={patient.img} alt={patient.name} className="w-10 h-10 rounded-full border border-white/10 group-hover:border-blue-500/50 transition-colors" />
                <div>
                  <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{patient.name}</p>
                  <p className="text-xs text-gray-500">{patient.program}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-medium text-gray-200">Foco de la Semana</h3>
            <button className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <MoreVertical className="w-3 h-3 text-gray-400" />
            </button>
          </div>
          <div className="space-y-5">
            <div className="group">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-blue-400" /></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">Definir 3 paquetes de precios</p>
                  <p className="text-xs text-gray-500 mt-1">Fase 2: Oferta</p>
                </div>
              </div>
              <div className="ml-7 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-full rounded-full" />
              </div>
            </div>
            <div className="group">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-0.5"><Clock className="w-4 h-4 text-purple-400" /></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">Analizar oferta con IA</p>
                  <p className="text-xs text-gray-500 mt-1">Fase 2: Oferta</p>
                </div>
                <span className="text-xs text-gray-500">50%</span>
              </div>
              <div className="ml-7 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[50%] rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              </div>
            </div>
            <div className="group">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-0.5"><div className="w-4 h-4 rounded-full border border-gray-600" /></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Agendar Sesión 2 con Javo</p>
                  <p className="text-xs text-gray-600 mt-1">Fase 2: Oferta</p>
                </div>
              </div>
            </div>
          </div>
          
          <div onClick={() => setCurrentPage('roadmap')} className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 flex items-center justify-between cursor-pointer hover:bg-blue-500/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Play className="w-3 h-3 text-blue-400 ml-0.5" />
              </div>
              <span className="text-sm font-medium text-blue-400">Continuar Fase 2</span>
            </div>
            <span className="text-xs text-blue-400/60">50%</span>
          </div>
        </div>

        {/* Metrics Table / Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-medium text-gray-200">Evolución de Ingresos</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                +15.3% vs mes anterior
              </span>
            </div>
          </div>
          
          <div className="flex-1 w-full" style={{ minHeight: 200, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#3B82F6' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="pb-3 font-medium">Métrica</th>
                  <th className="pb-3 font-medium">Semana Actual</th>
                  <th className="pb-3 font-medium">Semana Anterior</th>
                  <th className="pb-3 font-medium text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-gray-300">Visitas Landing</td>
                  <td className="py-3 text-white">1,245</td>
                  <td className="py-3 text-gray-500">980</td>
                  <td className="py-3 text-right text-emerald-400">+27%</td>
                </tr>
                <tr className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-gray-300">Leads Captados</td>
                  <td className="py-3 text-white">86</td>
                  <td className="py-3 text-gray-500">64</td>
                  <td className="py-3 text-right text-emerald-400">+34%</td>
                </tr>
                <tr className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-gray-300">Ventas Cerradas</td>
                  <td className="py-3 text-white">12</td>
                  <td className="py-3 text-gray-500">8</td>
                  <td className="py-3 text-right text-emerald-400">+50%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
