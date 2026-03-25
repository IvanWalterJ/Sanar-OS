import React, { useState } from 'react';
import { Play, Download, Wrench, FileText, X, Clock, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import Oferta from './Oferta';
import PHRCalculator from './PHRCalculator';
import ContentGenerator from './ContentGenerator';
import Onboarding from './Onboarding';

// ─── Types ────────────────────────────────────────────────────────────────────

type BibliotecaTab = 'videos' | 'herramientas' | 'recursos' | 'guiones';
type HerramientaId = 'oferta' | 'phr' | 'contenido' | 'diagnostico';

interface VideoPlaceholder {
  fase: 1 | 2 | 3;
  orden: number;
  titulo: string;
  descripcion: string;
  duracion_minutos: number;
  url_embed: string | null;
}

interface RecursoPlaceholder {
  categoria: string;
  titulo: string;
  descripcion: string;
  url_archivo: string | null;
}

interface GuionTemplate {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
}

// ─── Seed data (Paolis llenará esto desde Supabase) ──────────────────────────

const VIDEOS_PLACEHOLDER: VideoPlaceholder[] = [
  { fase: 1, orden: 1, titulo: 'Bienvenida al programa', descripcion: 'Qué vas a lograr en 90 días y cómo sacarle el máximo provecho a cada fase.', duracion_minutos: 0, url_embed: null },
  { fase: 1, orden: 2, titulo: 'Cómo definir tu especialidad', descripcion: 'El método para encontrar el nicho exacto donde podés ser la mejor opción.', duracion_minutos: 0, url_embed: null },
  { fase: 1, orden: 3, titulo: 'Tu cliente ideal en profundidad', descripcion: 'Ejercicio práctico para conocer a tu paciente ideal mejor de lo que se conoce a sí misma.', duracion_minutos: 0, url_embed: null },
  { fase: 2, orden: 1, titulo: 'Cómo crear tu landing page', descripcion: 'La estructura exacta que convierte visitantes en prospectos calificados.', duracion_minutos: 0, url_embed: null },
  { fase: 2, orden: 2, titulo: 'El guión de venta que funciona', descripcion: 'Palabra por palabra: cómo conducir una llamada de diagnóstico sin presionar.', duracion_minutos: 0, url_embed: null },
  { fase: 3, orden: 1, titulo: 'Tu primera semana de ventas', descripcion: 'Cómo iniciar conversaciones, gestionar el rechazo y cerrar los primeros clientes.', duracion_minutos: 0, url_embed: null },
];

const RECURSOS_PLACEHOLDER: RecursoPlaceholder[] = [
  { categoria: 'Planillas', titulo: 'Planilla de seguimiento semanal', descripcion: 'Registrá tus leads, conversaciones y ventas de cada semana del programa.', url_archivo: null },
  { categoria: 'Checklist', titulo: 'Checklist de lanzamiento', descripcion: 'Los 20 pasos que tenés que completar antes de publicar tu primera oferta.', url_archivo: null },
  { categoria: 'Templates', titulo: 'Plantilla de propuesta de valor', descripcion: 'Estructura lista para completar con tu especialidad y resultados prometidos.', url_archivo: null },
  { categoria: 'Guías', titulo: 'Guía de precios high-ticket', descripcion: 'Cómo establecer y defender tu precio sin sentir que lo tenés que justificar.', url_archivo: null },
];

const GUIONES: GuionTemplate[] = [
  {
    id: 'g1',
    titulo: 'Guión de llamada de diagnóstico',
    categoria: 'Venta',
    contenido: `GUIÓN DE LLAMADA DE DIAGNÓSTICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[APERTURA — 2 min]
"Hola [Nombre], gracias por reservar este espacio. Esta es una llamada de 30 minutos para entender en qué punto estás y ver si puedo ayudarte.

Antes de arrancar, ¿en qué situación estás hoy con [el problema que resolvés]?"

[DIAGNÓSTICO — 10 min]
- ¿Hace cuánto tiempo tenés este problema?
- ¿Qué ya intentaste para resolverlo?
- ¿Qué pasa si no lo resolvés en los próximos 6 meses?
- ¿Cuánto te está costando (tiempo, dinero, salud) no tener esto resuelto?

[PRESENTACIÓN — 10 min]
"Basándome en lo que me contaste, creo que puedo ayudarte. Mi programa [NOMBRE] hace exactamente eso: [propuesta de valor en 1 oración].

En 90 días, vas a tener [resultado 1], [resultado 2] y [resultado 3]."

[CIERRE — 5 min]
"¿Tiene sentido para vos? ¿Cómo querés avanzar?"

[MANEJO DE OBJECIONES]
- "Es caro": "¿Cuánto te está costando NO tenerlo resuelto?"
- "Lo tengo que pensar": "¿Qué necesitarías para tomar la decisión hoy?"
- "No tengo tiempo": "¿Qué pasa si le das 30 minutos por día durante 90 días?"`,
  },
  {
    id: 'g2',
    titulo: 'Guión de email de bienvenida',
    categoria: 'Email',
    contenido: `EMAIL DE BIENVENIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Asunto: Bienvenida, [Nombre] — tu próximo paso está acá

Hola [Nombre],

Gracias por registrarte. Ya diste el primer paso.

Sé que [el problema que tienen] puede sentirse abrumador. Cada día que pasa sin resolverlo cuesta tiempo, dinero y energía. Y eso tiene que terminar.

Por eso creé [nombre del programa]: para acompañar a [descripción del cliente ideal] exactamente como vos a lograr [resultado principal] en [tiempo].

Tu próximo paso es simple: [CTA concreto — reservar llamada / completar formulario / etc.]

[BOTÓN: [Texto del CTA]]

Estoy para lo que necesites.

[Tu nombre]
[Tu especialidad]`,
  },
  {
    id: 'g3',
    titulo: 'Guión de post de Instagram',
    categoria: 'Contenido',
    contenido: `POST DE INSTAGRAM — Formato Historia de Transformación
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[GANCHO — primera línea]
"[Resultado impactante] en [tiempo] sin [objeción común]."

[HISTORIA — 3-4 oraciones]
Antes: [situación inicial del cliente]
Problema: [qué le pasaba, en sus propias palabras]
Proceso: [qué hiciste juntas]
Resultado: [transformación concreta y específica]

[PUENTE]
"Si vos también [situación inicial], esto es para vos."

[CTA]
"Escribime [palabra clave] en comentarios o DM y te cuento cómo funciona."

---
📌 TIPS:
- Usá números reales (3 semanas, 12 kilos, $50.000)
- Terminá siempre con una pregunta o CTA
- Publicá con una foto del antes/después o una imagen que represente la transformación`,
  },
];

// ─── Componentes ─────────────────────────────────────────────────────────────

function VideoCard({ video, watched, onToggle }: { video: VideoPlaceholder; watched: boolean; onToggle: () => void }) {
  return (
    <div className={`glass-panel p-4 rounded-xl transition-all ${watched ? 'opacity-60' : ''}`}>
      {video.url_embed ? (
        <div className="aspect-video bg-black/30 rounded-lg mb-3 overflow-hidden">
          <iframe src={video.url_embed} className="w-full h-full" allowFullScreen title={video.titulo} />
        </div>
      ) : (
        <div className="aspect-video bg-white/5 rounded-lg mb-3 flex flex-col items-center justify-center gap-2">
          <Play className="w-8 h-8 text-gray-600" />
          <p className="text-xs text-gray-600">Video próximamente</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-1">{video.titulo}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{video.descripcion}</p>
          {video.duracion_minutos > 0 && (
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {video.duracion_minutos} min
            </p>
          )}
        </div>
        <button
          onClick={onToggle}
          title={watched ? 'Marcar como no visto' : 'Marcar como visto'}
          className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            watched ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const HERRAMIENTAS = [
  { id: 'oferta' as HerramientaId, titulo: 'Generador de Oferta', descripcion: 'Creá tu oferta premium con IA: propuesta de valor, paquetes y landing.', color: 'from-purple-500 to-indigo-600' },
  { id: 'phr' as HerramientaId, titulo: 'Calculadora PHR', descripcion: 'Calculá tu Precio Hora Real y cuánto vale realmente tu tiempo.', color: 'from-emerald-500 to-teal-600' },
  { id: 'contenido' as HerramientaId, titulo: 'Generador de Contenido', descripcion: 'Ideas de contenido, borradores y calendario editorial con IA.', color: 'from-blue-500 to-cyan-600' },
  { id: 'diagnostico' as HerramientaId, titulo: 'Diagnóstico Digital', descripcion: 'Analizá tu presencia digital actual y generá tu perfil profesional.', color: 'from-amber-500 to-orange-600' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Biblioteca() {
  const [activeTab, setActiveTab] = useState<BibliotecaTab>('videos');
  const [activeFase, setActiveFase] = useState<1 | 2 | 3>(1);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tcd_watched_videos') || '[]')); }
    catch { return new Set(); }
  });
  const [openHerramienta, setOpenHerramienta] = useState<HerramientaId | null>(null);
  const [editingGuion, setEditingGuion] = useState<string | null>(null);
  const [guionTexts, setGuionTexts] = useState<Record<string, string>>(
    Object.fromEntries(GUIONES.map(g => [g.id, g.contenido]))
  );

  const toggleWatched = (key: string) => {
    setWatchedVideos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem('tcd_watched_videos', JSON.stringify([...next]));
      return next;
    });
  };

  const tabs: { id: BibliotecaTab; label: string; icon: React.ElementType }[] = [
    { id: 'videos', label: 'Videos', icon: Play },
    { id: 'herramientas', label: 'Herramientas', icon: Wrench },
    { id: 'recursos', label: 'Recursos', icon: Download },
    { id: 'guiones', label: 'Guiones', icon: FileText },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Biblioteca</h1>
        <p className="text-gray-400 text-sm">Videos del programa, herramientas IA, recursos descargables y guiones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-panel p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── VIDEOS ── */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {([1, 2, 3] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFase(f)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                  activeFase === f ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Fase {f}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VIDEOS_PLACEHOLDER.filter(v => v.fase === activeFase).map((video, i) => {
              const key = `f${video.fase}-${video.orden}`;
              return (
                <VideoCard
                  key={i}
                  video={video}
                  watched={watchedVideos.has(key)}
                  onToggle={() => toggleWatched(key)}
                />
              );
            })}
          </div>
          <p className="text-xs text-gray-600 text-center">
            Los videos son cargados por el equipo. Si aún no están disponibles, volvé pronto.
          </p>
        </div>
      )}

      {/* ── HERRAMIENTAS ── */}
      {activeTab === 'herramientas' && (
        <>
          {openHerramienta ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenHerramienta(null)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Volver a Herramientas
                </button>
              </div>
              <div className="animate-in fade-in duration-300">
                {openHerramienta === 'oferta' && <Oferta />}
                {openHerramienta === 'phr' && <PHRCalculator />}
                {openHerramienta === 'contenido' && <ContentGenerator />}
                {openHerramienta === 'diagnostico' && <Onboarding />}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HERRAMIENTAS.map(h => (
                <div key={h.id} className="glass-panel p-6 rounded-2xl hover:bg-white/[0.03] transition-colors">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-medium mb-1">{h.titulo}</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{h.descripcion}</p>
                  <button
                    onClick={() => setOpenHerramienta(h.id)}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Usar herramienta
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── RECURSOS ── */}
      {activeTab === 'recursos' && (
        <div className="space-y-4">
          {RECURSOS_PLACEHOLDER.map((recurso, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{recurso.categoria}</span>
                </div>
                <p className="text-sm font-medium text-white">{recurso.titulo}</p>
                <p className="text-xs text-gray-400 mt-1">{recurso.descripcion}</p>
              </div>
              {recurso.url_archivo ? (
                <a
                  href={recurso.url_archivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Descargar
                </a>
              ) : (
                <span className="shrink-0 text-xs text-gray-600">Próximamente</span>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-600 text-center">
            Los recursos son cargados por el equipo. Si aún no están disponibles, volvé pronto.
          </p>
        </div>
      )}

      {/* ── GUIONES ── */}
      {activeTab === 'guiones' && (
        <div className="space-y-4">
          {GUIONES.map(guion => (
            <div key={guion.id} className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{guion.titulo}</p>
                    <p className="text-xs text-gray-500">{guion.categoria}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(guionTexts[guion.id]).then(() => alert('¡Copiado!'))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => setEditingGuion(editingGuion === guion.id ? null : guion.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    {editingGuion === guion.id ? 'Cerrar' : 'Editar'}
                  </button>
                </div>
              </div>

              {editingGuion === guion.id && (
                <div className="px-5 pb-5 space-y-3 animate-in fade-in duration-200 border-t border-white/5 pt-4">
                  <textarea
                    value={guionTexts[guion.id]}
                    onChange={e => setGuionTexts(prev => ({ ...prev, [guion.id]: e.target.value }))}
                    rows={20}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none scrollbar-hide"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setGuionTexts(prev => ({ ...prev, [guion.id]: guion.contenido }))}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Restaurar original
                    </button>
                    <button
                      onClick={() => setEditingGuion(null)}
                      className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="glass-panel p-5 rounded-xl border border-dashed border-white/10 text-center">
            <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300 font-medium mb-1">¿Querés personalizar un guión con IA?</p>
            <p className="text-xs text-gray-500">Copiá el guión que querés adaptar y pegalo en el Coach IA. Decile tu especialidad y te lo reescribe para tu nicho.</p>
          </div>
        </div>
      )}

      {/* Herramienta modal overlay fallback - not needed as we render inline */}
    </div>
  );
}
